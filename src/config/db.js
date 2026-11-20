import { MongoClient } from "mongodb";

let client;
let db;

export async function connectDB() {
  if (db) return db;
  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not set");
  }
  client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  db = client.db(process.env.DB_NAME || "salonbook");
  console.log("MongoDB connected");
  return db;
}

export function getDB() {
  if (!db) throw new Error("Database not connected yet");
  return db;
}