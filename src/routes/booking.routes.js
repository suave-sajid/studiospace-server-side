
import { Router } from "express";

import {
  createBooking,
  getMyBookings,
  getReceivedBookings,
  updateBookingStatus,
} from "../controllers/booking.controller.js";

import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

router.post("/", verifyToken, createBooking);

router.get("/my", verifyToken, getMyBookings);

router.get("/received", verifyToken, getReceivedBookings);

router.patch("/:id/status", verifyToken, updateBookingStatus);

export default router;
