import { Router } from "express";
import {
  listServices,
  listCategories,
  getService,
} from "../controllers/services.controller.js";

const router = Router();

router.get("/", listServices);
router.get("/categories", listCategories);
router.get("/:id", getService);

export default router;