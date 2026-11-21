import { Router } from "express";
import { verifyToken, requireAdmin, requireCustomer } from "../middleware/auth.js";
import { adminDashboard, customerDashboard } from "../controllers/dashboard.controller.js";

const router = Router();

router.use(verifyToken);

router.get("/admin", requireAdmin, adminDashboard);
router.get("/customer", requireCustomer, customerDashboard);

export default router;