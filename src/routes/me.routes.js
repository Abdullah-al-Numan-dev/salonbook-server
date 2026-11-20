import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";

const router = Router();

router.get("/", verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

export default router;