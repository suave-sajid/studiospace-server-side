
import { ObjectId } from "mongodb";
import { client, getDB } from "../config/db.js";
import { COLLECTIONS } from "../config/collections.js";
import { bookingSchema } from "../services/booking.validation.js";

class BookingError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

export async function createBooking(req, res) {
  const validation = bookingSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking information.",
      errors: validation.error.flatten(),
    });
  }

  const { studioId, startAt, endAt } = validation.data;

  if (!ObjectId.isValid(studioId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid studio ID.",
    });
  }

  const requestedStart = new Date(startAt);
  const requestedEnd = new Date(endAt);

  const durationMs =
    requestedEnd.getTime() - requestedStart.getTime();

  const totalHours = durationMs / (1000 * 60 * 60);

  if (!Number.isInteger(totalHours) || totalHours < 1) {
    return res.status(400).json({
      success: false,
      message: "Booking duration must be at least one whole hour.",
    });
  }

  const db = getDB();
  const studioObjectId = new ObjectId(studioId);
  const session = client.startSession();

  try {
    const createdBooking = await session.withTransaction(
      async () => {
        // 1. Atomically write to the studio document.
        // Concurrent bookings for this studio will conflict here.
        const lockResult = await db
          .collection(COLLECTIONS.STUDIOS)
          .updateOne(
            {
              _id: studioObjectId,
              status: "active",
            },
            {
              $inc: { bookingVersion: 1 },
              $set: { updatedAt: new Date() },
            },
            { session }
          );

        if (lockResult.matchedCount === 0) {
          throw new BookingError(
            "Studio not found or unavailable.",
            404
          );
        }

        // 2. Read the studio inside this transaction
        const studio = await db
          .collection(COLLECTIONS.STUDIOS)
          .findOne(
            {
              _id: studioObjectId,
              status: "active",
            },
            { session }
          );

        if (!studio) {
          throw new BookingError(
            "Studio is no longer available.",
            404
          );
        }

        // 3. Prevent self-booking
        if (studio.ownerId === req.user.id) {
          throw new BookingError(
            "You cannot book your own studio.",
            403
          );
        }

        // 4. Check overlapping Pending or Confirmed bookings
        const conflictingBooking = await db
          .collection(COLLECTIONS.BOOKINGS)
          .findOne(
            {
              studioId: studioObjectId,
              status: { $in: ["Pending", "Confirmed"] },
              startAt: { $lt: requestedEnd },
              endAt: { $gt: requestedStart },
            },
            { session }
          );

        if (conflictingBooking) {
          throw new BookingError(
            "This studio is already booked for the selected time.",
            409
          );
        }

        // 5. Calculate price using trusted database values
        const hourlyRate = Number(studio.hourlyRate);
        const securityDeposit = Number(studio.securityDeposit);

        if (
          !Number.isFinite(hourlyRate) ||
          hourlyRate <= 0 ||
          !Number.isFinite(securityDeposit) ||
          securityDeposit < 0
        ) {
          throw new BookingError(
            "Studio pricing information is invalid.",
            500
          );
        }

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
          totalAmount:
            hourlyRate * totalHours + securityDeposit,

          status: "Pending",

          createdAt: now,
          updatedAt: now,
        };

        // 6. Insert within the same transaction
        const result = await db
          .collection(COLLECTIONS.BOOKINGS)
          .insertOne(booking, { session });

        return {
          ...booking,
          _id: result.insertedId,
        };
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
        readPreference: "primary",
      }
    );

    return res.status(201).json({
      success: true,
      message: "Booking request created successfully.",
      data: createdBooking,
    });
  } catch (error) {
    if (error instanceof BookingError) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message,
      });
    }

    console.error("Create booking transaction error:", error);

    return res.status(503).json({
      success: false,
      message:
        "Booking could not be completed right now. Please try again.",
    });
  } finally {
    await session.endSession();
  }
}


