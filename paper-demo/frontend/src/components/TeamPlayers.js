import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import Navbar from './Navbar';
import PlayerModal from './PlayerModal';
import './Teams.css';

const TeamPlayers = () => {
  const { token } = useAuth();
  const [players, setPlayers] = useState([]);
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);

  // Get team ID from URL
  const getTeamIdFromUrl = () => {
    const path = window.location.pathname;
    const matches = path.match(/\/teams\/(\d+)\/players/);
    return matches ? parseInt(matches[1]) : null;
  };

  const teamId = getTeamIdFromUrl();

  useEffect(() => {
    if (teamId) {
      fetchTeamAndPlayers();
    } else {
      setError('Invalid team ID');
      setLoading(false);
    }
  }, [teamId]);

  const fetchTeamAndPlayers = async () => {
    try {
      setLoading(true);
      
      // First, get team details
      const teamsResponse = await fetch(`${API_BASE_URL}/api/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json();
        const currentTeam = teamsData.data.find(t => t.id === teamId);
        
        if (!currentTeam) {
          setError('Team not found');
          setLoading(false);
          return;
        }
        
        setTeam(currentTeam);
        
        // Set this team as active for player operations
        const selectResponse = await fetch(`${API_BASE_URL}/api/teams/${teamId}/select`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (selectResponse.ok) {
          // Now fetch players for this active team
          const playersResponse = await fetch(`${API_BASE_URL}/api/players`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (playersResponse.ok) {
            const playersData = await playersResponse.json();
            setPlayers(playersData.data);
          } else {
            setError('Failed to fetch players');
          }
        } else {
          setError('Failed to select team');
        }
      } else {
        setError('Failed to fetch team details');
      }
    } catch (error) {
      console.error('Error fetching team and players:', error);
      setError('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePlayer = () => {
    setEditingPlayer(null);
    setShowModal(true);
  };

  const handleEditPlayer = (player) => {
    setEditingPlayer(player);
    setShowModal(true);
  };

  const handleDeletePlayer = async (playerId) => {
    if (!window.confirm('Are you sure you want to remove this player from the team? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/players/${playerId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setPlayers(players.filter(player => player.id !== playerId));
      } else {
        setError('Failed to delete player');
      }
    } catch (error) {
      console.error('Error deleting player:', error);
      setError('Error deleting player');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingPlayer(null);
  };

  const handlePlayerSaved = () => {
    fetchTeamAndPlayers(); // Refresh the players list
    handleModalClose();
  };

  const handleBackToTeams = () => {
    window.location.href = '/teams';
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
              Loading players...
            </div>
          </div>
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <Navbar />
        <div className="main-container">
          <div className="page-header">
            <div>
              <h1>Error</h1>
              <p>{error}</p>
            </div>
            <button 
              className="glass-button secondary"
              onClick={handleBackToTeams}
            >
              ← Back to Teams
            </button>
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
            <h1>{team?.name} Players</h1>
            <p>Manage your team roster and player information</p>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="glass-button secondary"
              onClick={handleBackToTeams}
            >
              ← Back to Teams
            </button>
            <button 
              className="glass-button primary"
              onClick={handleCreatePlayer}
            >
              + Add Player
            </button>
          </div>
        </div>

        {players.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
              👥 No Players Yet
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
              Add your first player to start building your team roster
            </p>
            <button 
              className="glass-button primary"
              onClick={handleCreatePlayer}
            >
              Add First Player
            </button>
          </div>
        ) : (
          <div className="teams-grid">
            {players
              .sort((a, b) => a.jerseyNumber - b.jerseyNumber)
              .map(player => (
                <div key={player.id} className="team-card">
                  <div className="team-header">
                    <h3>#{player.jerseyNumber} {player.firstName} {player.lastName}</h3>
                    <div className="team-actions">
                      <button 
                        className="action-button edit"
                        onClick={() => handleEditPlayer(player)}
                        title="Edit Player"
                      >
                        ✏️
                      </button>
                      <button 
                        className="action-button delete"
                        onClick={() => handleDeletePlayer(player.id)}
                        title="Remove Player"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  <div className="team-details">
                    <div className="detail-row">
                      <label>Position</label>
                      <span>{player.position}</span>
                    </div>
                    <div className="detail-row">
                      <label>Skill Level</label>
                      <span>
                        {'⭐'.repeat(player.skillLevel)} ({player.skillLevel}/5)
                      </span>
                    </div>
                    {player.height && (
                      <div className="detail-row">
                        <label>Height</label>
                        <span>{player.height}</span>
                      </div>
                    )}
                    {player.year && (
                      <div className="detail-row">
                        <label>Year</label>
                        <span>{player.year}</span>
                      </div>
                    )}
                    {player.stats && (
                      <div className="detail-row">
                        <label>Season Stats</label>
                        <span>
                          K: {player.stats.kills} | A: {player.stats.assists} | B: {player.stats.blocks}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="team-actions-bottom">
                    <button 
                      className="glass-button secondary"
                      onClick={() => window.location.href = `/players/${player.id}/stats`}
                    >
                      📊 View Stats
                    </button>
                    <button 
                      className="glass-button secondary"
                      onClick={() => window.location.href = `/players/${player.id}/attendance`}
                    >
                      📅 Attendance
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {showModal && (
          <PlayerModal
            player={editingPlayer}
            teamId={teamId}
            onClose={handleModalClose}
            onSave={handlePlayerSaved}
          />
        )}
      </div>
    </>
  );
};

export default TeamPlayers;