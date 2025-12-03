import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const xpBadgeRef = useRef(null);
  const prevXpRef = useRef(user?.total_xp || 0);

  useEffect(() => {
    if (user && user.total_xp !== prevXpRef.current) {
      prevXpRef.current = user.total_xp;
      // Trigger animation by adding/removing class
      if (xpBadgeRef.current) {
        xpBadgeRef.current.classList.add('xp-updated');
        setTimeout(() => {
          if (xpBadgeRef.current) {
            xpBadgeRef.current.classList.remove('xp-updated');
          }
        }, 600);
      }
    }
  }, [user?.total_xp]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark">
      <div className="container-fluid">
        <Link className="navbar-brand" to={user ? "/dashboard" : "/login"}>
          <i className="bi bi-shield-lock"></i> CyberEscapeRoom
        </Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {user && (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/dashboard">Dashboard</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/quiz">Take Quiz</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/leaderboard">Leaderboard</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/upload">Upload Questions</Link>
                </li>
                {user.role === 'admin' && (
                  <li className="nav-item">
                    <Link className="nav-link" to="/admin">Admin Panel</Link>
                  </li>
                )}
              </>
            )}
          </ul>
          <ul className="navbar-nav">
            {user ? (
              <>
                <li className="nav-item">
                  <span className="navbar-text me-3">
                    <span ref={xpBadgeRef} className="xp-badge">
                      <i className="bi bi-star-fill"></i> {user.username} - {user.total_xp} XP
                    </span>
                  </span>
                </li>
                <li className="nav-item">
                  <button className="btn btn-link nav-link" onClick={handleLogout}>Logout</button>
                </li>
              </>
            ) : (
              <>
                <li className="nav-item">
                  <Link className="nav-link" to="/login">Login</Link>
                </li>
                <li className="nav-item">
                  <Link className="nav-link" to="/register">Register</Link>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;

