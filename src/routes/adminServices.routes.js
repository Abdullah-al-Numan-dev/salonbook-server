import { Router } from "express";
import {
  adminListServices,
  createService,
  updateService,
  setServiceStatus,
  deleteService,
} from "../controllers/adminServices.controller.js";

const router = Router();

router.get("/", adminListServices);
router.post("/", createService);
router.put("/:id", updateService);
router.patch("/:id/status", setServiceStatus);
router.delete("/:id", deleteService);

export default router;