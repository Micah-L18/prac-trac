import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import Profile from './Profile';
import UserSettings from './UserSettings';
import Teams from './Teams';
import TeamPlayers from './TeamPlayers';
import Drills from './Drills';
import Practices from './Practices';
import PracticeMode from './PracticeMode';

const Router = () => {
  const { isAuthenticated, loading } = useAuth();
  
  // Get current path
  const path = window.location.pathname;

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)',
        color: 'var(--text-primary)'
      }}>
        <div className="loading">
          <div className="spinner"></div>
          Loading PracTrac...
        </div>
      </div>
    );
  }

  // If not authenticated, show auth pages
  if (!isAuthenticated) {
    if (path === '/register') {
      return <Register />;
    }
    return <Login />;
  }

  // If authenticated, show app pages
  switch (path) {
    case '/settings':
      return <UserSettings />;
    case '/teams':
      return <Teams />;
    case '/drills':
      return <Drills />;
    case '/practices':
      return <Practices />;
    case '/practice-mode':
      return <PracticeMode />;
    case '/profile':
      return <Profile />;
    case '/dashboard':
      return <Dashboard />;
    case '/':
    default:
      // Check if it's a team players route
      if (path.match(/^\/teams\/\d+\/players$/)) {
        return <TeamPlayers />;
      }
      return <UserSettings />; // Redirect to settings after login
  }
};

export default Router;