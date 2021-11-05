const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

/**
 * User Schema
 */
const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      match: /^\S+@\S+\.\S+$/,
      required: true,
      unique: true,
      trim: true,
      index: true,
      lowercase: true,
    },
    password: { type: String, required: true },
  },
  {
    timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
  }
);

/**
 * Hook
 */
UserSchema.pre("save", async function (next) {
  const user = this;
  const hash = await bcrypt.hash(user.password, 10);
  user.password = hash;
  next();
});

/**
 * Methods
 */
UserSchema.methods.isValidPassword = async function (password) {
  const user = this;
  const compare = await bcrypt.compare(password, user.password);
  return compare;
};

UserSchema.methods.token = async function () {
  const user = this.toJSON();
  const token = jwt.sign(user, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXP,
  });
  return token;
};

/**
 * @typedef User
 */

module.exports = mongoose.model("User", UserSchema);
