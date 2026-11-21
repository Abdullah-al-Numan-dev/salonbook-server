import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";
import { escapeRegex } from "../utils/escapeRegex.js";

const users = () => getDB().collection("users");

// Only these fields ever leave the server
const SAFE_FIELDS = {
  name: 1,
  email: 1,
  image: 1,
  phone: 1,
  role: 1,
  isBlocked: 1,
  emailVerified: 1,
  createdAt: 1,
};

function parseId(id) {
  if (!ObjectId.isValid(id)) throw new HttpError(400, "Invalid user ID");
  return new ObjectId(id);
}

// GET /api/admin/users?search=&blocked=true|false
export async function listUsers(req, res, next) {
  try {
    const { search, blocked } = req.query;
    const filter = { role: "customer" };

    if (search && search.trim()) {
      const rx = { $regex: escapeRegex(search.trim()), $options: "i" };
      filter.$or = [{ name: rx }, { email: rx }];
    }
    if (blocked === "true") filter.isBlocked = true;
    if (blocked === "false") filter.isBlocked = { $ne: true };

    const data = await users()
      .find(filter, { projection: SAFE_FIELDS })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/users/:id
export async function getUser(req, res, next) {
  try {
    const _id = parseId(req.params.id);
    const user = await users().findOne({ _id }, { projection: SAFE_FIELDS });
    if (!user) throw new HttpError(404, "User not found");

    const grouped = await getDB()
      .collection("appointments")
      .aggregate([
        { $match: { customerId: _id } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray();

    const stats = { total: 0, pending: 0, confirmed: 0, cancelled: 0 };
    for (const g of grouped) {
      stats[g._id] = g.count;
      stats.total += g.count;
    }

    res.json({ success: true, data: { ...user, appointmentStats: stats } });
  } catch (err) {
    next(err);
  }
}

function setBlocked(blocked) {
  return async (req, res, next) => {
    try {
      const _id = parseId(req.params.id);

      // Only customers can be blocked, never admins
      const updated = await users().findOneAndUpdate(
        { _id, role: "customer" },
        { $set: { isBlocked: blocked, updatedAt: new Date() } },
        { returnDocument: "after", projection: SAFE_FIELDS }
      );

      if (!updated) {
        const exists = await users().findOne({ _id }, { projection: { role: 1 } });
        if (!exists) throw new HttpError(404, "User not found");
        throw new HttpError(400, "Admin accounts cannot be blocked or unblocked");
      }

      res.json({
        success: true,
        message: blocked ? "User blocked" : "User unblocked",
        data: updated,
      });
    } catch (err) {
      next(err);
    }
  };
}

export const blockUser = setBlocked(true);
export const unblockUser = setBlocked(false);