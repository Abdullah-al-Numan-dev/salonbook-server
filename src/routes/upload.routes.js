import { Router } from "express";
import { verifyToken } from "../middleware/auth.js";
import { imageUpload } from "../middleware/upload.js";
import { uploadImage } from "../controllers/upload.controller.js";

const router = Router();

router.post("/image", verifyToken, imageUpload, uploadImage);

export default router;