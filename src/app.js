import express from "express";
import cors from "cors";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { verifyToken, requireAdmin } from "./middleware/auth.js";
import meRoutes from "./routes/me.routes.js";
import serviceRoutes from "./routes/services.routes.js";
import adminServiceRoutes from "./routes/adminServices.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import appointmentRoutes from "./routes/appointments.routes.js";
import adminAppointmentRoutes from "./routes/adminAppointments.routes.js";
import adminUserRoutes from "./routes/adminUsers.routes.js";
import paymentRoutes from "./routes/payments.routes.js";
import adminTransactionRoutes from "./routes/adminTransactions.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import { stripeWebhook } from "./controllers/webhooks.controller.js";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

// Stripe webhook: raw body, must come BEFORE express.json()
app.post(
  "/api/webhooks/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

app.use(express.json());

app.get("/", (req, res) => {
  res.json({ success: true, message: "SalonBook API is running" });
});

app.get("/api/health", (req, res) => {
  res.json({ success: true, status: "ok", time: new Date().toISOString() });
});

app.use("/api/me", meRoutes);
app.use("/api/services", serviceRoutes);
app.use("/api/appointments", appointmentRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use("/api/admin/services", verifyToken, requireAdmin, adminServiceRoutes);
app.use("/api/admin/appointments", verifyToken, requireAdmin, adminAppointmentRoutes);
app.use("/api/admin/users", verifyToken, requireAdmin, adminUserRoutes);
app.use("/api/admin/transactions", verifyToken, requireAdmin, adminTransactionRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;