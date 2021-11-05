const mongoose = require("mongoose");

/**
 * Message Schema
 */
const MessageSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

/**
 * @typedef Message
 */

module.exports = mongoose.model("Message", MessageSchema);
