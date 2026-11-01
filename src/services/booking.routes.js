
import { Router } from "express";
import { createBooking } from "../controllers/booking.controller.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

router.post("/", verifyToken, createBooking);

export default router;
