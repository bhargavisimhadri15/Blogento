const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/auth");
const Post = require("../models/Post");
const Comment = require("../models/Comment");

const buildUserResponse = (user) => ({
  _id: user._id,
  email: user.email,
  username: user.username,
  bio: user.bio || "",
  avatar: user.avatar || "",
  role: user.role || "user",
});

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");


// ================= REGISTER =================
router.post("/register", async (req, res) => {
  try {
    const username = (req.body.username || "").trim();
    const email = (req.body.email || "").trim().toLowerCase();
    const password = req.body.password || "";
    const bio = (req.body.bio || "").toString().slice(0, 200);
    const avatar = (req.body.avatar || "").toString();

    const emailRegex = new RegExp(`^${escapeRegex(email)}$`, "i");
    const userExists = await User.findOne({ $or: [{ email: emailRegex }, { username }] });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 🔥 HASH PASSWORD
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      bio,
      avatar,
    });

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Registered successfully",
      token,
      user: buildUserResponse(user),
    });

  } catch (error) {
    console.error("REGISTER ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});


// ================= LOGIN =================
router.post("/login", async (req, res) => {
  try {
    const identifier = (req.body.email || "").trim();
    const email = identifier.toLowerCase();
    const password = req.body.password || "";

    const emailQuery = identifier.includes("@")
      ? { $regex: new RegExp(`^${escapeRegex(identifier)}$`, "i") }
      : email;

    const user = await User.findOne({ $or: [{ email: emailQuery }, { username: identifier }] });

    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // 🔥 COMPARE HASHED PASSWORD
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login success",
      token,
      user: buildUserResponse(user),
    });

  } catch (error) {
    console.error("LOGIN ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});

// ================= ME =================
router.get("/me", protect, async (req, res) => {
  res.json({ user: buildUserResponse(req.user) });
});

// ================= UPDATE PROFILE =================
router.put("/profile", protect, async (req, res) => {
  try {
    const username = typeof req.body.username === "string" ? req.body.username.trim() : undefined;
    const bio = typeof req.body.bio === "string" ? req.body.bio.slice(0, 200) : undefined;
    const avatar = typeof req.body.avatar === "string" ? req.body.avatar : undefined;

    const update = {};
    if (username !== undefined) {
      if (!username) return res.status(400).json({ message: "Username is required" });
      if (!/^[A-Za-z0-9_]+$/.test(username)) {
        return res.status(400).json({ message: "Username can only contain letters, numbers, and underscores" });
      }
      const existing = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (existing) return res.status(400).json({ message: "Username already in use" });
      update.username = username;
    }

    if (bio !== undefined) update.bio = bio;
    if (avatar !== undefined) update.avatar = avatar;

    if (Object.keys(update).length === 0) {
      return res.json({ message: "Profile updated", user: buildUserResponse(req.user) });
    }

    const updated = await User.findByIdAndUpdate(
      req.user._id,
      { $set: update },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) return res.status(404).json({ message: "User not found" });

    return res.json({ message: "Profile updated", user: buildUserResponse(updated) });
  } catch (error) {
    console.error("PROFILE UPDATE ERROR:", error);
    if (error?.code === 11000) {
      return res.status(400).json({ message: "Username or email already in use" });
    }
    if (error?.name === "ValidationError") {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: error.message || "Server error" });
  }
});

// ================= CHANGE PASSWORD =================
router.put("/change-password", protect, async (req, res) => {
  try {
    const currentPassword = req.body.currentPassword || "";
    const newPassword = req.body.newPassword || "";

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const userWithPassword = await User.findById(req.user._id);
    if (!userWithPassword) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(currentPassword, userWithPassword.password);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    userWithPassword.password = newPassword;
    await userWithPassword.save();

    res.json({ message: "Password updated" });
  } catch (error) {
    console.error("CHANGE PASSWORD ERROR:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
});

// ================= DELETE ACCOUNT =================
router.delete("/me", protect, async (req, res) => {
  try {
    const password = req.body?.password || "";
    if (!password) {
      return res.status(400).json({ message: "Password is required to delete your account" });
    }

    const userWithPassword = await User.findById(req.user._id);
    if (!userWithPassword) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(password, userWithPassword.password);
    if (!ok) return res.status(400).json({ message: "Password is incorrect" });

    const myPosts = await Post.find({ author: req.user._id }).select("_id");
    const myPostIds = myPosts.map(p => p._id);

    await Promise.all([
      Comment.deleteMany({ $or: [{ author: req.user._id }, { post: { $in: myPostIds } }] }),
      Post.deleteMany({ author: req.user._id }),
      User.findByIdAndDelete(req.user._id),
    ]);

    return res.json({ message: "Account deleted" });
  } catch (error) {
    console.error("DELETE ACCOUNT ERROR:", error);
    return res.status(500).json({ message: error.message || "Server error" });
  }
});

module.exports = router;
