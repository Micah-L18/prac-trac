import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import Navbar from './Navbar';

const Practices = () => {
  const { token } = useAuth();
  const [practices, setPractices] = useState([]);
  const [drills, setDrills] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDrillSelector, setShowDrillSelector] = useState(false);
  const [editingPractice, setEditingPractice] = useState(null);
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(null);
  const [selectedDrills, setSelectedDrills] = useState([]);
  const [drillSearchTerm, setDrillSearchTerm] = useState('');
  const [activeSession, setActiveSession] = useState(null);

  // Form state for creating practice
  const [practiceForm, setPracticeForm] = useState({
    name: '',
    date: new Date().toISOString().split('T')[0], // Initialize with today's date in YYYY-MM-DD format
    estimatedDuration: 90,
    objective: '',
    phases: []
  });

  // Form state for editing practice
  const [editForm, setEditForm] = useState({
    name: '',
    date: '',
    estimatedDuration: 90,
    objective: '',
    phases: []
  });

  useEffect(() => {
    fetchActiveTeam();
    fetchPractices();
    fetchDrills();
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
        setError('Please select an active team before creating practices.');
      }
    } catch (error) {
      console.error('Error fetching active team:', error);
      setActiveTeam(null);
      setError('Please select an active team before creating practices.');
    }
  };

  const fetchPractices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/practices/active-team`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPractices(data.data || []);
      } else if (response.status === 404) {
        setPractices([]);
        setError('Please select an active team to view practices.');
      } else {
        setError('Failed to fetch practices');
      }
    } catch (error) {
      console.error('Error fetching practices:', error);
      setError('Failed to fetch practices');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrills = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/drills`, {
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

  const handleFormChange = (e, isEdit = false) => {
    const { name, value } = e.target;
    const form = isEdit ? editForm : practiceForm;
    const setForm = isEdit ? setEditForm : setPracticeForm;
    
    setForm({
      ...form,
      [name]: value
    });
  };

  const addPhase = (isEdit = false) => {
    const form = isEdit ? editForm : practiceForm;
    const setForm = isEdit ? setEditForm : setPracticeForm;
    
    const newPhase = {
      id: Date.now(),
      name: '',
      duration: 15,
      objective: '',
      drills: []
    };

    setForm({
      ...form,
      phases: [...form.phases, newPhase]
    });
  };

  const updatePhase = (phaseId, field, value, isEdit = false) => {
    const form = isEdit ? editForm : practiceForm;
    const setForm = isEdit ? setEditForm : setPracticeForm;
    
    const updatedPhases = form.phases.map(phase =>
      phase.id === phaseId ? { ...phase, [field]: value } : phase
    );

    setForm({
      ...form,
      phases: updatedPhases
    });
  };

  const removePhase = (phaseId, isEdit = false) => {
    const form = isEdit ? editForm : practiceForm;
    const setForm = isEdit ? setEditForm : setPracticeForm;
    
    const updatedPhases = form.phases.filter(phase => phase.id !== phaseId);
    setForm({
      ...form,
      phases: updatedPhases
    });
  };

  const openDrillSelector = (phaseIndex, isEdit = false) => {
    setCurrentPhaseIndex(phaseIndex);
    const form = isEdit ? editForm : practiceForm;
    const currentPhase = form.phases[phaseIndex];
    setSelectedDrills(currentPhase.drills || []);
    setShowDrillSelector(true);
  };

  const toggleDrillSelection = (drill) => {
    const isSelected = selectedDrills.some(d => d.id === drill.id);
    if (isSelected) {
      setSelectedDrills(selectedDrills.filter(d => d.id !== drill.id));
    } else {
      setSelectedDrills([...selectedDrills, drill]);
    }
  };

  const closeDrillSelector = (isEdit = false) => {
    if (currentPhaseIndex !== null) {
      const form = isEdit ? editForm : practiceForm;
      const setForm = isEdit ? setEditForm : setPracticeForm;
      
      const updatedPhases = form.phases.map((phase, index) =>
        index === currentPhaseIndex ? { ...phase, drills: selectedDrills } : phase
      );

      setForm({
        ...form,
        phases: updatedPhases
      });
    }

    setShowDrillSelector(false);
    setCurrentPhaseIndex(null);
    setSelectedDrills([]);
    setDrillSearchTerm('');
  };

  const submitPractice = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!activeTeam) {
      setError('Please select an active team before creating practices.');
      setLoading(false);
      return;
    }

    try {
      const practiceData = {
        ...practiceForm,
        team_id: activeTeam.id
      };

      const response = await fetch(`${API_BASE_URL}/api/practices`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(practiceData)
      });

      if (response.ok) {
        await fetchPractices();
        setShowCreateModal(false);
        setPracticeForm({
          name: '',
          date: '',
          estimatedDuration: 90,
          objective: '',
          phases: []
        });
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create practice');
      }
    } catch (error) {
      console.error('Error creating practice:', error);
      setError('Failed to create practice');
    } finally {
      setLoading(false);
    }
  };

  const editPractice = (practice) => {
    setEditingPractice(practice);
    setEditForm({
      name: practice.name,
      date: practice.date,
      estimatedDuration: practice.estimatedDuration,
      objective: practice.objective,
      phases: practice.phases || []
    });
    setShowEditModal(true);
  };

  const updatePractice = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/practices/${editingPractice.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        await fetchPractices();
        setShowEditModal(false);
        setEditingPractice(null);
        setError('');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to update practice');
      }
    } catch (error) {
      console.error('Error updating practice:', error);
      setError('Failed to update practice');
    } finally {
      setLoading(false);
    }
  };

  const deletePractice = async (practiceId) => {
    if (!window.confirm('Are you sure you want to delete this practice?')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/practices/${practiceId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await fetchPractices();
        setError('');
      } else {
        setError('Failed to delete practice');
      }
    } catch (error) {
      console.error('Error deleting practice:', error);
      setError('Failed to delete practice');
    }
  };

  const startPractice = (practice) => {
    // Navigate to practice mode with this practice
    window.location.href = `/practice-mode?practiceId=${practice.id}`;
  };

  const filteredDrills = drills.filter(drill =>
    drill.name.toLowerCase().includes(drillSearchTerm.toLowerCase()) ||
    drill.category?.toLowerCase().includes(drillSearchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="main-container">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <p>Loading practices...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      
      {/* Active Session Banner */}
      {activeSession && (
        <div style={{
          background: 'linear-gradient(135deg, var(--accent-orange) 0%, #ff8a65 100%)',
          color: 'white',
          padding: 'var(--spacing-md)',
          textAlign: 'center',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '1200px', margin: '0 auto' }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem' }}>🏐 Active Practice Session</h3>
              <p style={{ margin: '4px 0 0 0', opacity: 0.9 }}>
                {activeSession.practiceName} • Started: {new Date(activeSession.startTime).toLocaleTimeString()}
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
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
              Practice Plans
            </h1>
            <p style={{ color: 'var(--text-secondary)' }}>
              Plan and manage your volleyball practice sessions
            </p>
          </div>
          <button
            className="glass-button primary"
            onClick={() => setShowCreateModal(true)}
          >
            ➕ Create Practice Plan
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            color: '#e74c3c',
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-lg)'
          }}>
            {error}
          </div>
        )}

        {/* Practices List */}
        <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
          {practices.length === 0 ? (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>No practice plans yet</h3>
              <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Create your first practice plan to get started!
              </p>
              <button
                className="glass-button primary"
                onClick={() => setShowCreateModal(true)}
              >
                ➕ Create First Practice Plan
              </button>
            </div>
          ) : (
            practices.map(practice => (
              <div key={practice.id} className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
                  <div>
                    <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0', fontSize: '1.25rem' }}>
                      {practice.name}
                    </h3>
                    <div style={{ display: 'flex', gap: 'var(--spacing-md)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      <span>📅 {new Date(practice.date).toLocaleDateString()}</span>
                      <span>⏱️ {practice.estimatedDuration} min</span>
                      <span>🎯 {practice.phases?.length || 0} phases</span>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    <button
                      className="glass-button primary"
                      onClick={() => startPractice(practice)}
                    >
                      ▶️ Start
                    </button>
                    <button
                      className="glass-button"
                      onClick={() => editPractice(practice)}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="glass-button danger"
                      onClick={() => deletePractice(practice.id)}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                {practice.objective && (
                  <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                    {practice.objective}
                  </p>
                )}

                {practice.phases && practice.phases.length > 0 && (
                  <div style={{ background: 'var(--glass-secondary)', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)' }}>
                    <h4 style={{ color: 'var(--text-primary)', margin: '0 0 12px 0', fontSize: '1rem' }}>Practice Phases</h4>
                    <div style={{ display: 'grid', gap: '8px' }}>
                      {practice.phases.map((phase, index) => (
                        <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{phase.name}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            {phase.duration} min • {phase.drills?.length || 0} drills
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Practice Modal */}
      {showCreateModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--accent-orange)', margin: 0 }}>🏐 Create Practice Plan</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>✕</button>
            </div>
            
            <form onSubmit={submitPractice}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-md)' }}>
                <div className="form-group">
                  <label>Practice Name</label>
                  <input
                    type="text"
                    name="name"
                    className="glass-input"
                    placeholder="e.g., Game Prep vs Eagles"
                    value={practiceForm.name}
                    onChange={handleFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Practice Date</label>
                  <input
                    type="date"
                    name="date"
                    className="glass-input"
                    value={practiceForm.date}
                    onChange={handleFormChange}
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
                <label>Estimated Duration (minutes)</label>
                <input
                  type="number"
                  name="estimatedDuration"
                  className="glass-input"
                  placeholder="90"
                  min="15"
                  max="300"
                  value={practiceForm.estimatedDuration}
                  onChange={handleFormChange}
                  required
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label>Practice Objective</label>
                <textarea
                  name="objective"
                  className="glass-input"
                  placeholder="What do you want to accomplish in this practice?"
                  rows="3"
                  value={practiceForm.objective}
                  onChange={handleFormChange}
                />
              </div>

              {/* Phases Section */}
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 'var(--spacing-md)',
                  padding: 'var(--spacing-md)',
                  background: 'var(--glass-secondary)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Practice Phases</h3>
                </div>
                
                <div style={{ display: 'grid', gap: 'var(--spacing-md)' }}>
                  {practiceForm.phases.map((phase, index) => (
                    <PracticePhaseForm
                      key={phase.id}
                      phase={phase}
                      index={index}
                      onUpdate={(field, value) => updatePhase(phase.id, field, value)}
                      onRemove={() => removePhase(phase.id)}
                      onSelectDrills={() => openDrillSelector(index)}
                    />
                  ))}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 'var(--spacing-md)' }}>
                  <button type="button" className="glass-button" onClick={() => addPhase()}>
                    ➕ Add Phase
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button type="button" className="glass-button" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="glass-button primary">
                  Create Practice Plan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drill Selector Modal */}
      {showDrillSelector && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--accent-orange)', margin: 0 }}>🏐 Select Drills for Phase</h2>
              <button className="modal-close" onClick={() => closeDrillSelector()}>✕</button>
            </div>
            
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <input
                type="text"
                className="glass-input"
                placeholder="🔍 Search drills..."
                value={drillSearchTerm}
                onChange={(e) => setDrillSearchTerm(e.target.value)}
              />
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 'var(--spacing-md)',
              maxHeight: '400px',
              overflow: 'auto'
            }}>
              {filteredDrills.map(drill => (
                <div
                  key={drill.id}
                  className={`drill-card ${selectedDrills.some(d => d.id === drill.id) ? 'selected' : ''}`}
                  onClick={() => toggleDrillSelection(drill)}
                  style={{
                    padding: 'var(--spacing-md)',
                    background: selectedDrills.some(d => d.id === drill.id) 
                      ? 'rgba(255, 107, 53, 0.1)' 
                      : 'var(--glass-bg)',
                    border: `1px solid ${selectedDrills.some(d => d.id === drill.id) 
                      ? 'var(--accent-orange)' 
                      : 'var(--glass-border)'}`,
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <h4 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>{drill.name}</h4>
                  <p style={{ margin: '0 0 8px 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    {drill.description}
                  </p>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>{drill.category}</span>
                    <span>•</span>
                    <span>{drill.duration} min</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="modal-actions" style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 'var(--spacing-lg)'
            }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                {selectedDrills.length} drill{selectedDrills.length !== 1 ? 's' : ''} selected
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-md)' }}>
                <button type="button" className="glass-button" onClick={() => closeDrillSelector()}>
                  Cancel
                </button>
                <button type="button" className="glass-button primary" onClick={() => closeDrillSelector()}>
                  ✅ Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Phase Form Component
const PracticePhaseForm = ({ phase, index, onUpdate, onRemove, onSelectDrills }) => {
  return (
    <div style={{
      padding: 'var(--spacing-md)',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--radius-md)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
        <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>Phase {index + 1}</h4>
        <button
          type="button"
          onClick={onRemove}
          style={{
            background: 'rgba(231, 76, 60, 0.1)',
            border: '1px solid rgba(231, 76, 60, 0.3)',
            color: '#e74c3c',
            padding: '4px 8px',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Remove
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-sm)' }}>
        <input
          type="text"
          className="glass-input"
          placeholder="Phase name (e.g., Warm-up, Serving Practice)"
          value={phase.name}
          onChange={(e) => onUpdate('name', e.target.value)}
        />
        <input
          type="number"
          className="glass-input"
          placeholder="Duration (min)"
          min="1"
          max="120"
          value={phase.duration}
          onChange={(e) => onUpdate('duration', parseInt(e.target.value) || 0)}
        />
      </div>
      
      <textarea
        className="glass-input"
        placeholder="Phase objective..."
        rows="2"
        value={phase.objective}
        onChange={(e) => onUpdate('objective', e.target.value)}
        style={{ marginBottom: 'var(--spacing-sm)' }}
      />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {phase.drills?.length || 0} drill{(phase.drills?.length || 0) !== 1 ? 's' : ''} selected
        </div>
        <button
          type="button"
          className="glass-button"
          onClick={onSelectDrills}
        >
          Select Drills
        </button>
      </div>
    </div>
  );
};

export default Practices;