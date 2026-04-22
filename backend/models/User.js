const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  bio: {
    type: String,
    default: "",
    maxlength: 200,
  },
  avatar: {
    type: String,
    default: "",
  },
  role: {
    type: String,
    enum: ["user", "admin"],
    default: "user",
  },
}, { timestamps: true });

userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();

    // Avoid double-hashing if a script already stored a bcrypt hash.
    if (typeof this.password === "string" && this.password.startsWith("$2")) {
      return next();
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (error) {
    return next(error);
  }
});

module.exports = mongoose.model("User", userSchema);
