
import "dotenv/config";

import app from "./app.js";
import { connectDB } from "./config/db.js";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect MongoDB first
    await connectDB();

    // Start Express after successful DB connection
    app.listen(PORT, () => {
      console.log(
        `StudioSpace API running on http://localhost:${PORT}`
      );
    });

  } catch (error) {
    console.error("Server startup failed:", error.message);
    process.exit(1);
  }
};

startServer();
