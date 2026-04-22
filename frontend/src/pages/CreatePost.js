import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { postsAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { compressImageFile } from '../utils/image';

const CATEGORIES = ['Technology', 'Design', 'Business', 'Lifestyle', 'Travel', 'Food', 'Health', 'Other'];

export default function CreatePost() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', content: '', excerpt: '', coverImage: '',
    tags: '', category: 'Other', status: 'published'
  });
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setUploadingImage(true);

    try {
      const toastId = toast.loading('Optimizing image...');
      let uploadFile = file;
      let compressCode = 'skip';
      try {
        const result = await compressImageFile(file, { maxWidth: 1600, maxHeight: 1600, maxBytes: 1_800_000 });
        uploadFile = result.file || file;
        compressCode = result.code || 'skip';
      } finally {
        toast.dismiss(toastId);
      }

      const HARD_MAX_BYTES = 5 * 1024 * 1024;
      const PUBLIC_MAX_BYTES = 2 * 1024 * 1024;

      if (compressCode === 'decode_failed') {
        const isHeic = /heic|heif/i.test(file.type) || /\.heic$/i.test(file.name) || /\.heif$/i.test(file.name);
        if (isHeic) {
          throw new Error('HEIC images are not supported on some devices. Please change camera to JPEG/PNG (Most Compatible) or choose another image.');
        }
      }

      if (uploadFile.size > HARD_MAX_BYTES) {
        throw new Error('Image is too large (max 5MB). Please choose a smaller image.');
      }
      if (uploadFile.size > PUBLIC_MAX_BYTES) {
        throw new Error('Image is still too large for the public site (max ~2MB). Please choose a smaller image.');
      }

      const formData = new FormData();
      formData.append('image', uploadFile);

      const { data } = await postsAPI.uploadImage(formData);
      setForm(prev => ({ ...prev, coverImage: data.url }));
      toast.success(data.storage === 'inline' ? 'Image uploaded (optimized)' : 'Image uploaded successfully');
    } catch (err) {
      const message =
        err.response?.data?.message ||
        (err.code === 'ECONNABORTED' ? 'Upload timed out. Please try a smaller image or a faster network.' : null) ||
        (err.message === 'Network Error' ? 'Network error while uploading. Please check your connection and try again.' : null) ||
        err.message ||
        'Failed to upload image';
      setError(message);
      toast.error(message);
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.title.length < 5) { setError('Title must be at least 5 characters'); return; }
    if (form.content.length < 20) { setError('Content must be at least 20 characters'); return; }

    setLoading(true);
    try {
      const payload = {
        ...form,
        tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };
      const { data } = await postsAPI.create(payload);
      toast.success('Post published! 🎉');
      navigate(`/post/${data.post.slug || data.post._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create post');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className="editor-page">
          <div className="editor-toolbar">
            <h1 style={{fontSize:'1.8rem'}}>New Post</h1>
            <div style={{display:'flex', gap:'0.75rem'}}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setForm(f => ({ ...f, status: 'draft' }));
                  setTimeout(() => document.getElementById('postForm').requestSubmit(), 50);
                }}
              >Save as Draft</button>
              <button type="submit" form="postForm" className="btn btn-primary" disabled={loading || uploadingImage}>
                {loading ? 'Publishing...' : uploadingImage ? 'Uploading image...' : 'Publish Post'}
              </button>
            </div>
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <form id="postForm" onSubmit={handleSubmit}>
            <div className="editor-content">
              <div className="form-group">
                <label>Title *</label>
                <input className="form-control" name="title" value={form.title} onChange={handleChange}
                  placeholder="Your post title..." style={{fontSize:'1.1rem'}} required />
              </div>

              <div className="form-group">
                <label>Content *</label>
                <textarea className="form-control" name="content" value={form.content} onChange={handleChange}
                  placeholder="Write your post content here..." rows={16} required />
              </div>

              <div className="editor-row">
                <div className="form-group">
                  <label>Category</label>
                  <select className="form-control" name="category" value={form.category} onChange={handleChange}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Tags <span style={{color:'var(--text-muted)',fontWeight:400}}>(comma-separated)</span></label>
                  <input className="form-control" name="tags" value={form.tags} onChange={handleChange}
                    placeholder="e.g. javascript, react, web" />
                </div>
              </div>

              <div className="form-group">
                <label>Upload Cover Image <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional, auto-optimized for mobile)</span></label>
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
                <label>Cover Image URL <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional fallback)</span></label>
                <input className="form-control" name="coverImage" value={form.coverImage} onChange={handleChange}
                  placeholder="https://example.com/image.jpg" />
                {form.coverImage && (
                  <img
                    src={form.coverImage}
                    alt="preview"
                    style={{
                      marginTop: '0.75rem',
                      width: '100%',
                      height: '180px',
                      objectFit: 'cover',
                      borderRadius: '8px'
                    }}
                    onError={e => e.target.style.display = 'none'}
                  />
                )}
              </div>

              <div className="form-group">
                <label>Excerpt <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional – auto-generated if empty)</span></label>
                <textarea className="form-control" name="excerpt" value={form.excerpt} onChange={handleChange}
                  placeholder="Brief summary of your post..." rows={3} />
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
