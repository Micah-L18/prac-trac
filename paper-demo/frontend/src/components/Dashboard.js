import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import Navbar from './Navbar';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [practices, setPractices] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch teams and practices on component mount
  useEffect(() => {
    fetchTeams();
    fetchActiveTeam();
    fetchRecentPractices();
    checkActiveSession();
  }, []);

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
        await fetchRecentPractices(); // Refresh practices for new team
      }
    } catch (error) {
      console.error('Error setting active team:', error);
    }
  };

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
        setTeams(data.data);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentPractices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/practices/active-team`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPractices(data.data?.slice(0, 3) || []); // Get only 3 most recent
      } else {
        setPractices([]);
      }
    } catch (error) {
      console.error('Error fetching practices:', error);
      setPractices([]);
    }
  };

  const checkActiveSession = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/practice-sessions/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setActiveSession(data.data);
      }
    } catch (error) {
      console.error('Error checking active session:', error);
    }
  };

  return (
    <>
      <Navbar />
      
      {/* Active Practice Session Banner */}
      {activeSession && (
        <div style={{
          background: 'linear-gradient(135deg, var(--accent-orange) 0%, #ff8a65 100%)',
          color: 'white',
          padding: 'var(--spacing-md)',
          textAlign: 'center',
          borderBottom: '1px solid var(--glass-border)',
          marginBottom: '1rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>🏐 Active Practice Session</h3>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>
                {activeSession.practice_name} • Started: {new Date(activeSession.started_at).toLocaleTimeString()}
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/practice-mode'}
              style={{
                background: 'rgba(255, 255, 255, 0.2)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                color: 'white',
                padding: '8px 16px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              Resume Session
            </button>
          </div>
        </div>
      )}

      <div className="main-container">
        <div className="dashboard-header">
          <h1>Welcome to PracTrac, {user?.first_name}!</h1>
          <p>Elite Volleyball Practice Management at Your Fingertips</p>
        </div>

        {/* Team Selection Alert - Show prominently when no active team */}
        {teams.length > 0 && !activeTeam && (
          <div style={{
            background: 'linear-gradient(135deg, var(--accent-orange) 0%, #ff8a65 100%)',
            color: 'white',
            padding: 'var(--spacing-lg)',
            borderRadius: '8px',
            textAlign: 'center',
            marginBottom: '2rem',
            border: '1px solid rgba(255, 107, 53, 0.3)'
          }}>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.5rem' }}>⚠️ Select Your Team</h2>
            <p style={{ margin: '0 0 1.5rem 0', fontSize: '1.1rem', opacity: 0.9 }}>
              You need to select an active team before you can create practice plans and manage sessions.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => selectTeam(team.id)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    color: 'white',
                    padding: '0.75rem 1.5rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 'bold',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  🏐 {team.name} ({team.season})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active Team Display */}
        {activeTeam && (
          <div style={{
            background: 'var(--glass-secondary)',
            border: '1px solid var(--accent-orange)',
            borderRadius: '8px',
            padding: 'var(--spacing-md)',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span style={{ fontSize: '1.5rem' }}>🏐</span>
              <div>
                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>
                  {activeTeam.name}
                </h3>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  {activeTeam.season} • Active Team
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button 
                className="glass-button secondary"
                onClick={() => window.location.href = '/teams'}
                style={{ fontSize: '0.9rem' }}
              >
                Manage Roster
              </button>
              {teams.length > 1 && (
                <select
                  value={activeTeam.id}
                  onChange={(e) => selectTeam(e.target.value)}
                  style={{
                    background: 'var(--glass-tertiary)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '4px',
                    color: 'var(--text-primary)',
                    padding: '0.5rem',
                    fontSize: '0.9rem'
                  }}
                >
                  {teams.map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name} ({team.season})
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {/* Teams Overview */}
        <div className="glass-card" style={{ marginBottom: '3rem' }}>
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
            🏐 Your Teams
          </h3>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading teams...</p>
          ) : teams.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                No teams created yet. Start by creating your first team!
              </p>
              <button 
                className="glass-button primary"
                onClick={() => window.location.href = '/teams'}
              >
                Create First Team
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                You have {teams.length} active team{teams.length !== 1 ? 's' : ''}:
              </p>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {teams.slice(0, 3).map(team => (
                  <div key={team.id} style={{ 
                    background: 'rgba(255, 122, 0, 0.1)', 
                    border: '1px solid rgba(255, 122, 0, 0.3)',
                    borderRadius: '0px',
                    padding: '0.5rem 1rem',
                    color: 'var(--accent-orange)'
                  }}>
                    {team.name} ({team.season})
                  </div>
                ))}
                {teams.length > 3 && (
                  <div style={{ 
                    color: 'var(--text-secondary)',
                    padding: '0.5rem 1rem',
                    fontStyle: 'italic'
                  }}>
                    +{teams.length - 3} more
                  </div>
                )}
              </div>
              <button 
                className="glass-button secondary"
                onClick={() => window.location.href = '/teams'}
              >
                Manage All Teams
              </button>
            </div>
          )}
        </div>

        {/* Practice Overview - Only show when team is selected */}
        {activeTeam && (
          <div className="glass-card" style={{ marginBottom: '3rem' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
              📋 Recent Practice Plans for {activeTeam.name}
            </h3>
          {loading ? (
            <p style={{ color: 'var(--text-secondary)' }}>Loading practices...</p>
          ) : practices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                No practice plans created yet. Start planning your first practice!
              </p>
              <button 
                className="glass-button primary"
                onClick={() => window.location.href = '/practices'}
              >
                Create First Practice Plan
              </button>
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                Your {practices.length} most recent practice plans:
              </p>
              <div style={{ display: 'grid', gap: '1rem', marginBottom: '1rem' }}>
                {practices.map(practice => (
                  <div key={practice.id} style={{ 
                    background: 'var(--glass-secondary)', 
                    border: '1px solid var(--glass-border)',
                    borderRadius: '6px',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => window.location.href = '/practices'}
                  onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                  onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)' }}>
                          {practice.name}
                        </h4>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          <span>📅 {new Date(practice.date).toLocaleDateString()}</span>
                          <span>⏱️ {practice.estimated_duration} min</span>
                          <span>🎯 {practice.phase_count || 0} phases</span>
                        </div>
                      </div>
                      <button 
                        className="glass-button primary"
                        style={{ fontSize: '0.8rem', padding: '0.5rem 1rem' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.location.href = `/practice-mode?practiceId=${practice.id}`;
                        }}
                      >
                        ▶️ Start
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                className="glass-button secondary"
                onClick={() => window.location.href = '/practices'}
              >
                View All Practice Plans
              </button>
            </div>
          )}
          </div>
        )}

        <div className="dashboard-grid">
          <div className="dashboard-card" onClick={() => window.location.href = '/teams'}>
            <h3>🏐 Team Management</h3>
            <p>Create and manage multiple teams with detailed player rosters, positions, and skill tracking. Set up your coaching structure.</p>
          </div>

          {activeTeam && (
            <div className="dashboard-card" onClick={() => window.location.href = '/practices'}>
              <h3>📋 Practice Planning</h3>
              <p>Design structured practice sessions with phases, drills, and objectives. Start and manage active practice sessions.</p>
            </div>
          )}

          <div className="dashboard-card" onClick={() => window.location.href = '/drills'}>
            <h3>🎯 Drill Library</h3>
            <p>Access and create custom volleyball drills organized by category, difficulty, and skill focus areas.</p>
          </div>

          <div className="dashboard-card" onClick={() => window.location.href = '/settings'}>
            <h3>⚙️ Settings</h3>
            <p>Configure your coaching profile, team preferences, and application settings.</p>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            {activeTeam && (
              <button 
                className="glass-button primary"
                onClick={() => window.location.href = '/practices'}
              >
                Create Practice Plan
              </button>
            )}
            <button 
              className="glass-button"
              onClick={() => window.location.href = '/drills'}
            >
              Create Drill
            </button>
            <button 
              className="glass-button"
              onClick={() => window.location.href = '/teams'}
            >
              {activeTeam ? 'Manage Players' : 'Create Team'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
