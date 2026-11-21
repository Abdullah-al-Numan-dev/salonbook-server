import { Router } from "express";
import {
  listUsers,
  getUser,
  blockUser,
  unblockUser,
} from "../controllers/adminUsers.controller.js";

const router = Router();

router.get("/", listUsers);
router.get("/:id", getUser);
router.patch("/:id/block", blockUser);
router.patch("/:id/unblock", unblockUser);

export default router;