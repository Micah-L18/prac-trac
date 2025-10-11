import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/api';

const DrillModal = ({ drill, onClose, onSave }) => {
  const { token } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    duration: '',
    difficulty: 3,
    description: '',
    equipment: [],
    minPlayers: '',
    maxPlayers: '',
    focus: [],
    isPublic: false,
    courtDiagram: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [equipmentInput, setEquipmentInput] = useState('');
  const [focusInput, setFocusInput] = useState('');

  const categories = [
    'Warm-up', 'Serving', 'Passing', 'Setting', 
    'Attacking', 'Blocking', 'Defense', 'Conditioning', 'Cool-down'
  ];

  const commonEquipment = [
    'Balls', 'Net', 'Cones', 'Chairs', 'Markers', 'Ropes', 'Resistance Bands', 
    'Medicine Ball', 'Agility Ladder', 'Blocks', 'Antenna', 'Whistle'
  ];

  const commonFocus = [
    'Technique', 'Teamwork', 'Communication', 'Agility', 'Strength', 'Endurance',
    'Reaction Time', 'Footwork', 'Hand-Eye Coordination', 'Strategy', 'Mental Focus'
  ];

  // Initialize form data when drill prop changes
  useEffect(() => {
    if (drill) {
      setFormData({
        name: drill.name || '',
        category: drill.category || '',
        duration: drill.duration?.toString() || '',
        difficulty: drill.difficulty || 3,
        description: drill.description || '',
        equipment: drill.equipment || [],
        minPlayers: drill.minPlayers?.toString() || '',
        maxPlayers: drill.maxPlayers?.toString() || '',
        focus: drill.focus || [],
        isPublic: drill.isPublic || false,
        courtDiagram: drill.courtDiagram ? (typeof drill.courtDiagram === 'string' ? drill.courtDiagram : JSON.stringify(drill.courtDiagram)) : null
      });
    } else {
      setFormData({
        name: '',
        category: '',
        duration: '',
        difficulty: 3,
        description: '',
        equipment: [],
        minPlayers: '',
        maxPlayers: '',
        focus: [],
        isPublic: false,
        courtDiagram: null
      });
    }
  }, [drill]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : 
              (name === 'duration' || name === 'minPlayers' || name === 'maxPlayers' || name === 'difficulty' ? 
                (value === '' ? '' : parseInt(value)) : value)
    });
  };

  const handleAddEquipment = (equipment) => {
    if (equipment && !formData.equipment.includes(equipment)) {
      setFormData({
        ...formData,
        equipment: [...formData.equipment, equipment]
      });
    }
    setEquipmentInput('');
  };

  const handleRemoveEquipment = (equipment) => {
    setFormData({
      ...formData,
      equipment: formData.equipment.filter(e => e !== equipment)
    });
  };

  const handleAddFocus = (focus) => {
    if (focus && !formData.focus.includes(focus)) {
      setFormData({
        ...formData,
        focus: [...formData.focus, focus]
      });
    }
    setFocusInput('');
  };

  const handleRemoveFocus = (focus) => {
    setFormData({
      ...formData,
      focus: formData.focus.filter(f => f !== focus)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Basic validation
    if (!formData.name.trim()) {
      setError('Drill name is required');
      setLoading(false);
      return;
    }

    if (!formData.category) {
      setError('Category is required');
      setLoading(false);
      return;
    }

    if (!formData.duration || formData.duration < 1 || formData.duration > 120) {
      setError('Duration must be between 1 and 120 minutes');
      setLoading(false);
      return;
    }

    if (!formData.minPlayers || !formData.maxPlayers) {
      setError('Both minimum and maximum players are required');
      setLoading(false);
      return;
    }

    if (parseInt(formData.minPlayers) > parseInt(formData.maxPlayers)) {
      setError('Minimum players cannot be greater than maximum players');
      setLoading(false);
      return;
    }

    try {
      const url = drill 
        ? getApiUrl(`/api/drills/${drill.id}`)
        : getApiUrl('/api/drills');
      
      const method = drill ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          duration: parseInt(formData.duration),
          difficulty: parseInt(formData.difficulty),
          minPlayers: parseInt(formData.minPlayers),
          maxPlayers: parseInt(formData.maxPlayers)
        })
      });

      if (response.ok) {
        onSave();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to save drill');
      }
    } catch (error) {
      console.error('Error saving drill:', error);
      setError('Error saving drill');
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
      <div className="modal-content" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h2>{drill ? 'Edit Drill' : 'Create New Drill'}</h2>
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
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="name">Drill Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Pepper Warm-up, Serving Accuracy"
                className="glass-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Category *</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="glass-input"
                required
              >
                <option value="">Select category...</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '1rem' }}>
            <div className="form-group">
              <label htmlFor="duration">Duration (min) *</label>
              <input
                type="number"
                id="duration"
                name="duration"
                value={formData.duration}
                onChange={handleChange}
                placeholder="15"
                min="1"
                max="120"
                className="glass-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="difficulty">Difficulty: {formData.difficulty}/5</label>
              <input
                type="range"
                id="difficulty"
                name="difficulty"
                value={formData.difficulty}
                onChange={handleChange}
                min="1"
                max="5"
                className="skill-slider"
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                <span>Beginner</span>
                <span>Expert</span>
              </div>
            </div>

            <div className="form-group">
              <label 
                htmlFor="isPublic" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem', 
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                <input
                  type="checkbox"
                  id="isPublic"
                  name="isPublic"
                  checked={formData.isPublic}
                  onChange={handleChange}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span>🌍 Make Public</span>
                <small style={{ color: 'var(--text-secondary)', marginLeft: '0.5rem' }}>
                  Allow other coaches to see and use this drill
                </small>
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group">
                <label htmlFor="minPlayers">Min Players *</label>
                <input
                  type="number"
                  id="minPlayers"
                  name="minPlayers"
                  value={formData.minPlayers}
                  onChange={handleChange}
                  placeholder="2"
                  min="1"
                  max="50"
                  className="glass-input"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="maxPlayers">Max Players *</label>
                <input
                  type="number"
                  id="maxPlayers"
                  name="maxPlayers"
                  value={formData.maxPlayers}
                  onChange={handleChange}
                  placeholder="12"
                  min="1"
                  max="50"
                  className="glass-input"
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Detailed description of the drill, setup, and execution..."
              className="glass-input"
              rows="4"
            />
          </div>

          {/* Equipment Section */}
          <div className="form-group">
            <label>Equipment</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                value={equipmentInput}
                onChange={(e) => setEquipmentInput(e.target.value)}
                placeholder="Add equipment..."
                className="glass-input"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddEquipment(equipmentInput))}
              />
              <button
                type="button"
                onClick={() => handleAddEquipment(equipmentInput)}
                className="glass-button secondary"
                style={{ minWidth: 'auto', padding: '0.75rem 1rem' }}
              >
                Add
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {commonEquipment.map(eq => (
                <button
                  key={eq}
                  type="button"
                  onClick={() => handleAddEquipment(eq)}
                  className="glass-button"
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.5rem',
                    opacity: formData.equipment.includes(eq) ? 0.5 : 1
                  }}
                  disabled={formData.equipment.includes(eq)}
                >
                  {eq}
                </button>
              ))}
            </div>
            {formData.equipment.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {formData.equipment.map(eq => (
                  <span key={eq} style={{ 
                    background: 'rgba(255, 122, 0, 0.2)', 
                    color: 'var(--accent-orange)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0px',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {eq}
                    <button
                      type="button"
                      onClick={() => handleRemoveEquipment(eq)}
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Focus Areas Section */}
          <div className="form-group">
            <label>Focus Areas</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                type="text"
                value={focusInput}
                onChange={(e) => setFocusInput(e.target.value)}
                placeholder="Add focus area..."
                className="glass-input"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFocus(focusInput))}
              />
              <button
                type="button"
                onClick={() => handleAddFocus(focusInput)}
                className="glass-button secondary"
                style={{ minWidth: 'auto', padding: '0.75rem 1rem' }}
              >
                Add
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
              {commonFocus.map(focus => (
                <button
                  key={focus}
                  type="button"
                  onClick={() => handleAddFocus(focus)}
                  className="glass-button"
                  style={{ 
                    fontSize: '0.75rem', 
                    padding: '0.25rem 0.5rem',
                    opacity: formData.focus.includes(focus) ? 0.5 : 1
                  }}
                  disabled={formData.focus.includes(focus)}
                >
                  {focus}
                </button>
              ))}
            </div>
            {formData.focus.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {formData.focus.map(focus => (
                  <span key={focus} style={{ 
                    background: 'rgba(255, 122, 0, 0.2)', 
                    color: 'var(--accent-orange)',
                    padding: '0.25rem 0.5rem',
                    borderRadius: '0px',
                    fontSize: '0.875rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem'
                  }}>
                    {focus}
                    <button
                      type="button"
                      onClick={() => handleRemoveFocus(focus)}
                      style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
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
              {loading ? 'Saving...' : (drill ? 'Update Drill' : 'Create Drill')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DrillModal;