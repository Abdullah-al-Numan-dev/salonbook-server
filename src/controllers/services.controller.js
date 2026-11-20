import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { HttpError } from "../utils/httpError.js";
import { escapeRegex } from "../utils/escapeRegex.js";

const services = () => getDB().collection("services");

// GET /api/services?search=&category=&sort=&page=&limit=
export async function listServices(req, res, next) {
  try {
    const { search, category, sort } = req.query;
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 9, 1), 50);

    const filter = { status: "active" };

    if (search && search.trim()) {
      filter.serviceName = { $regex: escapeRegex(search.trim()), $options: "i" };
    }
    if (category && category.trim() && category !== "all") {
      filter.category = category.trim();
    }

    let sortStage = { createdAt: -1 };
    if (sort === "price_asc") sortStage = { price: 1, _id: 1 };
    if (sort === "price_desc") sortStage = { price: -1, _id: 1 };

    const [items, total] = await Promise.all([
      services()
        .find(filter)
        .sort(sortStage)
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray(),
      services().countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/services/categories
export async function listCategories(req, res, next) {
  try {
    const data = await services()
      .aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
        { $project: { _id: 0, category: "$_id", count: 1 } },
        { $sort: { category: 1 } },
      ])
      .toArray();

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// GET /api/services/:id
export async function getService(req, res, next) {
  try {
    const { id } = req.params;
    if (!ObjectId.isValid(id)) {
      throw new HttpError(400, "Invalid service ID");
    }

    const service = await services().findOne({ _id: new ObjectId(id) });
    if (!service) throw new HttpError(404, "Service not found");
    if (service.status !== "active") {
      throw new HttpError(404, "This service is currently unavailable");
    }

    res.json({ success: true, data: service });
  } catch (err) {
    next(err);
  }
}