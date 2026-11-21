import "dotenv/config";
import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

// Vercel entry point. The DB connection is cached between requests.
export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error("DB connection failed:", err.message);
    return res.status(500).json({ success: false, message: "Database connection failed" });
  }
  return app(req, res);
}