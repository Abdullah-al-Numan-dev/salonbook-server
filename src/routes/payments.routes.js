import { Router } from "express";
import { verifyToken, requireCustomer } from "../middleware/auth.js";
import { createCheckoutSession } from "../controllers/payments.controller.js";

const router = Router();

router.post("/checkout-session", verifyToken, requireCustomer, createCheckoutSession);

export default router;