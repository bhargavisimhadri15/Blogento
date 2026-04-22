import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI, postsAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ username: user.username, bio: user.bio || '', avatar: user.avatar || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const profileInitial = ((profile.username || 'U').trim().charAt(0) || 'U').toUpperCase();

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await authAPI.updateProfile(profile);
      updateUser(data.user);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSaving(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setChangingPw(true);
    try {
      await authAPI.changePassword({ currentPassword: passwords.currentPassword, newPassword: passwords.newPassword });
      toast.success('Password changed!');
      setPasswords({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to change password');
    } finally { setChangingPw(false); }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!deletePassword) {
      toast.error('Enter your password to delete your account');
      return;
    }

    const ok = window.confirm('Delete your account permanently? This will remove your posts and comments. This cannot be undone.');
    if (!ok) return;

    setDeleting(true);
    try {
      await authAPI.deleteAccount({ password: deletePassword });
      toast.success('Account deleted');
      logout();
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete account');
    } finally {
      setDeleting(false);
      setDeletePassword('');
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'avatars');
      const { data } = await postsAPI.uploadImage(formData);
      setProfile(prev => ({ ...prev, avatar: data.url }));
      toast.success('Avatar uploaded. Save profile to apply.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  return (
    <div className="page">
      <div className="container" style={{maxWidth:'640px'}}>
        <h1 style={{marginBottom:'2rem'}}>Account Settings</h1>

        <div className="card" style={{padding:'2rem',marginBottom:'1.5rem'}}>
          <h2 style={{fontSize:'1.2rem',marginBottom:'1.5rem'}}>Profile Information</h2>
          <form onSubmit={handleProfileSave}>
            <div className="form-group">
              <label>Username</label>
              <input className="form-control" value={profile.username}
                onChange={e => setProfile({...profile, username: e.target.value})}
                minLength={3} maxLength={30} required />
            </div>
            <div className="form-group">
              <label>Bio</label>
              <textarea className="form-control" rows={3} value={profile.bio}
                onChange={e => setProfile({...profile, bio: e.target.value})}
                maxLength={200} placeholder="Tell us about yourself" />
            </div>
            <div className="form-group">
              <label>Upload Avatar <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional, max 5MB)</span></label>
              <input className="form-control" type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              {uploadingAvatar && <small style={{color:'var(--text-muted)'}}>Uploading avatar...</small>}
            </div>
            <div className="form-group">
              <label>Avatar URL <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional fallback)</span></label>
              <input className="form-control" value={profile.avatar}
                onChange={e => setProfile({...profile, avatar: e.target.value})}
                placeholder="https://example.com/your-avatar.jpg" />
              <div style={{marginTop:'0.75rem',display:'flex',alignItems:'center',gap:'0.75rem'}}>
                {profile.avatar ? (
                  <img
                    src={profile.avatar}
                    alt="avatar preview"
                    style={{width:'72px',height:'72px',objectFit:'cover',borderRadius:'50%',border:'1px solid var(--border)'}}
                    onError={e => {
                      e.currentTarget.style.display = 'none';
                      const fallback = e.currentTarget.nextElementSibling;
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div
                  style={{
                    width:'72px',
                    height:'72px',
                    borderRadius:'50%',
                    border:'1px solid var(--border)',
                    display: profile.avatar ? 'none' : 'flex',
                    alignItems:'center',
                    justifyContent:'center',
                    background:'var(--surface2)',
                    fontSize:'1.5rem',
                    fontWeight:700
                  }}
                >
                  {profileInitial}
                </div>
              </div>
            </div>
            <button className="btn btn-primary" disabled={saving || uploadingAvatar}>
              {saving ? 'Saving...' : uploadingAvatar ? 'Upload in progress...' : 'Save Profile'}
            </button>
          </form>
        </div>

        <div className="card" style={{padding:'2rem'}}>
          <h2 style={{fontSize:'1.2rem',marginBottom:'1.5rem'}}>Change Password</h2>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label>Current Password</label>
              <input className="form-control" type="password" value={passwords.currentPassword}
                onChange={e => setPasswords({...passwords, currentPassword: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>New Password</label>
              <input className="form-control" type="password" value={passwords.newPassword}
                onChange={e => setPasswords({...passwords, newPassword: e.target.value})} required minLength={6} />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input className="form-control" type="password" value={passwords.confirm}
                onChange={e => setPasswords({...passwords, confirm: e.target.value})} required />
            </div>
            <button className="btn btn-secondary" disabled={changingPw}>
              {changingPw ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        <div className="card" style={{ padding: '2rem', marginTop: '1.5rem', borderColor: 'rgba(239,68,68,0.35)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.25rem', color: 'var(--danger)' }}>Danger Zone</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.25rem', fontSize: '0.9rem' }}>
            Delete your account permanently. This will remove your posts and comments.
          </p>
          <form onSubmit={handleDeleteAccount}>
            <div className="form-group">
              <label>Confirm Password</label>
              <input
                className="form-control"
                type="password"
                value={deletePassword}
                onChange={e => setDeletePassword(e.target.value)}
                required
                placeholder="Enter your password"
              />
            </div>
            <button className="btn btn-danger" disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete Account'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
