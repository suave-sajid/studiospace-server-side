
import express from "express";

import {
  getStudios,
  getFeaturedStudios,
  getStudioById,
  createStudio,
} from "../controllers/studio.controller.js";

import { developmentOnly } from "../middleware/developmentOnly.js";

const router = express.Router();

// GET /api/studios
router.get("/", getStudios);

// GET /api/studios/featured
router.get("/featured", getFeaturedStudios);

// POST /api/studios
router.post("/", developmentOnly, createStudio);

// GET /api/studios/:id
router.get("/:id", getStudioById);

export default router;
