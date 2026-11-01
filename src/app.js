
import express from "express";
import cors from "cors";
import { getDB } from "./config/db.js";
import studioRoutes from "./routes/studio.routes.js";
import authRoutes from "./routes/auth.routes.js";
import bookingRoutes from "./routes/booking.routes.js";
import reviewRoutes from "./routes/review.routes.js";

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/studios", studioRoutes);
app.use("/api/auth-test", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/reviews", reviewRoutes);

// Health Check Route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "StudioSpace API is running!",
    environment: process.env.NODE_ENV,
  });
});


app.get("/api/db-health", async (req, res) => {
  try {
    const db = getDB();

    await db.command({ ping: 1 });

    res.status(200).json({
      success: true,
      message: "MongoDB is connected!",
      database: "connected",
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});


// Root Route
app.get("/", (req, res) => {
  res.send("Welcome to StudioSpace API");
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

export default app;
