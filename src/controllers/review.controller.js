
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { COLLECTIONS } from "../config/collections.js";
import { reviewSchema } from "../services/review.validation.js";

export async function createReview(req, res) {
  try {
    const validation = reviewSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Invalid review information.",
        errors: validation.error.flatten(),
      });
    }

    const { bookingId, rating, comment } = validation.data;

    if (!ObjectId.isValid(bookingId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid booking ID.",
      });
    }

    const db = getDB();

    const booking = await db
      .collection(COLLECTIONS.BOOKINGS)
      .findOne({
        _id: new ObjectId(bookingId),
        creatorId: req.user.id,
        status: "Completed",
      });

    if (!booking) {
      return res.status(403).json({
        success: false,
        message: "Only customers with completed bookings can review.",
      });
    }

    const review = {
      studioId: booking.studioId,
      bookingId: booking._id,
      userId: req.user.id,
      rating,
      comment,
      createdAt: new Date(),
    };

    try {
      await db.collection(COLLECTIONS.REVIEWS).insertOne(review);
    } catch (error) {
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: "You have already reviewed this booking.",
        });
      }

      throw error;
    }

    // Recalculate the studio's average rating
    const stats = await db
      .collection(COLLECTIONS.REVIEWS)
      .aggregate([
        {
          $match: {
            studioId: booking.studioId,
          },
        },
        {
          $group: {
            _id: "$studioId",
            averageRating: { $avg: "$rating" },
            reviewCount: { $sum: 1 },
          },
        },
      ])
      .toArray();

    if (stats.length > 0) {
      await db.collection(COLLECTIONS.STUDIOS).updateOne(
        { _id: booking.studioId },
        {
          $set: {
            rating: Number(stats[0].averageRating.toFixed(1)),
            reviewCount: stats[0].reviewCount,
          },
        }
      );
    }

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully.",
      data: review,
    });
  } catch (error) {
    console.error("Create review error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to submit review.",
    });
  }
}

export async function getStudioReviews(req, res) {
  try {
    const { studioId } = req.params;

    if (!ObjectId.isValid(studioId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const db = getDB();

    const reviews = await db
      .collection(COLLECTIONS.REVIEWS)
      .aggregate([
        {
          $match: {
            studioId: new ObjectId(studioId),
          },
        },
        {
          $sort: {
            createdAt: -1,
          },
        },
        {
          $project: {
            studioId: 1,
            rating: 1,
            comment: 1,
            createdAt: 1,
            userId: 1,
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      count: reviews.length,
      data: reviews,
    });
  } catch (error) {
    console.error("Get studio reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews.",
    });
  }
}
