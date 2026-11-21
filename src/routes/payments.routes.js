import { Router } from "express";
import { verifyToken, requireCustomer } from "../middleware/auth.js";
import {
  createCheckoutSession,
  getPaymentBySession,
  listMyPayments,
} from "../controllers/payments.controller.js";

const router = Router();

router.use(verifyToken, requireCustomer);

router.post("/checkout-session", createCheckoutSession);
router.get("/my", listMyPayments);
router.get("/session/:sessionId", getPaymentBySession);

export default router;