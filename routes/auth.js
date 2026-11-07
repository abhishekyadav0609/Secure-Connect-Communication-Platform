const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getDB } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const events = require("../utils/events");

const router = express.Router();

router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "name, email and password are required." });
    }
    if (typeof password !== "string" || password.length < 8) {
      return res.status(400).json({ message: "Password must be at least 8 characters." });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const users = getDB().collection("users");
    const existing = await users.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: "Email is already registered." });

    const passwordHash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS) || 12);
    const adminEmail = (process.env.BOOTSTRAP_ADMIN_EMAIL || "").trim().toLowerCase();
    const role = normalizedEmail === adminEmail && adminEmail ? "admin" : "user";

    const result = await users.insertOne({
      name: String(name).trim(),
      email: normalizedEmail,
      password: passwordHash,
      role,
      createdAt: new Date()
    });

    events.emit("user:registered", { email: normalizedEmail });

    return res.status(201).json({
      message: "Signup successful. You can now log in.",
      user: { id: result.insertedId, name: String(name).trim(), email: normalizedEmail, role }
    });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ message: "Email is already registered." });
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error during signup." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required." });
    }

    const user = await getDB().collection("users").findOne({
      email: String(email).trim().toLowerCase()
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const token = jwt.sign(
      { userId: user._id.toString(), role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );

    return res.json({
      message: "Login successful.",
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error during login." });
  }
});

router.get("/me", authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
