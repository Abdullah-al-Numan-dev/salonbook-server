import { Router } from "express";
import { listTransactions } from "../controllers/adminTransactions.controller.js";

const router = Router();

router.get("/", listTransactions);

export default router;