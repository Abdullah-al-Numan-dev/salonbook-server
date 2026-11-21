import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import { updateMyProfile } from "../controllers/me.controller.js";

const router = Router();

router.get("/", verifyToken, (req, res) => {
  res.json({ success: true, user: req.user });
});

router.put("/", verifyToken, updateMyProfile);

export default router;