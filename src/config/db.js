
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.DB_NAME;

if (!uri) {
  throw new Error("MONGODB_URI is missing from environment variables");
}

if (!dbName) {
  throw new Error("DB_NAME is missing from environment variables");
}

const client = new MongoClient(uri, {
  serverSelectionTimeoutMS: 5000,
});

let database = null;

export const connectDB = async () => {
  try {
    await client.connect();

    database = client.db(dbName);

    await database.command({ ping: 1 });

    console.log("MongoDB connected successfully!");

    return database;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
};

export const getDB = () => {
  if (!database) {
    throw new Error("Database is not connected");
  }

  return database;
};

export const closeDB = async () => {
  await client.close();
  database = null;
};
