import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { getStripe } from "../config/stripe.js";

// Saves the transaction and (only if paid) marks the appointment as paid.
// Safe to run more than once for the same session.
async function recordPayment(session, status) {
  const appointmentId = session.metadata?.appointmentId;
  if (!ObjectId.isValid(appointmentId)) {
    console.warn("Webhook ignored: no valid appointmentId in metadata", session.id);
    return;
  }

  const db = getDB();
  const appointment = await db
    .collection("appointments")
    .findOne({ _id: new ObjectId(appointmentId) });

  if (!appointment) {
    console.warn("Webhook ignored: appointment not found", appointmentId);
    return;
  }

  // The paid amount must match the price saved on the appointment
  const expected = Math.round(appointment.servicePrice * 100);
  if (session.amount_total !== expected) {
    console.error("Webhook ignored: amount mismatch", session.id);
    return;
  }

  const base = {
    appointmentId: appointment._id,
    customerId: appointment.customerId,
    amount: session.amount_total / 100,
    currency: session.currency,
    stripeSessionId: session.id,
    createdAt: new Date(),
  };

  if (status === "paid") {
    // Paid always wins, even if a failed record exists for this session
    await db.collection("transactions").updateOne(
      { stripeSessionId: session.id },
      { $set: { status: "paid" }, $setOnInsert: base },
      { upsert: true }
    );
    await db.collection("appointments").updateOne(
      { _id: appointment._id, paymentStatus: "unpaid" },
      { $set: { paymentStatus: "paid", paidAt: new Date() } }
    );
  } else {
    // Failed: insert only if nothing exists yet, never overwrite a paid record
    await db.collection("transactions").updateOne(
      { stripeSessionId: session.id },
      { $setOnInsert: { ...base, status: "failed" } },
      { upsert: true }
    );
  }
}

// POST /api/webhooks/stripe  (body is the RAW request body)
export async function stripeWebhook(req, res) {
  const signature = req.headers["stripe-signature"];
  let event;

  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).json({ success: false, message: "Invalid webhook signature" });
  }

  try {
    const session = event.data.object;

    switch (event.type) {
      case "checkout.session.completed":
        if (session.payment_status === "paid") await recordPayment(session, "paid");
        break;
      case "checkout.session.async_payment_succeeded":
        await recordPayment(session, "paid");
        break;
      case "checkout.session.async_payment_failed":
        await recordPayment(session, "failed");
        break;
      default:
        break; // other events are not needed
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    // 500 makes Stripe retry later
    res.status(500).json({ success: false, message: "Webhook processing failed" });
  }
}