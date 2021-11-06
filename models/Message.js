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

MessageSchema.set("toObject", { virtuals: true });
MessageSchema.set("toJSON", { virtuals: true });

MessageSchema.virtual("timer").get(function () {
  const date = new Date(this.created_at).toLocaleTimeString("en-US");
  return date;
});

/**
 * @typedef Message
 */

module.exports = mongoose.model("Message", MessageSchema);
