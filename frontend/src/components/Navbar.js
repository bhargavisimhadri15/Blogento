import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-brand">
          BLOG<span>ENTO</span>
        </Link>
        <div className="navbar-links">
          <Link to="/" className="nav-link">Explore</Link>
          {user ? (
            <div className="nav-user">
              <Link to="/create" className="btn btn-primary btn-sm">+ Write</Link>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to={`/profile/${user.username}`} className="nav-avatar" title={user.username}>
                {user.avatar
                  ? <img src={user.avatar} alt={user.username} style={{width:'100%',height:'100%',borderRadius:'50%',objectFit:'cover'}} />
                  : user.username.charAt(0).toUpperCase()
                }
              </Link>
              <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Logout</button>
            </div>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get Started</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
