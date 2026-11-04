
import { Router } from "express";

import {
  addToWishlist,
  removeFromWishlist,
  getMyWishlist,
} from "../controllers/wishlist.controller.js";

import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

router.get("/", verifyToken, getMyWishlist);
router.post("/:studioId", verifyToken, addToWishlist);
router.delete("/:studioId", verifyToken, removeFromWishlist);

export default router;
