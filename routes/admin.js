const express = require("express");
const { getDB } = require("../config/db");
const { ObjectId } = require("mongodb");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();
router.use(authenticateToken, authorizeRoles("admin"));

router.get("/users", async (req, res) => {
  const users = await getDB().collection("users")
    .find({}, { projection: { password: 0 } })
    .sort({ createdAt: -1 }).toArray();
  res.json({ count: users.length, users });
});

// Only an existing admin can change a user's role. Never accept role from public signup.
router.patch("/users/:id/role", async (req, res) => {
  const { role } = req.body;
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid user ID." });
  if (!["user", "admin"].includes(role)) return res.status(400).json({ message: "Role must be user or admin." });

  const result = await getDB().collection("users").updateOne(
    { _id: new ObjectId(req.params.id) },
    { $set: { role } }
  );
  if (!result.matchedCount) return res.status(404).json({ message: "User not found." });
  res.json({ message: `User role updated to ${role}.` });
});

module.exports = router;
