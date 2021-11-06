const mongoose = require("mongoose");

/**
 * Conversation Schema
 */
const ConversationSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      maxlength: 64,
      minlength: 1,
      trim: true,
      required: true,
      unique: true
    },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

/**
 * @typedef Conversation
 */

module.exports = mongoose.model("Conversation", ConversationSchema);
