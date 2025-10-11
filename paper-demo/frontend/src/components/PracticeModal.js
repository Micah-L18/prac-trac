import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

const PracticeModal = ({ practice, isOpen, onClose, onSubmit }) => {
  const { token } = useAuth();
  const [drills, setDrills] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    duration: 90,
    objective: '',
    phases: []
  });
  const [errors, setErrors] = useState({});

  const phaseTypes = [
    'warm-up',
    'skill-development', 
    'drills',
    'scrimmage',
    'conditioning',
    'cool-down'
  ];

  useEffect(() => {
    if (isOpen) {
      fetchDrills();
      if (practice) {
        // Normalize practice data for editing
        const normalizedPhases = practice.phases ? practice.phases.map(phase => ({
          id: Date.now() + Math.random(), // Use temporary ID for form management
          name: phase.name || '',
          duration: phase.duration || 15,
          type: phase.type || 'skill-development',
          objective: phase.objective || '',
          drills: phase.drills || []
        })) : [];
        
        setFormData({
          name: practice.name || '',
          date: practice.date || '',
          duration: practice.duration || 90,
          objective: practice.objective || '',
          phases: normalizedPhases
        });
      } else {
        setFormData({
          name: '',
          date: new Date().toISOString().split('T')[0],
          duration: 90,
          objective: '',
          phases: []
        });
      }
      setErrors({});
    }
  }, [practice, isOpen]);

  const fetchDrills = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/drills', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDrills(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching drills:', error);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const addPhase = () => {
    const newPhase = {
      id: Date.now(),
      name: '',
      duration: 15,
      type: 'skill-development',
      objective: '',
      drills: []
    };
    setFormData(prev => ({
      ...prev,
      phases: [...prev.phases, newPhase]
    }));
  };

  const updatePhase = (phaseId, field, value) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.map(phase =>
        phase.id === phaseId ? { ...phase, [field]: value } : phase
      )
    }));
  };

  const removePhase = (phaseId) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.filter(phase => phase.id !== phaseId)
    }));
  };

  const addDrillToPhase = (phaseId, drillId) => {
    if (!drillId) return;
    
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.map(phase =>
        phase.id === phaseId 
          ? { 
              ...phase, 
              drills: phase.drills.includes(drillId) 
                ? phase.drills 
                : [...phase.drills, drillId]
            }
          : phase
      )
    }));
  };

  const removeDrillFromPhase = (phaseId, drillId) => {
    setFormData(prev => ({
      ...prev,
      phases: prev.phases.map(phase =>
        phase.id === phaseId 
          ? { ...phase, drills: phase.drills.filter(id => id !== drillId) }
          : phase
      )
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Practice name is required';
    }

    if (!formData.date) {
      newErrors.date = 'Practice date is required';
    }

    if (formData.duration < 15 || formData.duration > 480) {
      newErrors.duration = 'Duration must be between 15 and 480 minutes';
    }

    // Validate phases
    if (formData.phases.length === 0) {
      newErrors.phases = 'At least one phase is required';
    } else {
      formData.phases.forEach((phase, index) => {
        if (!phase.name.trim()) {
          newErrors[`phase_${index}_name`] = 'Phase name is required';
        }
        if (phase.duration < 1 || phase.duration > 120) {
          newErrors[`phase_${index}_duration`] = 'Phase duration must be between 1 and 120 minutes';
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const practiceData = {
      name: formData.name,
      date: formData.date,
      duration: formData.duration,
      objective: formData.objective,
      phases: formData.phases.map(phase => ({
        // Only include fields that the backend validation expects
        name: phase.name,
        duration: phase.duration,
        type: phase.type,
        objective: phase.objective,
        drills: phase.drills || []
      }))
    };

    onSubmit(practiceData);
  };

  const getTotalDuration = () => {
    return formData.phases.reduce((total, phase) => total + (phase.duration || 0), 0);
  };

  const getDrillName = (drillId) => {
    const drill = drills.find(d => d.id === drillId);
    return drill ? drill.name : 'Unknown Drill';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2>{practice ? 'Edit Practice' : 'Create New Practice'}</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          {/* Basic Information */}
          <div className="glass-card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Basic Information</h3>
            
            <div className="form-row">
              <div className="form-group">
                <label>Practice Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`glass-input ${errors.name ? 'error' : ''}`}
                  placeholder="e.g., Serving & Receiving Practice"
                />
                {errors.name && <span className="error-text">{errors.name}</span>}
              </div>
              
              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  className={`glass-input ${errors.date ? 'error' : ''}`}
                />
                {errors.date && <span className="error-text">{errors.date}</span>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Total Duration (minutes) *</label>
                <input
                  type="number"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                  className={`glass-input ${errors.duration ? 'error' : ''}`}
                  min="15"
                  max="480"
                />
                {errors.duration && <span className="error-text">{errors.duration}</span>}
              </div>
            </div>

            <div className="form-group">
              <label>Practice Objective</label>
              <textarea
                value={formData.objective}
                onChange={(e) => handleInputChange('objective', e.target.value)}
                className="glass-input"
                placeholder="What are the main goals for this practice?"
                rows={3}
              />
            </div>
          </div>

          {/* Practice Phases */}
          <div className="glass-card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h3>Practice Phases</h3>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Phase Total: {getTotalDuration()} minutes
              </div>
            </div>

            {errors.phases && <div className="error-text" style={{ marginBottom: 'var(--spacing-md)' }}>{errors.phases}</div>}

            {formData.phases.map((phase, index) => (
              <div key={phase.id} className="glass-card" style={{ marginBottom: 'var(--spacing-md)', background: 'var(--glass-secondary)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                  <h4>Phase {index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removePhase(phase.id)}
                    className="glass-button"
                    style={{ background: 'var(--danger-red)', color: 'white', padding: '0.5rem' }}
                  >
                    🗑️
                  </button>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Phase Name *</label>
                    <input
                      type="text"
                      value={phase.name}
                      onChange={(e) => updatePhase(phase.id, 'name', e.target.value)}
                      className={`glass-input ${errors[`phase_${index}_name`] ? 'error' : ''}`}
                      placeholder="e.g., Warm-up, Serving Drills"
                    />
                    {errors[`phase_${index}_name`] && <span className="error-text">{errors[`phase_${index}_name`]}</span>}
                  </div>

                  <div className="form-group">
                    <label>Duration (minutes) *</label>
                    <input
                      type="number"
                      value={phase.duration}
                      onChange={(e) => updatePhase(phase.id, 'duration', parseInt(e.target.value))}
                      className={`glass-input ${errors[`phase_${index}_duration`] ? 'error' : ''}`}
                      min="1"
                      max="120"
                    />
                    {errors[`phase_${index}_duration`] && <span className="error-text">{errors[`phase_${index}_duration`]}</span>}
                  </div>

                  <div className="form-group">
                    <label>Type</label>
                    <select
                      value={phase.type}
                      onChange={(e) => updatePhase(phase.id, 'type', e.target.value)}
                      className="glass-input"
                    >
                      {phaseTypes.map(type => (
                        <option key={type} value={type}>
                          {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Phase Objective</label>
                  <textarea
                    value={phase.objective}
                    onChange={(e) => updatePhase(phase.id, 'objective', e.target.value)}
                    className="glass-input"
                    placeholder="What should players achieve in this phase?"
                    rows={2}
                  />
                </div>

                {/* Drills for this phase */}
                <div className="form-group">
                  <label>Drills for this Phase</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <select
                      onChange={(e) => {
                        if (e.target.value) {
                          addDrillToPhase(phase.id, parseInt(e.target.value));
                          e.target.value = '';
                        }
                      }}
                      className="glass-input"
                      style={{ flex: 1 }}
                    >
                      <option value="">Select a drill to add...</option>
                      {drills.map(drill => (
                        <option key={drill.id} value={drill.id}>
                          {drill.name} ({drill.category})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {phase.drills.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {phase.drills.map(drillId => (
                        <span
                          key={drillId}
                          style={{
                            background: 'var(--accent-blue)',
                            color: 'white',
                            padding: '4px 8px',
                            borderRadius: '12px',
                            fontSize: '0.8rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          {getDrillName(drillId)}
                          <button
                            type="button"
                            onClick={() => removeDrillFromPhase(phase.id, drillId)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'white',
                              cursor: 'pointer',
                              padding: '0',
                              fontSize: '0.7rem'
                            }}
                          >
                            ✕
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={addPhase}
              className="glass-button secondary"
              style={{ width: '100%' }}
            >
              + Add Phase
            </button>
          </div>

          {/* Submit Buttons */}
          <div className="modal-footer">
            <button
              type="button"
              className="glass-button secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="glass-button primary"
            >
              {practice ? 'Update Practice' : 'Create Practice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PracticeModal;