import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Register() {
  const [form, setForm] = useState({ username: '', email: '', password: '', bio: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
      setError('Username can only contain letters, numbers, and underscores');
      return;
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setLoading(true);
    try {
      await register(form);
      toast.success('Account created! Welcome to BLOGENTO ðŸŽ‰');
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Join BLOGENTO</h1>
        <p className="subtitle">Create your free account and start writing</p>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username <span style={{color:'var(--text-muted)',fontWeight:400}}>(letters, numbers, underscore)</span></label>
            <input
              className="form-control"
              name="username"
              value={form.username}
              onChange={handleChange}
              required
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9_]+"
              title="Use only letters, numbers, and underscores"
              placeholder="e.g. john_doe"
            />
          </div>
          <div className="form-group">
            <label>Email address</label>
            <input className="form-control" type="email" name="email" value={form.email} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Password <span style={{color:'var(--text-muted)',fontWeight:400}}>(min. 6 characters)</span></label>
            <input className="form-control" type="password" name="password" value={form.password} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Bio <span style={{color:'var(--text-muted)',fontWeight:400}}>(optional)</span></label>
            <input className="form-control" name="bio" value={form.bio} onChange={handleChange} maxLength={200} placeholder="Tell us a little about yourself" />
          </div>
          <button className="btn btn-primary" style={{width:'100%'}} disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <div className="divider">or</div>
        <p style={{textAlign:'center', fontSize:'0.9rem', color:'var(--text-muted)'}}>
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}

