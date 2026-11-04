import app from "./src/app.js";
import { connectDB } from "./src/config/db.js";
import { createIndexes } from "./src/config/indexes.js";

let dbConnectionPromise = null;

const initializeDB = async () => {
  if (!dbConnectionPromise) {
    dbConnectionPromise = (async () => {
      await connectDB();
      await createIndexes();
    })().catch((error) => {
      dbConnectionPromise = null;
      throw error;
    });
  }

  return dbConnectionPromise;
};

export default async function handler(req, res) {
  try {
    await initializeDB();
    return app(req, res);
  } catch (error) {
    console.error("Backend initialization failed:", error);

    return res.status(500).json({
      success: false,
      message: "Backend initialization failed",
    });
  }
}