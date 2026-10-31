
import express from "express";
import cors from "cors";

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());

// Health Check Route
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "StudioSpace API is running!",
    environment: process.env.NODE_ENV,
  });
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
