import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { isValidDateString } from "../utils/dates.js";

const appointments = () => getDB().collection("appointments");
const STATUSES = ["pending", "confirmed", "cancelled"];
const PAYMENT_STATUSES = ["unpaid", "paid"];

function parseId(id) {
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid appointment ID");
  return new ObjectId(id);
}

// Joins service and customer info (only safe customer fields are exposed)
const withDetails = [
  {
    $lookup: { from: "services", localField: "serviceId", foreignField: "_id", as: "service" },
  },
  { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
  {
    $lookup: { from: "users", localField: "customerId", foreignField: "_id", as: "customer" },
  },
  { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      service: {
        _id: "$service._id",
        serviceName: "$service.serviceName",
        category: "$service.category",
        image: "$service.image",
        duration: "$service.duration",
      },
      customer: {
        _id: "$customer._id",
        name: "$customer.name",
        email: "$customer.email",
        image: "$customer.image",
        phone: "$customer.phone",
      },
    },
  },
];

async function getDetailed(_id) {
  const [data] = await appointments()
    .aggregate([{ $match: { _id } }, ...withDetails])
    .toArray();
  return data;
}

// GET /api/admin/appointments?status=&paymentStatus=&date=&search=
export async function adminListAppointments(req, res, next) {
  try {
    const { status, paymentStatus, date, search } = req.query;

    const match = {};
    if (STATUSES.includes(status)) match.status = status;
    if (PAYMENT_STATUSES.includes(paymentStatus)) match.paymentStatus = paymentStatus;
    if (date) {
      if (!isValidDateString(date)) throw new HttpError(400, "Date must be YYYY-MM-DD");
      match.appointmentDate = date;
    }

    const pipeline = [{ $match: match }, { $sort: { createdAt: -1 } }, ...withDetails];

    if (search && search.trim()) {
      const rx = { $regex: escapeRegex(search.trim()), $options: "i" };
      pipeline.push({
        $match: {
          $or: [{ "customer.name": rx }, { "customer.email": rx }, { "service.serviceName": rx }],
        },
      });
    }

    const data = await appointments().aggregate(pipeline).toArray();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/appointments/:id
export async function adminGetAppointment(req, res, next) {
  try {
    const data = await getDetailed(parseId(req.params.id));
    if (!data) throw new HttpError(404, "Appointment not found");
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/appointments/:id/confirm
export async function confirmAppointment(req, res, next) {
  try {
    const _id = parseId(req.params.id);

    // Atomic: only a pending appointment can be confirmed
    const updated = await appointments().findOneAndUpdate(
      { _id, status: "pending" },
      { $set: { status: "confirmed", confirmedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!updated) {
      const exists = await appointments().findOne({ _id }, { projection: { _id: 1 } });
      if (!exists) throw new HttpError(404, "Appointment not found");
      throw new HttpError(409, "Only pending appointments can be confirmed");
    }

    res.json({
      success: true,
      message: "Appointment confirmed",
      data: await getDetailed(_id),
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/appointments/:id/cancel
export async function adminCancelAppointment(req, res, next) {
  try {
    const _id = parseId(req.params.id);

    // Atomic: pending or confirmed only, and never a paid one
    const updated = await appointments().findOneAndUpdate(
      { _id, status: { $in: ["pending", "confirmed"] }, paymentStatus: "unpaid" },
      { $set: { status: "cancelled", cancelledAt: new Date(), cancelledBy: "admin" } },
      { returnDocument: "after" }
    );

    if (!updated) {
      const exists = await appointments().findOne({ _id });
      if (!exists) throw new HttpError(404, "Appointment not found");
      if (exists.paymentStatus === "paid") {
        throw new HttpError(409, "This appointment is already paid and needs a manual refund first");
      }
      throw new HttpError(409, "This appointment is already cancelled");
    }

    res.json({
      success: true,
      message: "Appointment cancelled",
      data: await getDetailed(_id),
    });
  } catch (err) {
    next(err);
  }
}