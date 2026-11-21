import { getDB } from "../config/db.js";

// Turns [{_id:"pending",count:2}, ...] into {pending:2, confirmed:0, cancelled:0, total:2}
function toStatusCounts(groups) {
  const counts = { total: 0, pending: 0, confirmed: 0, cancelled: 0 };
  for (const g of groups) {
    if (g._id in counts) counts[g._id] = g.count;
    counts.total += g.count;
  }
  return counts;
}

// GET /api/dashboard/admin
export async function adminDashboard(req, res, next) {
  try {
    const db = getDB();

    const [totalCustomers, totalActiveServices, appointmentGroups, successfulPayments, revenue] =
      await Promise.all([
        db.collection("users").countDocuments({ role: "customer" }),
        db.collection("services").countDocuments({ status: "active" }),
        db
          .collection("appointments")
          .aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }])
          .toArray(),
        db.collection("transactions").countDocuments({ status: "paid" }),
        db
          .collection("transactions")
          .aggregate([
            { $match: { status: "paid" } },
            { $group: { _id: "$currency", total: { $sum: "$amount" } } },
            { $project: { _id: 0, currency: "$_id", total: 1 } },
          ])
          .toArray(),
      ]);

    const appointments = toStatusCounts(appointmentGroups);

    res.json({
      success: true,
      data: {
        totalCustomers,
        totalActiveServices,
        totalAppointments: appointments.total,
        pendingAppointments: appointments.pending,
        confirmedAppointments: appointments.confirmed,
        cancelledAppointments: appointments.cancelled,
        totalSuccessfulPayments: successfulPayments,
        revenue,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/dashboard/customer
export async function customerDashboard(req, res, next) {
  try {
    const db = getDB();
    const customerId = req.user._id;

    const [appointmentGroups, paidAppointments] = await Promise.all([
      db
        .collection("appointments")
        .aggregate([
          { $match: { customerId } },
          { $group: { _id: "$status", count: { $sum: 1 } } },
        ])
        .toArray(),
      db.collection("appointments").countDocuments({ customerId, paymentStatus: "paid" }),
    ]);

    const appointments = toStatusCounts(appointmentGroups);

    res.json({
      success: true,
      data: {
        totalAppointments: appointments.total,
        pendingAppointments: appointments.pending,
        confirmedAppointments: appointments.confirmed,
        cancelledAppointments: appointments.cancelled,
        paidAppointments,
      },
    });
  } catch (err) {
    next(err);
  }
}