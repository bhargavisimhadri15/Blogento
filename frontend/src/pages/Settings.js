import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState({ username: user.username, bio: user.bio || '', avatar: user.avatar || '' });
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

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
              <label>Avatar URL</label>
              <input className="form-control" value={profile.avatar}
                onChange={e => setProfile({...profile, avatar: e.target.value})}
                placeholder="https://example.com/your-avatar.jpg" />
            </div>
            <button className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Profile'}
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
      </div>
    </div>
  );
}
