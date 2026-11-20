import express from "express";
import cors from "cors";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import meRoutes from "./routes/me.routes.js";
import serviceRoutes from "./routes/services.routes.js";
import adminServiceRoutes from "./routes/adminServices.routes.js";
import { verifyToken, requireAdmin } from "./middleware/auth.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// NOTE: Stripe webhook route (needs raw body) will be mounted
// here BEFORE express.json() in a later step.

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ success: true, message: "SalonBook API is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok", time: new Date().toISOString() });
});

app.use("/api/admin/services", verifyToken, requireAdmin, adminServiceRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/me", meRoutes);
app.use(notFound);
app.use(errorHandler);

export default app;