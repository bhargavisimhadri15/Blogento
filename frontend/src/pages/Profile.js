import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { authAPI, postsAPI, usersAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import CoverImage from '../components/CoverImage';
import toast from 'react-hot-toast';

export default function Profile() {
  const { username } = useParams();
  const { user: authUser, updateUser } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
  const displayUsername = (user.username || 'User').trim() || 'User';
  const profileInitial = displayUsername.charAt(0).toUpperCase() || '?';
  const isMe = Boolean(authUser?.username && authUser.username === user.username);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'avatars');

      const { data: upload } = await postsAPI.uploadImage(formData);
      await authAPI.updateProfile({ avatar: upload.url });

      updateUser({ avatar: upload.url });
      setData(prev => (prev ? { ...prev, user: { ...prev.user, avatar: upload.url } } : prev));
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update profile photo');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

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
              ? <img src={user.avatar} alt={displayUsername} style={{ width:'100%', height:'100%', borderRadius:'50%', objectFit:'cover' }} />
              : profileInitial
            }
          </div>
          <div>
            <h1 style={{ fontSize:'1.8rem' }}>{displayUsername}</h1>
            {isMe && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.6rem', flexWrap: 'wrap' }}>
                <label className="btn btn-secondary" style={{ margin: 0, cursor: uploadingAvatar ? 'not-allowed' : 'pointer' }}>
                  {uploadingAvatar ? 'Uploading...' : 'Change photo'}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                    style={{ display: 'none' }}
                  />
                </label>
                <Link to="/settings" className="btn btn-secondary">Edit profile</Link>
              </div>
            )}
            {user.bio && (
              <p style={{ color:'var(--text-muted)', marginTop:'0.4rem' }}>{user.bio}</p>
            )}
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem', marginTop:'0.5rem' }}>
              Joined {formatDate(user.createdAt)} · {posts.length} post{posts.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <h2 style={{ marginBottom:'1.5rem' }}>Posts by {displayUsername}</h2>

        {posts.length === 0 ? (
          <div className="empty-state">
            <p>No posts published yet</p>
          </div>
        ) : (
          <div className="posts-grid">
            {posts.map(post => (
                <div key={post._id} className="card post-card">
                  <div className="post-card-img">
                    <CoverImage src={post.coverImage} alt={post.title} fallback="✍️" />
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
                    <div className="post-card-meta" aria-label="post meta">
                      <span className="post-card-meta-item">👁 {post.views || 0}</span>
                      <span className="post-card-meta-item post-card-meta-comments">
                        💬 {post.commentCount || 0}
                      </span>
                    </div>
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