export async function getMyBookings(req, res) {
  try {
    const db = getDB();

    const bookings = await db
      .collection(COLLECTIONS.BOOKINGS)
      .aggregate([
        {
          $match: {
            creatorId: req.user.id,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $lookup: {
            from: COLLECTIONS.STUDIOS,
            localField: "studioId",
            foreignField: "_id",
            as: "studio",
          },
        },
        {
          $unwind: {
            path: "$studio",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            studioId: 1,
            creatorId: 1,
            hostId: 1,
            startAt: 1,
            endAt: 1,
            hourlyRate: 1,
            securityDeposit: 1,
            totalHours: 1,
            totalAmount: 1,
            status: 1,
            createdAt: 1,
            "studio.title": 1,
            "studio.image": 1,
            "studio.location": 1,
            "studio.category": 1,
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get my bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch your bookings.",
    });
  }
}

export async function getReceivedBookings(req, res) {
  try {
    const db = getDB();

    const bookings = await db
      .collection(COLLECTIONS.BOOKINGS)
      .aggregate([
        {
          $match: {
            hostId: req.user.id,
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $lookup: {
            from: COLLECTIONS.STUDIOS,
            localField: "studioId",
            foreignField: "_id",
            as: "studio",
          },
        },
        {
          $unwind: {
            path: "$studio",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            studioId: 1,
            creatorId: 1,
            hostId: 1,
            startAt: 1,
            endAt: 1,
            hourlyRate: 1,
            securityDeposit: 1,
            totalHours: 1,
            totalAmount: 1,
            status: 1,
            createdAt: 1,
            "studio.title": 1,
            "studio.image": 1,
            "studio.location": 1,
            "studio.category": 1,
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookings,
    });
  } catch (error) {
    console.error("Get received bookings error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch received bookings.",
    });
  }
}

export async function updateBookingStatus(req, res) {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const allowedActions = [
      "confirm",
      "reject",
      "cancel",
      "complete",
    ];

    if (!allowedActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking action.",
      });
    }

    const db = getDB();

    const bookingId = new ObjectId(id);

    const booking = await db
      .collection(COLLECTIONS.BOOKINGS)
      .findOne({ _id: bookingId });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found.",
      });
    }

    const userId = req.user.id;
    let newStatus = "";

    // Host actions
    if (action === "confirm" || action === "reject") {
      if (booking.hostId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Only the host can manage this booking.",
        });
      }

      if (booking.status !== "Pending") {
        return res.status(400).json({
          success: false,
          message: "Only pending bookings can be confirmed or rejected.",
        });
      }

      newStatus = action === "confirm" ? "Confirmed" : "Rejected";
    }

    // Customer cancellation
    if (action === "cancel") {
      if (booking.creatorId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Only the customer can cancel this booking.",
        });
      }

      if (!["Pending", "Confirmed"].includes(booking.status)) {
        return res.status(400).json({
          success: false,
          message: "This booking cannot be cancelled.",
        });
      }

      newStatus = "Cancelled";
    }

    // Host completes a finished booking
    if (action === "complete") {
      if (booking.hostId !== userId) {
        return res.status(403).json({
          success: false,
          message: "Only the host can complete this booking.",
        });
      }

      if (booking.status !== "Confirmed") {
        return res.status(400).json({
          success: false,
          message: "Only confirmed bookings can be completed.",
        });
      }

      if (new Date(booking.endAt).getTime() > Date.now()) {
        return res.status(400).json({
          success: false,
          message: "The booking time has not ended yet.",
        });
      }

      newStatus = "Completed";
    }

    // Conditional update prevents overwriting a changed status
    const result = await db
      .collection(COLLECTIONS.BOOKINGS)
      .updateOne(
        {
          _id: bookingId,
          status: booking.status,
        },
        {
          $set: {
            status: newStatus,
            updatedAt: new Date(),
          },
        }
      );

    if (result.modifiedCount === 0) {
      return res.status(409).json({
        success: false,
        message: "Booking status has changed. Please refresh and try again.",
      });
    }

    const updatedBooking = await db
      .collection(COLLECTIONS.BOOKINGS)
      .findOne({ _id: bookingId });

    return res.status(200).json({
      success: true,
      message: `Booking ${newStatus.toLowerCase()} successfully.`,
      data: updatedBooking,
    });
  } catch (error) {
    console.error("Update booking status error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update booking status.",
    });
  }
}
