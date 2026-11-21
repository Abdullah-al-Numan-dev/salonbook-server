import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { getStripe } from "../config/stripe.js";
import { HttpError } from "../utils/httpError.js";

// POST /api/payments/checkout-session
export async function createCheckoutSession(req, res, next) {
  try {
    const { appointmentId } = req.body || {};
    if (!ObjectId.isValid(appointmentId)) {
      throw new HttpError(400, "Invalid appointment ID");
    }

    // Must be MY appointment (another customer's looks like "not found")
    const appointment = await getDB()
      .collection("appointments")
      .findOne({ _id: new ObjectId(appointmentId), customerId: req.user._id });

    if (!appointment) throw new HttpError(404, "Appointment not found");
    if (appointment.status === "cancelled") {
      throw new HttpError(400, "Cancelled appointments cannot be paid");
    }
    if (appointment.status !== "confirmed") {
      throw new HttpError(400, "You can pay only after the salon confirms your appointment");
    }
    if (appointment.paymentStatus === "paid") {
      throw new HttpError(409, "This appointment is already paid");
    }

    const service = await getDB()
      .collection("services")
      .findOne({ _id: appointment.serviceId });

    // Amount comes from the price saved on the appointment, never from the client
    const amount = Math.round(appointment.servicePrice * 100); // smallest unit
    if (!Number.isInteger(amount) || amount <= 0) {
      throw new HttpError(400, "Invalid payment amount");
    }

    const currency = (process.env.PAYMENT_CURRENCY || "usd").toLowerCase();
    const clientUrl = process.env.CLIENT_URL;

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      customer_email: req.user.email,
      client_reference_id: appointment._id.toString(),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency,
            unit_amount: amount,
            product_data: {
              name: service?.serviceName || "Salon appointment",
              description: `${appointment.appointmentDate} at ${appointment.timeSlot}`,
            },
          },
        },
      ],
      // The webhook reads these to know which appointment was paid
      metadata: {
        appointmentId: appointment._id.toString(),
        customerId: req.user.id,
      },
      payment_intent_data: {
        metadata: {
          appointmentId: appointment._id.toString(),
          customerId: req.user.id,
        },
      },
      success_url: `${clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${clientUrl}/payment/cancel?appointmentId=${appointment._id}`,
    });

    res.status(201).json({
      success: true,
      data: { url: session.url, sessionId: session.id },
    });
  } catch (err) {
    // Stripe errors should not leak details to the browser
    if (err?.type && String(err.type).startsWith("Stripe")) {
      console.error("Stripe error:", err.message);
      return next(new HttpError(502, "Payment service error. Please try again"));
    }
    next(err);
  }
}