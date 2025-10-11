import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getApiUrl } from '../config/api';
import Navbar from './Navbar';
import PracticeModal from './PracticeModal';
import PracticePhaseView from './PracticePhaseView';
import './Teams.css';

const Practices = () => {
  const { token } = useAuth();
  const [practices, setPractices] = useState([]);
  const [drills, setDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPractice, setEditingPractice] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredPractices, setFilteredPractices] = useState([]);
  const [expandedPractice, setExpandedPractice] = useState(null);

  const categories = ['All', 'Upcoming', 'In Progress'];

  // Fetch practices on component mount
  useEffect(() => {
    fetchPractices();
    fetchDrills();
  }, []);

  // Filter practices when category or search term changes
  useEffect(() => {
    filterPractices();
  }, [practices, selectedCategory, searchTerm]);

  const fetchPractices = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl('/api/practices'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch practices');
      }

      const data = await response.json();
      setPractices(data.data || []);
    } catch (error) {
      console.error('Error fetching practices:', error);
      setError('Failed to load practices');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrills = async () => {
    try {
      const response = await fetch(getApiUrl('/api/drills'), {
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

  const filterPractices = () => {
    let filtered = practices;

    // Always exclude completed practices from the main practice plans view
    filtered = filtered.filter(practice => !practice.hasCompletedSession);

    // Filter by category
    if (selectedCategory === 'Upcoming') {
      const today = new Date().toISOString().split('T')[0];
      filtered = filtered.filter(practice => practice.date >= today);
    } else if (selectedCategory === 'In Progress') {
      // Filter for practices that have active sessions
      filtered = filtered.filter(practice => practice.sessionStatus === 'in_progress' || practice.sessionStatus === 'paused');
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(practice =>
        practice.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        practice.objective?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredPractices(filtered);
  };

  const handleCreatePractice = () => {
    setEditingPractice(null);
    setShowModal(true);
  };

  const handleEditPractice = (practice) => {
    setEditingPractice(practice);
    setShowModal(true);
  };

  const handleDeletePractice = async (practice) => {
    if (!window.confirm(`Are you sure you want to delete "${practice.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(getApiUrl(`/api/practices/${practice.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete practice');
      }

      setPractices(practices.filter(p => p.id !== practice.id));
    } catch (error) {
      console.error('Error deleting practice:', error);
      setError('Failed to delete practice');
    }
  };

  const handlePracticeSubmit = async (practiceData) => {
    try {
      const url = editingPractice 
        ? getApiUrl(`/api/practices/${editingPractice.id}`)
        : getApiUrl('/api/practices');
      
      const method = editingPractice ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(practiceData)
      });

      if (!response.ok) {
        throw new Error('Failed to save practice');
      }

      await fetchPractices();
      setShowModal(false);
      setEditingPractice(null);
    } catch (error) {
      console.error('Error saving practice:', error);
      setError('Failed to save practice');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getStatusColor = (practice) => {
    const today = new Date().toISOString().split('T')[0];
    if (practice.hasActiveSession) return 'var(--accent-blue)';
    if (practice.date > today) return 'var(--accent-green)';
    return 'var(--text-secondary)';
  };

  const getStatusText = (practice) => {
    const today = new Date().toISOString().split('T')[0];
    if (practice.hasActiveSession) return 'In Progress';
    if (practice.date > today) return 'Upcoming';
    return 'Completed';
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
              Loading practices...
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
            <h1>Practice Plans</h1>
            <p>Create and manage your volleyball practice sessions</p>
          </div>
          <button 
            className="glass-button primary"
            onClick={handleCreatePractice}
          >
            + Create New Practice
          </button>
        </div>

        {/* Filters Section */}
        <div className="drill-filters" style={{ marginBottom: '2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Filter
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="glass-input"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Search Practices
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or objective..."
                  className="glass-input"
                />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="error-message" style={{ marginBottom: 'var(--spacing-lg)' }}>
            {error}
          </div>
        )}

        {/* Results Summary */}
        <div style={{ 
          marginBottom: 'var(--spacing-lg)', 
          color: 'var(--text-secondary)',
          fontSize: '0.9rem'
        }}>
          Showing {filteredPractices.length} of {practices.length} practices
        </div>

        {/* Practices List */}
        {filteredPractices.length === 0 ? (
          <div className="glass-card" style={{ 
            padding: '3rem', 
            textAlign: 'center',
            color: 'var(--text-secondary)'
          }}>
            <h3 style={{ marginBottom: '1rem' }}>No practices found</h3>
            <p>
              {practices.length === 0 
                ? "Get started by creating your first practice plan."
                : "Try adjusting your filters or search term."
              }
            </p>
            {practices.length === 0 && (
              <button 
                className="glass-button primary"
                onClick={handleCreatePractice}
                style={{ marginTop: '1rem' }}
              >
                Create First Practice
              </button>
            )}
          </div>
        ) : (
          <div className="teams-grid">
            {filteredPractices.map(practice => (
              <div 
                key={practice.id} 
                className="team-card"
                style={{ cursor: 'pointer' }}
              >
                <div 
                  className="team-header"
                  onClick={() => setExpandedPractice(expandedPractice === practice.id ? null : practice.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <h3>{practice.name}</h3>
                    <span 
                      style={{ 
                        background: getStatusColor(practice), 
                        color: 'white', 
                        padding: '2px 8px', 
                        borderRadius: '12px', 
                        fontSize: '0.7rem', 
                        fontWeight: '600' 
                      }}
                    >
                      {getStatusText(practice)}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: '1.2rem' }}>
                      {expandedPractice === practice.id ? '▼' : '▶'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Starting practice:', practice.id, practice.name);
                        window.location.href = `/practice-mode?practice=${practice.id}&autoStart=true`;
                      }}
                      className="glass-button primary"
                      style={{ padding: '0.5rem' }}
                      title="Start Practice Session"
                    >
                      ▶️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPractice(practice);
                      }}
                      className="glass-button secondary"
                      style={{ padding: '0.5rem' }}
                    >
                      ✏️
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeletePractice(practice);
                      }}
                      className="glass-button"
                      style={{ 
                        padding: '0.5rem',
                        background: 'var(--danger-red)',
                        color: 'white'
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                
                <div style={{ marginTop: 'var(--spacing-sm)' }}>
                  <div className="detail-row">
                    <label>Date</label>
                    <span>{formatDate(practice.date)}</span>
                  </div>
                  <div className="detail-row">
                    <label>Duration</label>
                    <span>{formatDuration(practice.duration)}</span>
                  </div>
                  {practice.objective && (
                    <div className="detail-row">
                      <label>Objective</label>
                      <span>{practice.objective}</span>
                    </div>
                  )}
                  <div className="detail-row">
                    <label>Phases</label>
                    <span>{practice.phases?.length || 0} phases</span>
                  </div>
                </div>

                {/* Expanded Practice Details */}
                {expandedPractice === practice.id && (
                  <div style={{ marginTop: 'var(--spacing-md)', borderTop: '1px solid var(--glass-border)', paddingTop: 'var(--spacing-md)' }}>
                    <h4 style={{ marginBottom: 'var(--spacing-sm)', color: 'var(--text-secondary)' }}>Practice Phases</h4>
                    <PracticePhaseView phases={practice.phases} drills={drills} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <PracticeModal
            practice={editingPractice}
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              setEditingPractice(null);
            }}
            onSubmit={handlePracticeSubmit}
          />
        )}
      </div>
    </>
  );
};

export default Practices;