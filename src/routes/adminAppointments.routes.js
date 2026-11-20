import { Router } from "express";
import {
  adminListAppointments,
  adminGetAppointment,
  confirmAppointment,
  adminCancelAppointment,
} from "../controllers/adminAppointments.controller.js";

const router = Router();

router.get("/", adminListAppointments);
router.get("/:id", adminGetAppointment);
router.patch("/:id/confirm", confirmAppointment);
router.patch("/:id/cancel", adminCancelAppointment);

export default router;