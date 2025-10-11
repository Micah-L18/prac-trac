import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import Navbar from './Navbar';

const Dashboard = () => {
  const { user, token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch teams on component mount
  useEffect(() => {
    fetchTeams();
  }, []);

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

  return (
    <>
      <Navbar />
      <div className="main-container">
        <div className="dashboard-header">
          <h1>Welcome to PracTrac, {user?.first_name}!</h1>
          <p>Elite Volleyball Practice Management at Your Fingertips</p>
        </div>

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

        <div className="dashboard-grid">
          <div className="dashboard-card" onClick={() => window.location.href = '/teams'}>
            <h3>🏐 Team Management</h3>
            <p>Create and manage multiple teams with detailed player rosters, positions, and skill tracking. Set up your coaching structure.</p>
          </div>

          <div className="dashboard-card" onClick={() => window.location.href = '/practices'}>
            <h3>📋 Practice Planning</h3>
            <p>Design comprehensive practice sessions with drills, phases, and detailed timing. Build structured training programs.</p>
          </div>

          <div className="dashboard-card" onClick={() => window.location.href = '/players'}>
            <h3>👥 Player Management</h3>
            <p>Track individual player progress, attendance, and performance metrics. Manage roster information and notes.</p>
          </div>

          <div className="dashboard-card" onClick={() => window.location.href = '/drills'}>
            <h3>🎯 Drill Library</h3>
            <p>Access and create custom volleyball drills organized by category, difficulty, and skill focus areas.</p>
          </div>

          <div className="dashboard-card" onClick={() => window.location.href = '/sessions'}>
            <h3>📊 Session Tracking</h3>
            <p>Record live practice sessions with real-time attendance, player notes, and performance tracking.</p>
          </div>

          <div className="dashboard-card" onClick={() => window.location.href = '/analytics'}>
            <h3>📈 Analytics</h3>
            <p>View comprehensive team and player statistics, attendance reports, and performance trends over time.</p>
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
            Quick Actions
          </h3>
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', flexWrap: 'wrap' }}>
            <button className="glass-button primary">Start New Practice</button>
            <button className="glass-button">Add Player</button>
            <button className="glass-button">Create Drill</button>
            <button className="glass-button">View Reports</button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;