const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const streamifier = require('streamifier');
const { v2: cloudinary } = require('cloudinary');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const { protect, optionalAuth, adminOnly } = require('../middleware/auth');

const isOwner = (user, author) => {
  if (!user) return false;

  const userId = user._id ? user._id.toString() : '';
  const authorId = author && author._id ? author._id.toString() : (author ? author.toString() : '');
  return Boolean(userId && authorId && userId === authorId);
};

const isAdmin = (user) => Boolean(user && user.role === 'admin');

const cloudinaryCloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUD_NAME;
const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY || process.env.CLOUD_API_KEY;
const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET || process.env.CLOUD_API_SECRET;
const cloudinaryConfigured = Boolean(cloudinaryCloudName && cloudinaryApiKey && cloudinaryApiSecret);

cloudinary.config({
  cloud_name: cloudinaryCloudName,
  api_key: cloudinaryApiKey,
  api_secret: cloudinaryApiSecret
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed'));
  }
});

const uploadImageMiddleware = (req, res, next) => {
  upload.single('image')(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: 'Image must be 5MB or less' });
    }

    return res.status(400).json({ message: error.message || 'Invalid image upload' });
  });
};

const uploadToCloudinary = (buffer, originalname) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'blogento/posts',
        resource_type: 'image',
        use_filename: true,
        unique_filename: true,
        filename_override: originalname ? originalname.split('.').slice(0, -1).join('.') : undefined
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

const getImageExtension = (file) => {
  const extFromName = path.extname(file.originalname || '').toLowerCase();
  if (extFromName) return extFromName;

  const mimeToExt = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'image/svg+xml': '.svg',
    'image/avif': '.avif'
  };
  return mimeToExt[file.mimetype] || '.jpg';
};

const saveImageLocally = async (file) => {
  const uploadDir = path.join(__dirname, '..', 'uploads', 'posts');
  await fs.promises.mkdir(uploadDir, { recursive: true });

  const originalBase = path.basename(file.originalname || 'image', path.extname(file.originalname || ''));
  const safeBase = (originalBase || 'image')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
  const filename = `${Date.now()}-${safeBase}${getImageExtension(file)}`;
  const filePath = path.join(uploadDir, filename);

  await fs.promises.writeFile(filePath, file.buffer);
  return `/uploads/posts/${filename}`;
};

router.post('/upload-image', protect, uploadImageMiddleware, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    if (cloudinaryConfigured) {
      try {
        const uploaded = await uploadToCloudinary(req.file.buffer, req.file.originalname);
        return res.status(201).json({
          message: 'Image uploaded successfully',
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          storage: 'cloudinary'
        });
      } catch (cloudinaryError) {
        console.error('UPLOAD IMAGE CLOUDINARY ERROR:', cloudinaryError.message);
      }
    }

    const localPath = await saveImageLocally(req.file);
    const localUrl = `${req.protocol}://${req.get('host')}${localPath}`;

    res.status(201).json({
      message: cloudinaryConfigured
        ? 'Image uploaded successfully (local fallback)'
        : 'Image uploaded successfully',
      url: localUrl,
      storage: 'local'
    });
  } catch (error) {
    console.error('UPLOAD IMAGE ERROR:', error.message);
    res.status(500).json({
      message: process.env.NODE_ENV === 'development'
        ? `Failed to upload image: ${error.message}`
        : 'Failed to upload image'
    });
  }
});

// GET all posts
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const query = { status: 'published' };
    if (req.query.search) query.$text = { $search: req.query.search };
    if (req.query.category) query.category = req.query.category;
    if (req.query.tag) query.tags = req.query.tag;
    if (req.query.author) query.author = req.query.author;

    const sortOptions = {
      newest: { createdAt: -1 },
      oldest: { createdAt: 1 },
      popular: { views: -1 },
      liked: { likes: -1 }
    };
    const sort = sortOptions[req.query.sort] || { createdAt: -1 };

    const [posts, total] = await Promise.all([
      Post.find(query)
        .populate('author', 'username avatar bio')
        .populate('commentCount')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .select('-content'),
      Post.countDocuments(query)
    ]);

    res.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalPosts: total,
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('GET POSTS ERROR:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// GET my posts
router.get('/my-posts', protect, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.user._id })
      .populate('commentCount')
      .sort({ createdAt: -1 });
    res.json({ posts });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// GET single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const query = req.params.id.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: req.params.id }
      : { slug: req.params.id };

    const post = await Post.findOne(query)
      .populate('author', 'username avatar bio createdAt')
      .populate('commentCount');

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.status === 'draft' && !(isOwner(req.user, post.author) || isAdmin(req.user))) {
      return res.status(403).json({ message: 'You are not allowed to view this draft' });
    }

    await Post.findByIdAndUpdate(post._id, { $inc: { views: 1 } });

    res.json({ post });
  } catch (error) {
    console.error('GET POST ERROR:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// CREATE post
router.post('/', protect, async (req, res) => {
  try {
    const { title, content, excerpt, coverImage, tags, category, status } = req.body;

    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    const post = await Post.create({
      title,
      content,
      excerpt,
      coverImage,
      tags: tags ? tags.map(t => t.toLowerCase().trim()) : [],
      category: category || 'Other',
      status: status || 'published',
      author: req.user._id
    });

    await post.populate('author', 'username avatar');
    res.status(201).json({ message: 'Post created successfully', post });
  } catch (error) {
    console.error('CREATE POST ERROR:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// UPDATE post — allow any logged in user
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    const { title, content, excerpt, coverImage, tags, category, status } = req.body;

    if (title !== undefined) post.title = title;
    if (content !== undefined) post.content = content;
    if (excerpt !== undefined) post.excerpt = excerpt;
    if (coverImage !== undefined) post.coverImage = coverImage;
    if (tags !== undefined) post.tags = tags.map(t => t.toLowerCase().trim());
    if (category !== undefined) post.category = category;
    if (status !== undefined) post.status = status;

    await post.save();
    await post.populate('author', 'username avatar');

    console.log('✅ Post updated:', post._id);
    res.json({ message: 'Post updated successfully', post });
  } catch (error) {
    console.error('UPDATE POST ERROR:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// DELETE post — allow any logged in user
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }
    await Promise.all([
      Post.findByIdAndDelete(req.params.id),
      Comment.deleteMany({ post: req.params.id })
    ]);

    console.log('✅ Post deleted:', req.params.id);
    res.json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('DELETE POST ERROR:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// LIKE post
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const liked = post.likes.includes(req.user._id);
    if (liked) {
      post.likes.pull(req.user._id);
    } else {
      post.likes.push(req.user._id);
    }
    await post.save();

    res.json({ liked: !liked, likesCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
