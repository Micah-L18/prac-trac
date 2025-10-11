import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/api';

const PlayerModal = ({ player, teamId, onClose, onSave }) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    jerseyNumber: '',
    position: '',
    skillLevel: 3,
    height: '',
    year: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const positions = [
    'Setter',
    'Outside Hitter',
    'Middle Blocker',
    'Opposite',
    'Libero',
    'Defensive Specialist'
  ];

  const years = [
    'Freshman',
    'Sophomore', 
    'Junior',
    'Senior',
    'Graduate',
    '6th Grade',
    '7th Grade',
    '8th Grade',
    '9th Grade',
    '10th Grade',
    '11th Grade',
    '12th Grade'
  ];

  // Initialize form data when player prop changes
  useEffect(() => {
    if (player) {
      setFormData({
        firstName: player.firstName || '',
        lastName: player.lastName || '',
        jerseyNumber: player.jerseyNumber?.toString() || '',
        position: player.position || '',
        skillLevel: player.skillLevel || 3,
        height: player.height || '',
        year: player.year || ''
      });
    } else {
      setFormData({
        firstName: '',
        lastName: '',
        jerseyNumber: '',
        position: '',
        skillLevel: 3,
        height: '',
        year: ''
      });
    }
  }, [player]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: name === 'jerseyNumber' || name === 'skillLevel' ? 
        (value === '' ? '' : parseInt(value)) : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.firstName.trim()) {
      setError('First name is required');
      setLoading(false);
      return;
    }

    if (!formData.lastName.trim()) {
      setError('Last name is required');
      setLoading(false);
      return;
    }

    if (!formData.jerseyNumber || formData.jerseyNumber < 0 || formData.jerseyNumber > 99) {
      setError('Jersey number must be between 0 and 99');
      setLoading(false);
      return;
    }

    if (!formData.position) {
      setError('Position is required');
      setLoading(false);
      return;
    }

    try {
      const url = player 
        ? getApiUrl(`/api/players/${player.id}`)
        : getApiUrl('/api/players');
      
      const method = player ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          jerseyNumber: parseInt(formData.jerseyNumber),
          skillLevel: parseInt(formData.skillLevel)
        })
      });

      if (response.ok) {
        onSave();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save player');
      }
    } catch (error) {
      console.error('Error saving player:', error);
      setError('Error saving player');
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
      <div className="modal-content">
        <div className="modal-header">
          <h2>{player ? 'Edit Player' : 'Add New Player'}</h2>
          <button 
            className="close-button"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="error-message" style={{ margin: '0 2rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="team-form">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="firstName">First Name *</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="Player's first name"
                className="glass-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name *</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Player's last name"
                className="glass-input"
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="jerseyNumber">Jersey # *</label>
              <input
                type="number"
                id="jerseyNumber"
                name="jerseyNumber"
                value={formData.jerseyNumber}
                onChange={handleChange}
                placeholder="0-99"
                min="0"
                max="99"
                className="glass-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="position">Position *</label>
              <select
                id="position"
                name="position"
                value={formData.position}
                onChange={handleChange}
                className="glass-input"
                required
              >
                <option value="">Select position...</option>
                {positions.map(pos => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="skillLevel">Skill Level: {formData.skillLevel}/5</label>
            <input
              type="range"
              id="skillLevel"
              name="skillLevel"
              value={formData.skillLevel}
              onChange={handleChange}
              min="1"
              max="5"
              className="skill-slider"
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '0.25rem' }}>
              <span>Beginner</span>
              <span>Advanced</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="height">Height</label>
              <input
                type="text"
                id="height"
                name="height"
                value={formData.height}
                onChange={handleChange}
                placeholder="e.g., 5'10&quot; or 178cm"
                className="glass-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="year">Year/Grade</label>
              <select
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="glass-input"
              >
                <option value="">Select year...</option>
                {years.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
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
              {loading ? 'Saving...' : (player ? 'Update Player' : 'Add Player')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlayerModal;