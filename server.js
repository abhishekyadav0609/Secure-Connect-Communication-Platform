require("dotenv").config();

const http = require("http");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { Server } = require("socket.io");
const { ObjectId } = require("mongodb");
const { connectDB, getDB, closeDB } = require("./config/db");
const authRoutes = require("./routes/auth");
const notesRoutes = require("./routes/notes");
const adminRoutes = require("./routes/admin");
const events = require("./utils/events");

const app = express();
const server = http.createServer(app);
const allowedOrigin = process.env.CLIENT_ORIGIN || "*";

app.use(cors({ origin: allowedOrigin === "*" ? true : allowedOrigin }));
app.use(express.json({ limit: "20kb" }));

app.get("/", (req, res) => {
  res.json({ message: "Secure Connect API is running.", endpoints: ["/api/auth", "/api/notes", "/api/admin"] });
});

app.use("/api/auth", authRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/admin", adminRoutes);

app.use((req, res) => res.status(404).json({ message: "Route not found." }));

const io = new Server(server, {
  cors: { origin: allowedOrigin === "*" ? true : allowedOrigin }
});

// Socket.IO authentication: client must provide { auth: { token: "JWT" } }.
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await getDB().collection("users").findOne(
      { _id: new ObjectId(decoded.userId) },
      { projection: { password: 0 } }
    );
    if (!user) return next(new Error("User not found"));
    socket.user = { id: user._id.toString(), name: user.name };
    next();
  } catch (error) {
    next(new Error("Invalid or expired token"));
  }
});

io.on("connection", (socket) => {
  console.log(`[SOCKET] ${socket.user.name} connected (${socket.id})`);

  socket.on("chat:message", async (payload, acknowledge) => {
    try {
      const message = String(payload && payload.message || "").trim();
      if (!message || message.length > 1000) {
        if (typeof acknowledge === "function") acknowledge({ error: "Message must contain 1-1000 characters." });
        return;
      }

      const chatMessage = {
        userId: new ObjectId(socket.user.id),
        username: socket.user.name,
        message,
        createdAt: new Date()
      };
      const result = await getDB().collection("messages").insertOne(chatMessage);
      const outgoing = { id: result.insertedId.toString(), username: chatMessage.username, message, createdAt: chatMessage.createdAt };

      io.emit("chat:message", outgoing);
      events.emit("chat:message", { username: socket.user.name, message });
      if (typeof acknowledge === "function") acknowledge({ success: true, data: outgoing });
    } catch (error) {
      console.error("Chat message error:", error);
      if (typeof acknowledge === "function") acknowledge({ error: "Message could not be sent." });
    }
  });

  socket.on("disconnect", () => {
    console.log(`[SOCKET] ${socket.user.name} disconnected`);
  });
});

async function start() {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
    throw new Error("Set JWT_SECRET in .env to a random string of at least 24 characters.");
  }
  await connectDB();
  const port = Number(process.env.PORT) || 5000;
  server.listen(port, () => console.log(`Server running at http://localhost:${port}`));
}

start().catch((error) => {
  console.error("Startup failed:", error.message);
  process.exit(1);
});

async function shutdown() {
  console.log("Shutting down...");
  server.close(async () => {
    await closeDB();
    process.exit(0);
  });
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
