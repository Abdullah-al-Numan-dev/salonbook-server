import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";
import { TIME_SLOTS, MAX_BOOKING_DAYS_AHEAD } from "../constants/timeSlots.js";
import { salonToday, addDays, isValidDateString } from "../utils/dates.js";

const appointments = () => getDB().collection("appointments");
const ACTIVE = ["pending", "confirmed"];
const STATUSES = ["pending", "confirmed", "cancelled"];

function parseId(id, label) {
  if (!ObjectId.isValid(id)) throw new HttpError(400, `Invalid ${label} ID`);
  return new ObjectId(id);
}

function validateDate(date) {
  if (!isValidDateString(date)) {
    throw new HttpError(400, "Appointment date must be a valid date (YYYY-MM-DD)");
  }
  const today = salonToday();
  if (date < today) throw new HttpError(400, "Appointment date cannot be in the past");
  if (date > addDays(today, MAX_BOOKING_DAYS_AHEAD)) {
    throw new HttpError(400, `Appointments can be booked up to ${MAX_BOOKING_DAYS_AHEAD} days ahead`);
  }
}

// Joins service info onto each appointment
const withService = [
  {
    $lookup: {
      from: "services",
      localField: "serviceId",
      foreignField: "_id",
      as: "service",
    },
  },
  { $unwind: { path: "$service", preserveNullAndEmptyArrays: true } },
  {
    $addFields: {
      service: {
        serviceName: "$service.serviceName",
        category: "$service.category",
        image: "$service.image",
        duration: "$service.duration",
      },
    },
  },
];

// GET /api/appointments/slots?date=YYYY-MM-DD
export async function getSlots(req, res, next) {
  try {
    const { date } = req.query;
    validateDate(date);

    const booked = await appointments()
      .find({ appointmentDate: date, status: { $in: ACTIVE } })
      .project({ timeSlot: 1 })
      .toArray();
    const bookedSet = new Set(booked.map((a) => a.timeSlot));

    res.json({
      success: true,
      data: {
        date,
        slots: TIME_SLOTS.map((time) => ({ time, available: !bookedSet.has(time) })),
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/appointments
export async function createAppointment(req, res, next) {
  try {
    const { serviceId, appointmentDate, timeSlot } = req.body || {};
    const message = String(req.body?.message || "").trim();

    const _serviceId = parseId(serviceId, "service");
    validateDate(appointmentDate);
    if (!TIME_SLOTS.includes(timeSlot)) throw new HttpError(400, "Please choose a valid time slot");
    if (message.length > 500) throw new HttpError(400, "Message must be 500 characters or fewer");

    const service = await getDB().collection("services").findOne({ _id: _serviceId });
    if (!service) throw new HttpError(404, "Service not found");
    if (service.status !== "active") {
      throw new HttpError(400, "This service is currently unavailable for booking");
    }

    const conflict = await appointments().findOne({
      appointmentDate,
      timeSlot,
      status: { $in: ACTIVE },
    });
    if (conflict) {
      throw new HttpError(409, "This time slot is already booked. Please choose another one");
    }

    const doc = {
      serviceId: service._id,
      customerId: req.user._id,
      appointmentDate,
      timeSlot,
      message,
      servicePrice: service.price, // price snapshot at booking time
      paymentStatus: "unpaid",
      status: "pending",
      createdAt: new Date(),
    };

    let result;
    try {
      result = await appointments().insertOne(doc);
    } catch (err) {
      // Unique index caught a simultaneous booking
      if (err.code === 11000) {
        throw new HttpError(409, "This time slot is already booked. Please choose another one");
      }
      throw err;
    }

    res.status(201).json({
      success: true,
      message: "Appointment request submitted. Please wait for confirmation",
      data: { _id: result.insertedId, ...doc },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/appointments/my?status=
export async function listMyAppointments(req, res, next) {
  try {
    const match = { customerId: req.user._id };
    if (STATUSES.includes(req.query.status)) match.status = req.query.status;

    const data = await appointments()
      .aggregate([{ $match: match }, { $sort: { createdAt: -1 } }, ...withService])
      .toArray();

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/appointments/:id
export async function getMyAppointment(req, res, next) {
  try {
    const _id = parseId(req.params.id, "appointment");
    const [data] = await appointments()
      .aggregate([{ $match: { _id, customerId: req.user._id } }, ...withService])
      .toArray();

    // Someone else's appointment looks the same as a missing one
    if (!data) throw new HttpError(404, "Appointment not found");
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/appointments/:id/cancel
export async function cancelMyAppointment(req, res, next) {
  try {
    const _id = parseId(req.params.id, "appointment");

    // One atomic update: only my own, only if still pending
    const updated = await appointments().findOneAndUpdate(
      { _id, customerId: req.user._id, status: "pending" },
      { $set: { status: "cancelled", cancelledAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!updated) {
      const exists = await appointments().findOne({ _id, customerId: req.user._id });
      if (!exists) throw new HttpError(404, "Appointment not found");
      throw new HttpError(409, "Only pending appointments can be cancelled");
    }

    res.json({
      success: true,
      message: "Appointment cancelled successfully",
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}