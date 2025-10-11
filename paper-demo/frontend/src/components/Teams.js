import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/api';
import Navbar from './Navbar';
import TeamModal from './TeamModal';
import './Teams.css';

const Teams = () => {
  const { token } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null);

  // Fetch teams on component mount
  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/teams'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(data.data);
      } else {
        setError('Failed to fetch teams');
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
      setError('Error loading teams');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = () => {
    setEditingTeam(null);
    setShowModal(true);
  };

  const handleEditTeam = (team) => {
    setEditingTeam(team);
    setShowModal(true);
  };

  const handleDeleteTeam = async (teamId) => {
    if (!window.confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/teams/${teamId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setTeams(teams.filter(team => team.id !== teamId));
      } else {
        setError('Failed to delete team');
      }
    } catch (error) {
      console.error('Error deleting team:', error);
      setError('Error deleting team');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingTeam(null);
  };

  const handleTeamSaved = () => {
    fetchTeams(); // Refresh the teams list
    handleModalClose();
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="main-container">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            color: 'var(--text-primary)'
          }}>
            <div className="loading">
              <div className="spinner"></div>
              Loading teams...
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="main-container">
        <div className="page-header">
          <div>
            <h1>Team Management</h1>
            <p>Manage your volleyball teams and roster</p>
          </div>
          <button 
            className="glass-button primary"
            onClick={handleCreateTeam}
          >
            + Create New Team
          </button>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: 'var(--spacing-lg)' }}>
            {error}
          </div>
        )}

        {teams.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
              🏐 No Teams Yet
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
              Create your first team to start managing players and practices
            </p>
            <button 
              className="glass-button primary"
              onClick={handleCreateTeam}
            >
              Create Your First Team
            </button>
          </div>
        ) : (
          <div className="teams-grid">
            {teams.map(team => (
              <div key={team.id} className="team-card">
                <div className="team-header">
                  <h3>{team.name}</h3>
                  <div className="team-actions">
                    <button 
                      className="action-button edit"
                      onClick={() => handleEditTeam(team)}
                      title="Edit Team"
                    >
                      ✏️
                    </button>
                    <button 
                      className="action-button delete"
                      onClick={() => handleDeleteTeam(team.id)}
                      title="Delete Team"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div className="team-details">
                  <div className="detail-row">
                    <label>Season</label>
                    <span>{team.season}</span>
                  </div>
                  {team.division && (
                    <div className="detail-row">
                      <label>Division</label>
                      <span>{team.division}</span>
                    </div>
                  )}
                  {team.description && (
                    <div className="detail-row">
                      <label>Description</label>
                      <span>{team.description}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <label>Created</label>
                    <span>{new Date(team.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="team-actions-bottom">
                  <button 
                    className="glass-button secondary"
                    onClick={() => window.location.href = `/teams/${team.id}/players`}
                  >
                    👥 Manage Players
                  </button>
                  <button 
                    className="glass-button secondary"
                    onClick={() => window.location.href = `/teams/${team.id}/practices`}
                  >
                    📋 View Practices
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <TeamModal
            team={editingTeam}
            onClose={handleModalClose}
            onSave={handleTeamSaved}
          />
        )}
      </div>
    </>
  );
};

export default Teams;