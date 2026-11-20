import { Router } from "express";
import { verifyToken, requireCustomer } from "../middleware/auth.js";
import {
  getSlots,
  createAppointment,
  listMyAppointments,
  getMyAppointment,
  cancelMyAppointment,
} from "../controllers/appointments.controller.js";

const router = Router();

router.use(verifyToken, requireCustomer);

router.get("/slots", getSlots);
router.get("/my", listMyAppointments);
router.post("/", createAppointment);
router.get("/:id", getMyAppointment);
router.patch("/:id/cancel", cancelMyAppointment);

export default router;