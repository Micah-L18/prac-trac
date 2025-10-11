import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/api';

const TeamModal = ({ team, onClose, onSave }) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    season: '',
    division: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Initialize form data when team prop changes
  useEffect(() => {
    if (team) {
      setFormData({
        name: team.name || '',
        season: team.season || '',
        division: team.division || '',
        description: team.description || ''
      });
    } else {
      // Set default season to current year
      const currentYear = new Date().getFullYear();
      setFormData({
        name: '',
        season: `${currentYear}-${currentYear + 1}`,
        division: '',
        description: ''
      });
    }
  }, [team]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.name.trim()) {
      setError('Team name is required');
      setLoading(false);
      return;
    }

    if (!formData.season.trim()) {
      setError('Season is required');
      setLoading(false);
      return;
    }

    try {
      const url = team 
        ? getApiUrl(`/api/teams/${team.id}`)
        : getApiUrl('/api/teams');
      
      const method = team ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        onSave();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save team');
      }
    } catch (error) {
      console.error('Error saving team:', error);
      setError('Error saving team');
    } finally {
      setLoading(false);
    }
  };

  // Handle click outside modal to close
  const handleBackdropClick = (e) => {
    if (e.target.classList.contains('modal-backdrop')) {
      onClose();
    }
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="modal-content glass-card">
        <div className="modal-header">
          <h2>{team ? 'Edit Team' : 'Create New Team'}</h2>
          <button 
            className="close-button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="team-form">
          <div className="form-group">
            <label htmlFor="name">Team Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="e.g., Varsity Tigers, JV Eagles"
              className="glass-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="season">Season *</label>
            <input
              type="text"
              id="season"
              name="season"
              value={formData.season}
              onChange={handleChange}
              placeholder="e.g., 2024-2025, Fall 2024"
              className="glass-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="division">Division</label>
            <input
              type="text"
              id="division"
              name="division"
              value={formData.division}
              onChange={handleChange}
              placeholder="e.g., Varsity, JV, Freshman, 18U"
              className="glass-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description or notes about the team"
              className="glass-input"
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button 
              type="button"
              className="glass-button secondary"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit"
              className="glass-button primary"
              disabled={loading}
            >
              {loading ? 'Saving...' : (team ? 'Update Team' : 'Create Team')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TeamModal;