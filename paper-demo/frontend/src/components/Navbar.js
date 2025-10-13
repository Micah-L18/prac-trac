import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';

const Navbar = () => {
  const { user, logout, isAuthenticated, token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [showTeamDropdown, setShowTeamDropdown] = useState(false);
  
  // Get current path for active nav highlighting
  const currentPath = window.location.pathname;

  useEffect(() => {
    if (isAuthenticated && token) {
      fetchTeams();
      fetchActiveTeam();
    }
  }, [isAuthenticated, token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showTeamDropdown && !event.target.closest('.team-selector')) {
        setShowTeamDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTeamDropdown]);

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const fetchActiveTeam = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveTeam(data.data);
      } else {
        setActiveTeam(null);
      }
    } catch (error) {
      console.error('Error fetching active team:', error);
      setActiveTeam(null);
    }
  };

  const selectTeam = async (teamId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/activate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchActiveTeam();
        setShowTeamDropdown(false);
        // Refresh page to update all components
        window.location.reload();
      }
    } catch (error) {
      console.error('Error setting active team:', error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <nav className="nav-container">
      <div className="nav-glass">
        <a href="#" className="logo">🏐 PracTrac</a>
        
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
            {/* Team Selector */}
            {teams.length > 0 && (
              <div className="team-selector" style={{ position: 'relative', marginLeft: '2rem' }}>
                <button
                  className="glass-button secondary"
                  onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem',
                    minWidth: '200px',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    🏐 {activeTeam ? `${activeTeam.name} (${activeTeam.season})` : 'Select Team'}
                  </span>
                  <span style={{ fontSize: '0.8rem' }}>▼</span>
                </button>
                
                {showTeamDropdown && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    background: 'var(--glass-primary)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    zIndex: 1000,
                    marginTop: '0.25rem',
                    maxHeight: '300px',
                    overflowY: 'auto'
                  }}>
                    {teams.map(team => (
                      <button
                        key={team.id}
                        onClick={() => selectTeam(team.id)}
                        style={{
                          width: '100%',
                          padding: '0.75rem 1rem',
                          border: 'none',
                          background: activeTeam?.id === team.id ? 'var(--accent-orange)' : 'transparent',
                          color: activeTeam?.id === team.id ? 'white' : 'var(--text-primary)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          borderBottom: '1px solid var(--glass-border)',
                          fontSize: '0.9rem'
                        }}
                        onMouseEnter={(e) => {
                          if (activeTeam?.id !== team.id) {
                            e.target.style.background = 'var(--glass-secondary)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (activeTeam?.id !== team.id) {
                            e.target.style.background = 'transparent';
                          }
                        }}
                      >
                        <div style={{ fontWeight: 'bold' }}>{team.name}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>{team.season}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <ul className="nav-links" style={{ marginLeft: 'auto' }}>
              <li><a href="/dashboard" className={currentPath === '/dashboard' ? 'active' : ''}>Dashboard</a></li>
              <li><a href="/teams" className={currentPath === '/teams' ? 'active' : ''}>Teams</a></li>
              
              {/* Show practice-related navigation only when team is selected */}
              {activeTeam && (
                <li><a href="/practices" className={currentPath === '/practices' ? 'active' : ''}>Practices</a></li>
              )}
              
              <li><a href="/drills" className={currentPath === '/drills' ? 'active' : ''}>Drills</a></li>
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
          </div>
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