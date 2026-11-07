const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { authenticateToken } = require("../middleware/auth");
const events = require("../utils/events");

const router = express.Router();
router.use(authenticateToken);

// Every query includes userId, so one user cannot read or modify another user's notes.
router.post("/", async (req, res) => {
  try {
    const { title, content } = req.body;
    if (!title || !content) {
      return res.status(400).json({ message: "title and content are required." });
    }

    const note = {
      userId: new ObjectId(req.user.id),
      title: String(title).trim(),
      content: String(content).trim(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await getDB().collection("notes").insertOne(note);
    events.emit("note:created", { userId: req.user.id, noteId: result.insertedId.toString() });

    res.status(201).json({ message: "Note created.", note: { ...note, _id: result.insertedId } });
  } catch (error) {
    console.error("Create note error:", error);
    res.status(500).json({ message: "Could not create note." });
  }
});

router.get("/", async (req, res) => {
  try {
    const notes = await getDB().collection("notes")
      .find({ userId: new ObjectId(req.user.id) })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ count: notes.length, notes });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch notes." });
  }
});

router.get("/:id", async (req, res) => {
  if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid note ID." });
  const note = await getDB().collection("notes").findOne({
    _id: new ObjectId(req.params.id),
    userId: new ObjectId(req.user.id)
  });
  if (!note) return res.status(404).json({ message: "Note not found." });
  res.json({ note });
});

router.put("/:id", async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid note ID." });
    const { title, content } = req.body;
    if (!title || !content) return res.status(400).json({ message: "title and content are required." });

    const result = await getDB().collection("notes").findOneAndUpdate(
      { _id: new ObjectId(req.params.id), userId: new ObjectId(req.user.id) },
      { $set: { title: String(title).trim(), content: String(content).trim(), updatedAt: new Date() } },
      { returnDocument: "after" }
    );
    if (!result) return res.status(404).json({ message: "Note not found." });
    res.json({ message: "Note updated.", note: result });
  } catch (error) {
    res.status(500).json({ message: "Could not update note." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ message: "Invalid note ID." });
    const result = await getDB().collection("notes").deleteOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(req.user.id)
    });
    if (!result.deletedCount) return res.status(404).json({ message: "Note not found." });
    res.json({ message: "Note deleted." });
  } catch (error) {
    res.status(500).json({ message: "Could not delete note." });
  }
});

module.exports = router;
