const { MongoClient } = require("mongodb");

let client;
let db;

async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.DB_NAME || "secure_connect";

  if (!uri) throw new Error("MONGODB_URI is missing in .env");

  client = new MongoClient(uri);
  await client.connect();
  db = client.db(dbName);

  // Indexes enforce unique emails and make user-owned notes efficient to query.
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("notes").createIndex({ userId: 1, createdAt: -1 });
  await db.collection("messages").createIndex({ createdAt: -1 });

  console.log(`MongoDB connected: ${dbName}`);
  return db;
}

function getDB() {
  if (!db) throw new Error("Database is not connected");
  return db;
}

async function closeDB() {
  if (client) await client.close();
}

module.exports = { connectDB, getDB, closeDB };
