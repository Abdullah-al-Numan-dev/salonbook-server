import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";
import { escapeRegex } from "../utils/escapeRegex.js";
import { CATEGORIES, SERVICE_STATUSES } from "../constants/categories.js";

const services = () => getDB().collection("services");

function parseId(id) {
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid service ID");
  return new ObjectId(id);
}

const has = (v) => v !== undefined && v !== null && v !== "";

// Validates input. On create every field is required; on update only the fields sent.
function validateService(body = {}, { isCreate }) {
  const errors = [];
  const data = {};

  if (isCreate || has(body.serviceName)) {
    const name = String(body.serviceName || "").trim();
    if (name.length < 2) errors.push("Service name must be at least 2 characters");
    else data.serviceName = name;
  }

  if (isCreate || has(body.category)) {
    if (!CATEGORIES.includes(body.category)) errors.push("Invalid service category");
    else data.category = body.category;
  }

  if (isCreate || has(body.description)) {
    const desc = String(body.description || "").trim();
    if (desc.length < 10) errors.push("Description must be at least 10 characters");
    else data.description = desc;
  }

  if (isCreate || has(body.price)) {
    const price = Number(body.price);
    if (!Number.isFinite(price) || price <= 0) errors.push("Price must be a positive number");
    else data.price = Math.round(price * 100) / 100;
  }

  if (isCreate || has(body.duration)) {
    const duration = Number(body.duration);
    if (!Number.isInteger(duration) || duration <= 0)
      errors.push("Duration must be a positive whole number of minutes");
    else data.duration = duration;
  }

  if (isCreate || has(body.image)) {
    const image = String(body.image || "").trim();
    if (!/^https?:\/\//i.test(image)) errors.push("A valid service image is required");
    else data.image = image;
  }

  if (has(body.status)) {
    if (!SERVICE_STATUSES.includes(body.status)) errors.push("Status must be active or inactive");
    else data.status = body.status;
  } else if (isCreate) {
    data.status = "active";
  }

  if (errors.length) throw new HttpError(400, errors.join(". "));
  return data;
}

// GET /api/admin/services
export async function adminListServices(req, res, next) {
  try {
    const { search, status } = req.query;
    const filter = {};
    if (search && search.trim()) {
      filter.serviceName = { $regex: escapeRegex(search.trim()), $options: "i" };
    }
    if (SERVICE_STATUSES.includes(status)) filter.status = status;

    const data = await services().find(filter).sort({ createdAt: -1 }).toArray();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// POST /api/admin/services
export async function createService(req, res, next) {
  try {
    const data = validateService(req.body, { isCreate: true });
    const doc = { ...data, createdAt: new Date() };
    const result = await services().insertOne(doc);

    res.status(201).json({
      success: true,
      message: "Service created successfully",
      data: { _id: result.insertedId, ...doc },
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/admin/services/:id
export async function updateService(req, res, next) {
  try {
    const _id = parseId(req.params.id);
    const data = validateService(req.body, { isCreate: false });

    if (Object.keys(data).length === 0) {
      throw new HttpError(400, "No valid fields to update");
    }

    const updated = await services().findOneAndUpdate(
      { _id },
      { $set: { ...data, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!updated) throw new HttpError(404, "Service not found");

    res.json({ success: true, message: "Service updated successfully", data: updated });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/admin/services/:id/status
export async function setServiceStatus(req, res, next) {
  try {
    const _id = parseId(req.params.id);
    const { status } = req.body || {};
    if (!SERVICE_STATUSES.includes(status)) {
      throw new HttpError(400, "Status must be active or inactive");
    }

    const updated = await services().findOneAndUpdate(
      { _id },
      { $set: { status, updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!updated) throw new HttpError(404, "Service not found");

    res.json({
      success: true,
      message: `Service ${status === "active" ? "activated" : "deactivated"}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/admin/services/:id
export async function deleteService(req, res, next) {
  try {
    const _id = parseId(req.params.id);

    // Block deletion while customers still have live appointments for this service
    const activeAppointments = await getDB()
      .collection("appointments")
      .countDocuments({ serviceId: _id, status: { $in: ["pending", "confirmed"] } });

    if (activeAppointments > 0) {
      throw new HttpError(
        409,
        "This service has pending or confirmed appointments. Deactivate it instead."
      );
    }

    const result = await services().deleteOne({ _id });
    if (result.deletedCount === 0) throw new HttpError(404, "Service not found");

    res.json({ success: true, message: "Service deleted successfully" });
  } catch (err) {
    next(err);
  }
}