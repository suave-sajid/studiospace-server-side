
import express from "express";

import {
  getStudios,
  getFeaturedStudios,
  getStudioById,
  createStudio,
  getMyStudios,
  updateStudio,
  deleteStudio,
} from "../controllers/studio.controller.js";

import { developmentOnly } from "../middleware/developmentOnly.js";
import { devUser } from "../middleware/devUser.js";

const router = express.Router();

// Public routes
router.get("/", getStudios);
router.get("/featured", getFeaturedStudios);

// Temporary development routes
router.get("/mine", devUser, getMyStudios);

router.post("/", developmentOnly, createStudio);

router.patch("/:id", devUser, updateStudio);

router.delete("/:id", devUser, deleteStudio);

// Single studio
router.get("/:id", getStudioById);

export default router;
