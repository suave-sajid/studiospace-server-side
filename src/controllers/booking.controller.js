
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { COLLECTIONS } from "../config/collections.js";
import { bookingSchema } from "../services/booking.validation.js";

export async function createBooking(req, res) {
  try {
    // 1. Validate request body
    const validation = bookingSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking information.",
        errors: validation.error.flatten(),
      });
    }

    const { studioId, startAt, endAt } = validation.data;

    // 2. Validate MongoDB ObjectId
    if (!ObjectId.isValid(studioId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const db = getDB();
    const studioObjectId = new ObjectId(studioId);

    const requestedStart = new Date(startAt);
    const requestedEnd = new Date(endAt);

    // 3. Calculate booking duration
    const durationMs =
      requestedEnd.getTime() - requestedStart.getTime();

    const totalHours = durationMs / (1000 * 60 * 60);

    // MVP: bookings must use whole-hour durations
    if (!Number.isInteger(totalHours) || totalHours < 1) {
      return res.status(400).json({
        success: false,
        message: "Booking duration must be at least one whole hour.",
      });
    }

    // 4. Find active studio
    const studio = await db
      .collection(COLLECTIONS.STUDIOS)
      .findOne({
        _id: studioObjectId,
        status: "active",
      });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found or unavailable.",
      });
    }

    // 5. Prevent booking your own studio
    if (studio.ownerId === req.user.id) {
      return res.status(403).json({
        success: false,
        message: "You cannot book your own studio.",
      });
    }

    // 6. Check overlapping bookings
    const conflictingBooking = await db
      .collection(COLLECTIONS.BOOKINGS)
      .findOne({
        studioId: studioObjectId,
        status: { $in: ["Pending", "Confirmed"] },
        startAt: { $lt: requestedEnd },
        endAt: { $gt: requestedStart },
      });

    if (conflictingBooking) {
      return res.status(409).json({
        success: false,
        message: "This studio is already booked for the selected time.",
      });
    }

    // 7. Calculate price from trusted studio data
    const hourlyRate = Number(studio.hourlyRate);
    const securityDeposit = Number(studio.securityDeposit);

    const totalAmount =
      hourlyRate * totalHours + securityDeposit;

    // 8. Prepare booking document
    const now = new Date();

    const booking = {
      studioId: studioObjectId,
      creatorId: req.user.id,
      hostId: studio.ownerId,

      startAt: requestedStart,
      endAt: requestedEnd,

      hourlyRate,
      securityDeposit,
      totalHours,
      totalAmount,

      status: "Pending",

      createdAt: now,
      updatedAt: now,
    };

    // 9. Save booking
    const result = await db
      .collection(COLLECTIONS.BOOKINGS)
      .insertOne(booking);

    return res.status(201).json({
      success: true,
      message: "Booking request created successfully.",
      data: {
        ...booking,
        _id: result.insertedId,
      },
    });
  } catch (error) {
    console.error("Create booking error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create booking.",
    });
  }
}
