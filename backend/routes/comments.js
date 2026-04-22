const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const { protect } = require('../middleware/auth');

// @route   GET /api/comments/post/:postId
// @desc    Get all comments for a post
// @access  Public
router.get('/post/:postId', async (req, res) => {
  try {
    const identifier = req.params.postId;
    let postId = identifier;

    if (!mongoose.Types.ObjectId.isValid(identifier)) {
      const post = await Post.findOne({ slug: identifier }).select('_id');
      if (!post) return res.json({ comments: [] });
      postId = post._id;
    }

    const comments = await Comment.find({
      post: postId,
      parentComment: null
    })
      .populate('author', 'username avatar')
      .sort({ createdAt: -1 });

    // Fetch replies for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({ parentComment: comment._id })
          .populate('author', 'username avatar')
          .sort({ createdAt: 1 });
        return { ...comment.toObject(), replies };
      })
    );

    res.json({ comments: commentsWithReplies });
  } catch (error) {
    if (error?.name === 'CastError') {
      return res.json({ comments: [] });
    }
    return res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/comments
// @desc    Create a comment
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { content, postId, parentCommentId } = req.body;

    if (!content || !postId) {
      return res.status(400).json({ message: 'Content and postId are required' });
    }

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const comment = await Comment.create({
      content,
      post: postId,
      author: req.user._id,
      parentComment: parentCommentId || null
    });

    await comment.populate('author', 'username avatar');

    res.status(201).json({ message: 'Comment added', comment });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/comments/:id
// @desc    Edit a comment
// @access  Private (owner only)
router.put('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (!comment.author.equals(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    comment.content = req.body.content;
    comment.isEdited = true;
    await comment.save();
    await comment.populate('author', 'username avatar');

    res.json({ message: 'Comment updated', comment });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/comments/:id
// @desc    Delete a comment
// @access  Private (owner or admin)
router.delete('/:id', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    if (!comment.author.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete replies too
    await Promise.all([
      Comment.findByIdAndDelete(req.params.id),
      Comment.deleteMany({ parentComment: req.params.id })
    ]);

    res.json({ message: 'Comment deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/comments/:id/like
// @desc    Like/unlike a comment
// @access  Private
router.post('/:id/like', protect, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    const liked = comment.likes.includes(req.user._id);
    if (liked) {
      comment.likes.pull(req.user._id);
    } else {
      comment.likes.push(req.user._id);
    }
    await comment.save();

    res.json({ liked: !liked, likesCount: comment.likes.length });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
