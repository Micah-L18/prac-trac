import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  
  // Get current path for active nav highlighting
  const currentPath = window.location.pathname;

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="nav-container">
      <div className="nav-glass">
        <a href="#" className="logo">🏐 PracTrac</a>
        
        {isAuthenticated ? (
          <ul className="nav-links">
            <li><a href="/dashboard" className={currentPath === '/dashboard' ? 'active' : ''}>Dashboard</a></li>
            <li><a href="/teams" className={currentPath === '/teams' ? 'active' : ''}>Teams</a></li>
            <li><a href="/drills" className={currentPath === '/drills' ? 'active' : ''}>Drills</a></li>
            <li><a href="/practices" className={currentPath === '/practices' ? 'active' : ''}>Practices</a></li>
            <li><a href="/past-practices" className={currentPath === '/past-practices' ? 'active' : ''}>Past Practices</a></li>
            {/* <li><a href="/players">Players</a></li>
            <li><a href="/profile">Profile</a></li> */}
            <li><a href="/settings" className={currentPath === '/settings' ? 'active' : ''}>Settings</a></li>
            <li>
              <button 
                className="glass-button danger" 
                onClick={handleLogout}
                style={{ marginLeft: '16px' }}
              >
                Logout
              </button>
            </li>
          </ul>
        ) : (
          <ul className="nav-links">
            <li><a href="/login">Login</a></li>
            <li><a href="/register">Register</a></li>
          </ul>
        )}
      </div>
    </nav>
  );
};

export default Navbar;