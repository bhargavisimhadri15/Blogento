import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { postsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      const { data } = await postsAPI.getMyPosts();
      setPosts(data.posts);
    } catch { toast.error('Failed to load posts'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this post permanently?')) return;
    try {
      await postsAPI.delete(id);
      setPosts(p => p.filter(post => post._id !== id));
      toast.success('Post deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const published = posts.filter(p => p.status === 'published');
  const drafts = posts.filter(p => p.status === 'draft');
  const totalViews = posts.reduce((sum, p) => sum + (p.views || 0), 0);
  const totalLikes = posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0);

  return (
    <div className="page">
      <div className="container">
        <div className="dashboard-header">
          <div>
            <h1>My Dashboard</h1>
            <p style={{color:'var(--text-muted)',marginTop:'0.25rem'}}>Welcome back, {user.username} ✍️</p>
          </div>
          <Link to="/create" className="btn btn-primary">+ New Post</Link>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-number">{posts.length}</div>
            <div className="stat-label">Total Posts</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{published.length}</div>
            <div className="stat-label">Published</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{drafts.length}</div>
            <div className="stat-label">Drafts</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalViews}</div>
            <div className="stat-label">Total Views</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{totalLikes}</div>
            <div className="stat-label">Total Likes</div>
          </div>
        </div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1rem'}}>
          <h2 style={{fontSize:'1.2rem'}}>Your Posts</h2>
        </div>

        {loading ? (
          <div className="spinner"><div className="spinner-ring"></div></div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <h3>No posts yet</h3>
            <p>Write your first post to get started</p>
            <Link to="/create" className="btn btn-primary" style={{marginTop:'1rem'}}>Create Post</Link>
          </div>
        ) : (
          posts.map(post => (
            <div key={post._id} className="post-row">
              <div className="post-row-info">
                <div className="post-row-title">
                  <Link to={`/post/${post.slug || post._id}`} style={{color:'var(--text)',textDecoration:'none'}}>
                    {post.title}
                  </Link>
                </div>
                <div className="post-row-meta">
                  {format(new Date(post.createdAt), 'MMM d, yyyy')} ·{' '}
                  {post.category} ·{' '}
                  👁 {post.views || 0} · ❤️ {post.likes?.length || 0} ·{' '}
                  💬 {post.commentCount || 0}
                  {' '}· <span className={`badge badge-${post.status}`}>{post.status}</span>
                </div>
              </div>
              <div className="post-row-actions">
                <Link to={`/edit/${post._id}`} className="btn btn-secondary btn-sm">Edit</Link>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(post._id)}>Delete</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
