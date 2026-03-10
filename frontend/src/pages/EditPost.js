import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { postsAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Lifestyle', 'Travel', 'Food', 'Health', 'Other'];

export default function EditPost() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPost = async () => {
      if (!user || user.role !== 'admin') {
        toast.error('Admin only');
        navigate('/');
        setLoading(false);
        return;
      }

      try {
        const { data } = await postsAPI.getById(id);
        const post = data.post;
        console.log('Post loaded:', post._id);
        console.log('Post author:', post.author);
        console.log('Current user:', user);

        setForm({
          title: post.title || '',
          content: post.content || '',
          excerpt: post.excerpt || '',
          coverImage: post.coverImage || '',
          tags: post.tags?.join(', ') || '',
          category: post.category || 'Other',
          status: post.status || 'published'
        });
      } catch (err) {
        console.error('Load post error:', err);
        toast.error('Failed to load post');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchPost();
  }, [id, user, navigate]);

  const handleChange = e => {
    setError('');
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const { data } = await postsAPI.uploadImage(formData);
      setForm(prev => ({ ...prev, coverImage: data.url }));
      toast.success('Image uploaded successfully');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image');
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.title || form.title.length < 5) {
      setError('Title must be at least 5 characters');
      return;
    }
    if (!form.content || form.content.length < 20) {
      setError('Content must be at least 20 characters');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags
          ? form.tags.split(',').map(t => t.trim()).filter(Boolean)
          : []
      };
      console.log('Updating post:', id, payload);
      const { data } = await postsAPI.update(id, payload);
      console.log('Update response:', data);
      toast.success('Post updated successfully!');
      navigate(`/post/${data.post.slug || data.post._id}`);
    } catch (err) {
      console.error('Update error:', err.response?.data || err.message);
      setError(err.response?.data?.message || 'Failed to update post');
      toast.error(err.response?.data?.message || 'Failed to update post');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="spinner">
      <div className="spinner-ring"></div>
    </div>
  );

  if (!form) return null;

  return (
    <div className="page">
      <div className="container">
        <div className="editor-page">

          <div className="editor-toolbar">
            <h1 style={{ fontSize: '1.8rem' }}>Edit Post</h1>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(-1)}
              >
                Cancel
              </button>
              <button
                type="submit"
                form="editForm"
                className="btn btn-primary"
                disabled={saving || uploadingImage}
              >
                {saving ? 'Saving...' : uploadingImage ? 'Uploading image...' : 'Save Changes'}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert alert-error" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span>{error}</span>
              <button
                onClick={() => setError('')}
                style={{
                  background: 'none', border: 'none',
                  color: 'inherit', cursor: 'pointer', fontSize: '1.2rem'
                }}
              >×</button>
            </div>
          )}

          <form id="editForm" onSubmit={handleSubmit}>
            <div className="editor-content">

              <div className="form-group">
                <label>Title *</label>
                <input
                  className="form-control"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Your post title..."
                  style={{ fontSize: '1.1rem' }}
                  required
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  className="form-control"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  style={{ width: 'auto' }}
                >
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </div>

              <div className="form-group">
                <label>Content *</label>
                <textarea
                  className="form-control"
                  name="content"
                  value={form.content}
                  onChange={handleChange}
                  placeholder="Write your post content here..."
                  rows={16}
                  required
                />
              </div>

              <div className="editor-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    className="form-control"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tags <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(comma-separated)</span></label>
                  <input
                    className="form-control"
                    name="tags"
                    value={form.tags}
                    onChange={handleChange}
                    placeholder="e.g. javascript, react, web"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Upload Cover Image <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional, max 5MB)</span></label>
                <input
                  className="form-control"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                {uploadingImage && (
                  <small style={{ color: 'var(--text-muted)' }}>Uploading image...</small>
                )}
              </div>

              <div className="form-group">
                <label>Cover Image URL <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional fallback)</span></label>
                <input
                  className="form-control"
                  name="coverImage"
                  value={form.coverImage}
                  onChange={handleChange}
                  placeholder="https://example.com/image.jpg"
                />
                {form.coverImage && (
                  <img
                    src={form.coverImage}
                    alt="preview"
                    style={{
                      marginTop: '0.75rem', width: '100%',
                      height: '180px', objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                    onError={e => e.target.style.display = 'none'}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Excerpt <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(optional)</span></label>
                <textarea
                  className="form-control"
                  name="excerpt"
                  value={form.excerpt}
                  onChange={handleChange}
                  placeholder="Brief summary of your post..."
                  rows={3}
                />
              </div>

            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
