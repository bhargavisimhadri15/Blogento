const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const streamifier = require('streamifier');
const { v2: cloudinary } = require('cloudinary');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { protect, optionalAuth } = require('../middleware/auth');


// =======================
// 🔐 HELPERS
// =======================
const isOwner = (user, author) => {
  if (!user) return false;
  return user._id?.toString() === author?.toString();
};

const isAdmin = (user) => user?.role === 'admin';


// =======================
// ☁️ CLOUDINARY CONFIG
// =======================
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});


// =======================
// 📦 MULTER CONFIG
// =======================
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});


// =======================
// 🖼️ IMAGE UPLOAD
// =======================
const getBaseUrl = (req) => `${req.protocol}://${req.get('host')}`;

const inferImageExtension = (file) => {
  const extFromName = path.extname(file.originalname || '').toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'].includes(extFromName)) return extFromName;

  const byMime = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/avif': '.avif',
  };

  return byMime[file.mimetype] || '.jpg';
};

const writeImageToUploads = async (req, file) => {
  const uploadsDir = path.join(__dirname, '..', 'uploads', 'images');
  await fs.promises.mkdir(uploadsDir, { recursive: true });

  const ext = inferImageExtension(file);
  const name = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
  const diskPath = path.join(uploadsDir, name);

  await fs.promises.writeFile(diskPath, file.buffer);

  return {
    url: `${getBaseUrl(req)}/uploads/images/${name}`,
    storage: 'local',
  };
};

const canUseCloudinary = () => Boolean(process.env.CLOUD_NAME && process.env.CLOUD_API_KEY && process.env.CLOUD_API_SECRET);
const isVercel = () => Boolean(process.env.VERCEL);

const uploadToCloudinary = (buffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

router.post('/upload-image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image required' });
    }

    if (!req.file.mimetype?.startsWith('image/')) {
      return res.status(400).json({ message: 'Only image files are allowed' });
    }

    const folder = req.body?.folder === 'avatars' ? 'avatars' : 'posts';

    if (canUseCloudinary()) {
      try {
        const result = await uploadToCloudinary(req.file.buffer, folder);
        return res.status(201).json({
          message: 'Uploaded',
          url: result.secure_url,
          storage: 'cloudinary',
        });
      } catch (cloudErr) {
        console.error('CLOUDINARY UPLOAD ERROR:', cloudErr?.message || cloudErr);
      }
    }

    if (isVercel()) {
      return res.status(503).json({
        message: 'Image upload is not configured for Vercel. Set CLOUD_NAME, CLOUD_API_KEY, CLOUD_API_SECRET (Cloudinary).',
      });
    }

    const local = await writeImageToUploads(req, req.file);
    return res.status(201).json({
      message: 'Uploaded',
      url: local.url,
      storage: local.storage,
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});


// =======================
// 📌 GET ALL POSTS
// =======================
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 9;
    const skip = (page - 1) * limit;

    const query = { status: 'published' };

    if (req.query.search) {
      query.$text = { $search: req.query.search };
    }

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      popular: { views: -1 }
    };

    const sort = sortOptions[req.query.sort] || { createdAt: -1 };

    const posts = await Post.find(query)
      .populate('author', 'username avatar')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .select('-content');

    const total = await Post.countDocuments(query);

    res.json({
      posts,
      total,
      page,
      pages: Math.ceil(total / limit)
    });

  } catch (error) {
    console.error("GET POSTS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});


// =======================
// 👤 MY POSTS
// =======================
router.get('/my-posts', protect, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .sort({ createdAt: -1 });

    res.json({ posts });

  } catch (error) {
    console.error("MY POSTS ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});


// =======================
// 📄 SINGLE POST
// =======================
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const identifier = req.params.id;
    const query = mongoose.Types.ObjectId.isValid(identifier)
      ? { _id: identifier }
      : { slug: identifier };

    const post = await Post.findOne(query)
      .populate('author', 'username avatar bio');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.status === 'draft') {
      const owner = isOwner(req.user, post.author?._id || post.author);
      if (!owner && !isAdmin(req.user)) {
        return res.status(404).json({ message: 'Post not found' });
      }
    }

    await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });

    res.json({ post });

  } catch (error) {
    console.error("GET POST ERROR:", error);
    if (error?.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    return res.status(500).json({ message: error.message });
  }
});


// =======================
// â¤ï¸ LIKE / UNLIKE POST
// =======================
router.post('/:id/like', protect, async (req, res) => {
  try {
    const identifier = req.params.id;
    const query = mongoose.Types.ObjectId.isValid(identifier)
      ? { _id: identifier }
      : { slug: identifier };

    const post = await Post.findOne(query);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (post.status === 'draft') {
      const owner = isOwner(req.user, post.author);
      if (!owner && !isAdmin(req.user)) {
        return res.status(404).json({ message: 'Post not found' });
      }
    }

    const userId = req.user._id;
    const alreadyLiked = post.likes?.some(id => `${id}` === `${userId}`);
    if (alreadyLiked) {
      post.likes.pull(userId);
    } else {
      post.likes.push(userId);
    }
    await post.save();

    return res.json({
      liked: !alreadyLiked,
      likesCount: post.likes.length,
    });
  } catch (error) {
    console.error('LIKE ERROR:', error);
    if (error?.name === 'CastError') {
      return res.status(404).json({ message: 'Post not found' });
    }
    return res.status(500).json({ message: error.message || 'Server error' });
  }
});


// =======================
// ➕ CREATE POST
// =======================
router.post('/', protect, async (req, res) => {
  try {
    const {
      title,
      content,
      excerpt,
      coverImage,
      tags,
      category,
      status,
    } = req.body || {};

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const post = await Post.create({
      title,
      content,
      excerpt,
      coverImage,
      tags,
      category,
      status,
      author: req.user._id,
    });

    res.status(201).json({ post });

  } catch (error) {
    console.error("CREATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});


// =======================
// ✏️ UPDATE POST
// =======================
router.put('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Not found" });

    if (!isOwner(req.user, post.author)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const allowed = ['title', 'content', 'excerpt', 'coverImage', 'tags', 'category', 'status'];
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        post[key] = req.body[key];
      }
    }
    await post.save();

    res.json({ post });

  } catch (error) {
    console.error("UPDATE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});


// =======================
// ❌ DELETE POST
// =======================
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) return res.status(404).json({ message: "Not found" });

    if (!isOwner(req.user, post.author)) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await Post.findByIdAndDelete(req.params.id);

    res.json({ message: "Deleted" });

  } catch (error) {
    console.error("DELETE ERROR:", error);
    res.status(500).json({ message: error.message });
  }
});


module.exports = router;
