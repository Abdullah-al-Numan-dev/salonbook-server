import { getDB } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";

// PUT /api/me
// Whitelist: only name, image and phone can change.
// role, isBlocked, email and the id are never read from the body.
export async function updateMyProfile(req, res, next) {
  try {
    const body = req.body || {};
    const update = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2 || name.length > 60) {
        throw new HttpError(400, "Name must be between 2 and 60 characters");
      }
      update.name = name;
    }

    if (body.image !== undefined) {
      const image = String(body.image).trim();
      if (image && !/^https?:\/\//i.test(image)) {
        throw new HttpError(400, "Profile image must be a valid URL");
      }
      update.image = image || null;
    }

    if (body.phone !== undefined) {
      const phone = String(body.phone).trim();
      if (phone && !/^\+?[0-9\s-]{7,15}$/.test(phone)) {
        throw new HttpError(400, "Enter a valid phone number");
      }
      update.phone = phone;
    }

    if (Object.keys(update).length === 0) {
      throw new HttpError(400, "No valid fields to update");
    }

    // Always the logged-in user's own record, never an id from the request
    const updated = await getDB()
      .collection("users")
      .findOneAndUpdate(
        { _id: req.user._id },
        { $set: { ...update, updatedAt: new Date() } },
        {
          returnDocument: "after",
          projection: { name: 1, email: 1, image: 1, phone: 1, role: 1 },
        }
      );

    if (!updated) throw new HttpError(404, "User not found");

    res.json({ success: true, message: "Profile updated successfully", user: updated });
  } catch (err) {
    next(err);
  }
}