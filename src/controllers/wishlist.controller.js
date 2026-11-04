
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { COLLECTIONS } from "../config/collections.js";

export async function addToWishlist(req, res) {
  try {
    const { studioId } = req.params;

    if (!ObjectId.isValid(studioId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const db = getDB();

    const studio = await db.collection(COLLECTIONS.STUDIOS).findOne({
      _id: new ObjectId(studioId),
      status: "active",
    });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found.",
      });
    }

    const existing = await db.collection(COLLECTIONS.WISHLISTS).findOne({
      userId: req.user.id,
      studioId: studio._id,
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Studio is already in your wishlist.",
      });
    }

    await db.collection(COLLECTIONS.WISHLISTS).insertOne({
      userId: req.user.id,
      studioId: studio._id,
      createdAt: new Date(),
    });

    return res.status(201).json({
      success: true,
      message: "Studio added to wishlist.",
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Studio is already in your wishlist.",
      });
    }

    console.error("Add wishlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add studio to wishlist.",
    });
  }
}

export async function removeFromWishlist(req, res) {
  try {
    const { studioId } = req.params;

    if (!ObjectId.isValid(studioId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID.",
      });
    }

    const db = getDB();

    const result = await db.collection(COLLECTIONS.WISHLISTS).deleteOne({
      userId: req.user.id,
      studioId: new ObjectId(studioId),
    });

    return res.status(200).json({
      success: true,
      message: result.deletedCount
        ? "Studio removed from wishlist."
        : "Studio was not in your wishlist.",
    });
  } catch (error) {
    console.error("Remove wishlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to remove studio.",
    });
  }
}

export async function getMyWishlist(req, res) {
  try {
    const db = getDB();

    const wishlist = await db.collection(COLLECTIONS.WISHLISTS)
      .aggregate([
        {
          $match: { userId: req.user.id },
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
          $unwind: "$studio",
        },
        {
          $match: {
            "studio.status": "active",
          },
        },
        {
          $sort: { createdAt: -1 },
        },
        {
          $project: {
            _id: 1,
            createdAt: 1,
            studio: 1,
          },
        },
      ])
      .toArray();

    return res.status(200).json({
      success: true,
      count: wishlist.length,
      data: wishlist,
    });
  } catch (error) {
    console.error("Get wishlist error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch wishlist.",
    });
  }
}
