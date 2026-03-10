import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usersAPI } from '../utils/api';
import { format } from 'date-fns';

export default function Profile() {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await usersAPI.getProfile(username);
        setData(data);
      } catch (err) {
        console.error('Profile error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [username]);

  if (loading) return <div className="spinner"><div className="spinner-ring"></div></div>;
  if (!data) return (
    <div className="page">
      <div className="container">
        <div className="empty-state"><h3>User not found</h3></div>
      </div>
    </div>
  );

  const { user, posts } = data;

  const formatDate = (dateStr) => {
    try {
      if (!dateStr) return 'Recently';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return 'Recently';
      return format(d, 'MMMM yyyy');
    } catch {
      return 'Recently';
    }
  };

  const formatPostDate = (dateStr) => {
    try {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      return format(d, 'MMM d, yyyy');
    } catch {
      return '';
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="profile-header">
          <div className="profile-avatar">
            {user.avatar
              ? <img src={user.avatar} alt={user.username} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} />
              : user.username.charAt(0).toUpperCase()
            }
          </div>
          <div>
            <h1 style={{ fontSize:'1.8rem' }}>{user.username}</h1>
            {user.bio && (
              <p style={{ color:'var(--text-muted)', marginTop:'0.4rem' }}>{user.bio}</p>
            )}
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:'0.5rem' }}>
              Joined {formatDate(user.createdAt)} · {posts.length} post{posts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <h2 style={{ marginBottom:'1.5rem' }}>Posts by {user.username}</h2>

        {posts.length === 0 ? (
          <div className="empty-state">
            <p>No posts published yet</p>
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map(post => (
              <div key={post._id} className="card post-card">
                <div className="post-card-img">
                  {post.coverImage
                    ? <img src={post.coverImage} alt={post.title} />
                    : <span>✍️</span>
                  }
                </div>
                <div className="post-card-body">
                  <span className="post-category">{post.category}</span>
                  <div className="post-card-title">
                    <Link to={`/post/${post.slug || post._id}`}>{post.title}</Link>
                  </div>
                  {post.excerpt && (
                    <p className="post-excerpt">{post.excerpt}</p>
                  )}
                  <div className="post-card-footer">
                    <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>
                      {formatPostDate(post.createdAt)}
                    </span>
                    <span style={{ fontSize:'0.8rem', color:'var(--text-muted)' }}>
                      👁 {post.views || 0} · 💬 {post.commentCount || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
