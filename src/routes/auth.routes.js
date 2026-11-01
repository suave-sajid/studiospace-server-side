import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

router.get("/me", verifyToken, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Authentication successful.",
    user: req.user,
  });
});

export default router;