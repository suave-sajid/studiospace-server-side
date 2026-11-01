import { Router } from "express";

import {
  getStudios,
  getFeaturedStudios,
  getStudioById,
  createStudio,
  getMyStudios,
  updateStudio,
  deleteStudio,
} from "../controllers/studio.controller.js";

import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

// Public routes
router.get("/", getStudios);
router.get("/featured", getFeaturedStudios);

// Protected routes — /mine must be before /:id
router.get("/mine", verifyToken, getMyStudios);
router.post("/", verifyToken, createStudio);
router.patch("/:id", verifyToken, updateStudio);
router.delete("/:id", verifyToken, deleteStudio);

// Keep dynamic GET route last
router.get("/:id", getStudioById);

export default router;