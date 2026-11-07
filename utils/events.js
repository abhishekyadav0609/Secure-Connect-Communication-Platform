const EventEmitter = require("events");

class AppEventBus extends EventEmitter {}
const appEvents = new AppEventBus();

appEvents.on("user:registered", ({ email }) => {
  console.log(`[EVENT] New user registered: ${email}`);
});

appEvents.on("note:created", ({ userId, noteId }) => {
  console.log(`[EVENT] Note ${noteId} created by user ${userId}`);
});

appEvents.on("chat:message", ({ username, message }) => {
  console.log(`[EVENT] Chat message from ${username}: ${message}`);
});

module.exports = appEvents;
