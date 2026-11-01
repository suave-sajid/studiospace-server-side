
import { Router } from "express";

import {
  createReview,
  getStudioReviews,
} from "../controllers/review.controller.js";

import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

router.post("/", verifyToken, createReview);
router.get("/studio/:studioId", getStudioReviews);

export default router;
