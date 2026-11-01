import { z } from "zod";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { COLLECTIONS } from "../config/collections.js";
import { studioSchema } from "../services/studio.validation.js";


// Escape user input before using it in regex
const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// GET ALL STUDIOS
export const getStudios = async (req, res) => {
  try {
    const db = getDB();

    const {
      category,
      city,
      search,
      minPrice,
      maxPrice,
      sort = "newest",
      page = "1",
      limit = "12",
    } = req.query;

    const currentPage = Math.max(1, Number(page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(limit) || 12));

    const filter = { status: "active" };

    if (category) filter.category = category;

    if (city) {
      filter["location.city"] = {
        $regex: `^${escapeRegex(city)}$`,
        $options: "i",
      };
    }

    if (search) {
      filter.title = {
        $regex: escapeRegex(search),
        $options: "i",
      };
    }

    if (minPrice || maxPrice) {
      filter.hourlyRate = {};

      if (minPrice) filter.hourlyRate.$gte = Number(minPrice);
      if (maxPrice) filter.hourlyRate.$lte = Number(maxPrice);
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      price_low: { hourlyRate: 1 },
      price_high: { hourlyRate: -1 },
      rating: { rating: -1 },
    };

    const sorting = sortOptions[sort] || sortOptions.newest;

    const studiosCollection = db.collection(COLLECTIONS.STUDIOS);

    const [studios, total] = await Promise.all([
      studiosCollection
        .find(filter)
        .sort(sorting)
        .skip((currentPage - 1) * pageSize)
        .limit(pageSize)
        .toArray(),

      studiosCollection.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      message: "Studios retrieved successfully",
      data: studios,
      pagination: {
        total,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve studios",
    });
  }
};

// GET FEATURED STUDIOS
export const getFeaturedStudios = async (req, res) => {
  try {
    const db = getDB();

    const studios = await db
      .collection(COLLECTIONS.STUDIOS)
      .find({ status: "active" })
      .sort({ rating: -1, createdAt: -1 })
      .limit(6)
      .toArray();

    res.status(200).json({
      success: true,
      message: "Featured studios retrieved successfully",
      data: studios,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve featured studios",
    });
  }
};

// GET SINGLE STUDIO
export const getStudioById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
    }

    const db = getDB();

    const studio = await db
      .collection(COLLECTIONS.STUDIOS)
      .findOne({
        _id: new ObjectId(id),
        status: "active",
      });

    if (!studio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found",
      });
    }

    res.status(200).json({
      success: true,
      data: studio,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve studio",
    });
  }
};

// CREATE STUDIO (TEMPORARY DEVELOPMENT ONLY)
export const createStudio = async (req, res) => {
  try {
    const validation = studioSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const db = getDB();

    const studioData = {
      ...validation.data,

      // Temporary development owner.
      // Replace with authenticated user ID later.
      ownerId: "development-test-owner",

      rating: 0,
      reviewCount: 0,
      status: "active",

      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db
      .collection(COLLECTIONS.STUDIOS)
      .insertOne(studioData);

    res.status(201).json({
      success: true,
      message: "Studio created successfully",
      data: {
        _id: result.insertedId,
        ...studioData,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create studio",
    });
  }
};


// GET MY STUDIO LISTINGS
export const getMyStudios = async (req, res) => {
  try {
    const db = getDB();

    const studios = await db
      .collection(COLLECTIONS.STUDIOS)
      .find({
        ownerId: req.user.id,
      })
      .sort({ createdAt: -1 })
      .toArray();

    res.status(200).json({
      success: true,
      message: "Your studio listings retrieved successfully",
      data: studios,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to retrieve your studios",
    });
  }
};

// UPDATE STUDIO
export const updateStudio = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
    }

    // Validate only editable fields
    const updateSchema = studioSchema
      .omit({
        gallery: true,
        amenities: true,
      })
      .partial()
      .extend({
        gallery: z.array(z.string().url()).optional(),
        amenities: z.array(z.string().trim().min(1)).optional(),
      })
      .refine(
        (data) => Object.keys(data).length > 0,
        "At least one field is required"
      );

    const validation = updateSchema.safeParse(req.body);

    if (!validation.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validation.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      });
    }

    const db = getDB();

    const studios = db.collection(COLLECTIONS.STUDIOS);

    const studioId = new ObjectId(id);

    // Check ownership
    const existingStudio = await studios.findOne({
      _id: studioId,
      ownerId: req.user.id,
    });

    if (!existingStudio) {
      return res.status(404).json({
        success: false,
        message: "Studio not found or you are not the owner",
      });
    }

    const updateData = {
      ...validation.data,
      updatedAt: new Date(),
    };

    await studios.updateOne(
      {
        _id: studioId,
        ownerId: req.user.id,
      },
      {
        $set: updateData,
      }
    );

    const updatedStudio = await studios.findOne({
      _id: studioId,
      ownerId: req.user.id,
    });

    res.status(200).json({
      success: true,
      message: "Studio updated successfully",
      data: updatedStudio,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update studio",
    });
  }
};

// DELETE STUDIO
export const deleteStudio = async (req, res) => {
  try {
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid studio ID",
      });
    }

    const db = getDB();

    const result = await db
      .collection(COLLECTIONS.STUDIOS)
      .deleteOne({
        _id: new ObjectId(id),
        ownerId: req.user.id,
      });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Studio not found or you are not the owner",
      });
    }

    res.status(200).json({
      success: true,
      message: "Studio deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete studio",
    });
  }
};

