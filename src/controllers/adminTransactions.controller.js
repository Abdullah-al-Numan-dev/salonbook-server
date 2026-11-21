import { getDB } from "../config/db.js";
import { escapeRegex } from "../utils/escapeRegex.js";

// GET /api/admin/transactions?status=&search=
export async function listTransactions(req, res, next) {
  try {
    const { status, search } = req.query;
    const match = {};
    if (["paid", "failed"].includes(status)) match.status = status;

    const pipeline = [
      { $match: match },
      { $sort: { createdAt: -1 } },
      { $lookup: { from: "appointments", localField: "appointmentId", foreignField: "_id", as: "appointment" } },
      { $unwind: { path: "$appointment", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "services", localField: "appointment.serviceId", foreignField: "_id", as: "service" } },
      { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
      { $lookup: { from: "users", localField: "customerId", foreignField: "_id", as: "customer" } },
      { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          amount: 1,
          currency: 1,
          stripeSessionId: 1,
          status: 1,
          createdAt: 1,
          appointmentDate: "$appointment.appointmentDate",
          timeSlot: "$appointment.timeSlot",
          serviceName: "$service.serviceName",
          customer: { name: "$customer.name", email: "$customer.email", image: "$customer.image" },
        },
      },
    ];

    if (search && search.trim()) {
      const rx = { $regex: escapeRegex(search.trim()), $options: "i" };
      pipeline.push({
        $match: { $or: [{ "customer.name": rx }, { "customer.email": rx }, { serviceName: rx }] },
      });
    }

    const data = await getDB().collection("transactions").aggregate(pipeline).toArray();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}