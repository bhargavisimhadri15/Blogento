import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { postsAPI, commentsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';
import CoverImage from '../components/CoverImage';

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPost = async () => {
      try {
        const [postRes, commentsRes] = await Promise.all([
          postsAPI.getById(id),
          commentsAPI.getByPost(id).catch(() => ({ data: { comments: [] } }))
        ]);
        const fetchedPost = postRes.data.post;
        setPost(fetchedPost);
        setLiked(user ? fetchedPost.likes?.some(
          l => l === user._id || l === user.id || l?._id === user._id
        ) : false);
        setLikesCount(fetchedPost.likes?.length || 0);
        setComments(commentsRes.data.comments || []);
      } catch (err) {
        console.error('Post load error:', err);
        toast.error('Post not found');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, navigate, user]);

  const handleLike = async () => {
    if (!user) { navigate('/login'); return; }
    try {
      const { data } = await postsAPI.like(post._id);
      setLiked(data.liked);
      setLikesCount(data.likesCount);
    } catch (err) {
      toast.error('Failed to like post');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    try {
      await postsAPI.delete(post._id);
      toast.success('Post deleted');
      navigate('/dashboard');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err.response?.data?.message || 'Failed to delete post');
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers / insecure contexts
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(textarea);
        return ok;
      } catch {
        return false;
      }
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    const title = post?.title || 'Blog post';

    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        if (err?.name === 'AbortError') return;
      }
    }

    const ok = await copyToClipboard(url);
    if (ok) toast.success('Link copied');
    else toast.error('Failed to copy link');
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setSubmitting(true);
    try {
      const { data } = await commentsAPI.create({
        content: commentText,
        postId: post._id,
        parentCommentId: replyTo
      });
      if (replyTo) {
        setComments(prev => prev.map(c => c._id === replyTo
          ? { ...c, replies: [...(c.replies || []), data.comment] }
          : c
        ));
      } else {
        setComments(prev => [{ ...data.comment, replies: [] }, ...prev]);
      }
      setCommentText('');
      setReplyTo(null);
      toast.success('Comment posted!');
    } catch (err) {
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId, parentId = null) => {
    if (!window.confirm('Delete this comment?')) return;
    try {
      await commentsAPI.delete(commentId);
      if (parentId) {
        setComments(prev => prev.map(c => c._id === parentId
          ? { ...c, replies: c.replies.filter(r => r._id !== commentId) }
          : c
        ));
      } else {
        setComments(prev => prev.filter(c => c._id !== commentId));
      }
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const formatDate = (dateStr) => {
    try {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return format(d, 'MMM d, yyyy');
    } catch {
      return '';
    }
  };

  if (loading) return <div className="spinner"><div className="spinner-ring"></div></div>;
  if (!post) return null;

  const postAuthorId = post.author?._id || post.author;
  const currentUserId = user?._id || user?.id;
  const canManagePost = Boolean(currentUserId && postAuthorId && `${postAuthorId}` === `${currentUserId}`);

  return (
    <div className="page">
      <div className="container">
        <div className="post-detail">

          {/* Post Header */}
          <div className="post-hero">
            <span className="post-category">{post.category}</span>
            <h1 style={{ marginTop: '0.75rem' }}>{post.title}</h1>
            <div className="post-meta">
              <Link to={`/profile/${post.author?.username}`} className="author-mini">
                <div className="author-mini-avatar">
                  {post.author?.avatar
                    ? <img src={post.author.avatar} alt={post.author?.username || 'author'} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : post.author?.username?.charAt(0).toUpperCase()
                  }
                </div>
                <strong style={{ color: 'var(--text)' }}>{post.author?.username}</strong>
              </Link>
              <span>{formatDate(post.createdAt)}</span>
              <span>{post.readTime} min read</span>
              <span>👁 {post.views} views</span>
              {post.status === 'draft' && (
                <span className="badge badge-draft">Draft</span>
              )}
            </div>
          </div>

          {/* Cover Image */}
          {post.coverImage && (
            <CoverImage src={post.coverImage} alt={post.title} className="post-cover" fallback={null} />
          )}

          {/* Content */}
          <div
            className="post-content"
            dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br/>') }}
          />

          {/* Tags */}
          {post.tags?.length > 0 && (
            <div className="post-tags">
              {post.tags.map(tag => (
                <Link key={tag} to={`/?tag=${tag}`} className="tag">#{tag}</Link>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            margin: '2rem 0', paddingTop: '1rem',
            borderTop: '1px solid var(--border)', flexWrap: 'wrap'
          }}>
            <button className={`like-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
              ❤️ {likesCount} {likesCount === 1 ? 'like' : 'likes'}
            </button>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleShare}
              aria-label="Share this post"
            >
              🔗 Share
            </button>

            {canManagePost && (
              <>
                <Link
                  to={`/edit/${post._id}`}
                  className="btn btn-secondary btn-sm"
                >
                  ✏️ Edit Post
                </Link>
                <button
                  className="btn btn-danger btn-sm"
                  onClick={handleDelete}
                >
                  🗑 Delete Post
                </button>
              </>
            )}
          </div>

          {/* Author Card */}
            <div className="card" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div className="profile-avatar" style={{ width: '50px', height: '50px', fontSize: '1.2rem' }}>
                  {post.author?.avatar
                    ? <img src={post.author.avatar} alt={post.author?.username || 'author'} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : post.author?.username?.charAt(0).toUpperCase()
                  }
                </div>
                <div>
                  <Link
                    to={`/profile/${post.author?.username}`}
                    style={{ fontWeight: 600, color: 'var(--text)' }}
                >
                  {post.author?.username}
                </Link>
                {post.author?.bio && (
                  <p style={{ fontSize: '0.87rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                    {post.author.bio}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Comments Section */}
          <div className="comments-section">
            <h3 style={{ marginBottom: '1.5rem' }}>
              Comments ({comments.length})
            </h3>

            {user ? (
              <form onSubmit={handleComment} style={{ marginBottom: '2rem' }}>
                {replyTo && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                    Replying to comment ·{' '}
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer' }}
                      onClick={() => setReplyTo(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder={replyTo ? 'Write a reply...' : 'Share your thoughts...'}
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  required
                />
                <button
                  className="btn btn-primary"
                  style={{ marginTop: '0.75rem' }}
                  disabled={submitting}
                >
                  {submitting ? 'Posting...' : replyTo ? 'Post Reply' : 'Post Comment'}
                </button>
              </form>
            ) : (
              <div className="card" style={{ padding: '1.25rem', marginBottom: '2rem', textAlign: 'center' }}>
                <Link to="/login">Sign in</Link> to leave a comment
              </div>
            )}

            {comments.length === 0 ? (
              <div className="empty-state" style={{ padding: '2rem' }}>
                <p>No comments yet. Be the first!</p>
              </div>
            ) : (
              comments.map(comment => (
                <CommentBox
                  key={comment._id}
                  comment={comment}
                  user={user}
                  onDelete={(cid) => handleDeleteComment(cid)}
                  onReply={() => setReplyTo(comment._id)}
                >
                  {comment.replies?.map(reply => (
                    <CommentBox
                      key={reply._id}
                      comment={reply}
                      user={user}
                      onDelete={(cid) => handleDeleteComment(cid, comment._id)}
                      isReply
                    />
                  ))}
                </CommentBox>
              ))
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function CommentBox({ comment, user, onDelete, onReply, isReply, children }) {
  const currentUserId = user?._id || user?.id;
  const authorId = comment.author?._id || comment.author;
  const canDelete = Boolean(currentUserId && authorId && `${currentUserId}` === `${authorId}`) || user?.role === 'admin';

  const formatCommentDate = (dateStr) => {
    try {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return formatDistanceToNow(d, { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className={isReply ? 'replies' : ''}>
      <div className="comment-box">
        <div className="comment-header">
          <div className="comment-avatar">
            {comment.author?.avatar
              ? <img src={comment.author.avatar} alt={comment.author?.username || 'user'} />
              : comment.author?.username?.charAt(0).toUpperCase()
            }
          </div>
          <div>
            <div className="comment-author">{comment.author?.username}</div>
            <div className="comment-date">
              {formatCommentDate(comment.createdAt)}
              {comment.isEdited && ' · edited'}
            </div>
          </div>
        </div>
        <div className="comment-content">{comment.content}</div>
        <div className="comment-actions">
          {!isReply && user && (
            <button className="comment-action-btn" onClick={onReply}>
              ↩ Reply
            </button>
          )}
          {canDelete && (
            <button
              className="comment-action-btn"
              onClick={() => onDelete(comment._id)}
              style={{ color: 'var(--danger)' }}
            >
              Delete
            </button>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
