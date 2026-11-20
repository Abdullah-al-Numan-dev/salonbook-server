import multer from "multer";
import { HttpError } from "../utils/httpError.js";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      return cb(new HttpError(400, "Only JPG, PNG, WEBP or GIF images are allowed"));
    }
    cb(null, true);
  },
}).single("image");