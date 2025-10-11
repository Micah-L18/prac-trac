import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import DrillModal from './DrillModal';
import DrillDetailsModal from './DrillDetailsModal';
import CourtDiagramModal from './CourtDiagramModal';
import CourtDiagramPreview from './CourtDiagramPreview';
import CourtDiagramViewer from './CourtDiagramViewer';
import './Teams.css';

const Drills = () => {
  const { token } = useAuth();
  const [drills, setDrills] = useState([]);
  const [filteredDrills, setFilteredDrills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDrill, setEditingDrill] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFilter, setSelectedFilter] = useState('All'); // New filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [showDiagramModal, setShowDiagramModal] = useState(false);
  const [currentDrillForDiagram, setCurrentDrillForDiagram] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState(null);
  const [showDiagramViewer, setShowDiagramViewer] = useState(false);
  const [viewerDiagram, setViewerDiagram] = useState(null);

  const categories = [
    'All', 'Warm-up', 'Serving', 'Passing', 'Setting', 
    'Attacking', 'Blocking', 'Defense', 'Conditioning', 'Cool-down'
  ];

  const filters = [
    'All', 'My Drills', 'Favorites', 'Public'
  ];

  // Fetch drills on component mount
  useEffect(() => {
    fetchDrills();
  }, []);

  // Filter drills when category, filter, or search term changes
  useEffect(() => {
    filterDrills();
  }, [drills, selectedCategory, selectedFilter, searchTerm]);

  const fetchDrills = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/drills', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDrills(data.data);
      } else {
        setError('Failed to fetch drills');
      }
    } catch (error) {
      console.error('Error fetching drills:', error);
      setError('Error loading drills');
    } finally {
      setLoading(false);
    }
  };

  const filterDrills = () => {
    let filtered = drills;

    // Filter by drill ownership/type
    if (selectedFilter === 'My Drills') {
      filtered = filtered.filter(drill => drill.isOwner);
    } else if (selectedFilter === 'Favorites') {
      filtered = filtered.filter(drill => drill.isFavorited);
    } else if (selectedFilter === 'Public') {
      filtered = filtered.filter(drill => drill.isPublic);
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(drill => drill.category === selectedCategory);
    }

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(drill =>
        drill.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drill.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        drill.focus?.some(f => f.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredDrills(filtered);
  };

  const handleCreateDrill = () => {
    setEditingDrill(null);
    setShowModal(true);
  };

  const handleEditDrill = (drill) => {
    setEditingDrill(drill);
    setShowModal(true);
  };

  const handleViewDetails = (drill) => {
    setSelectedDrill(drill);
    setShowDetailsModal(true);
  };

  const handleToggleFavorite = async (drill) => {
    try {
      const url = `http://localhost:3001/api/drills/${drill.id}/favorite`;
      const method = drill.isFavorited ? 'DELETE' : 'POST';
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to update favorite status');
      }

      // Update the drill in the local state
      setDrills(prevDrills => 
        prevDrills.map(d => 
          d.id === drill.id 
            ? { ...d, isFavorited: !d.isFavorited }
            : d
        )
      );
    } catch (error) {
      console.error('Error toggling favorite:', error);
      setError('Failed to update favorite status');
    }
  };

  const handleDiagramView = (drill) => {
    if (drill.courtDiagram) {
      setViewerDiagram(JSON.parse(drill.courtDiagram));
      setShowDiagramViewer(true);
    }
  };

  const handleDeleteDrill = async (drillId) => {
    if (!window.confirm('Are you sure you want to delete this drill? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:3001/api/drills/${drillId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        setDrills(drills.filter(drill => drill.id !== drillId));
      } else {
        setError('Failed to delete drill');
      }
    } catch (error) {
      console.error('Error deleting drill:', error);
      setError('Error deleting drill');
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingDrill(null);
  };

  const handleDrillSaved = () => {
    fetchDrills(); // Refresh the drills list
    handleModalClose();
  };

  const getDifficultyStars = (difficulty) => {
    return '⭐'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
  };

  const getDifficultyLabel = (difficulty) => {
    const labels = ['', 'Beginner', 'Easy', 'Intermediate', 'Hard', 'Expert'];
    return labels[difficulty] || 'Unknown';
  };

  const handleDiagramClick = (drill) => {
    setCurrentDrillForDiagram(drill);
    setShowDiagramModal(true);
  };

  const handleDiagramSave = async (diagramData) => {
    console.log('Saving diagram data:', diagramData);
    console.log('Current drill for diagram:', currentDrillForDiagram);
    
    try {
      // Save the diagram to the database - only send allowed fields
      const updateData = {
        name: currentDrillForDiagram.name,
        category: currentDrillForDiagram.category,
        duration: currentDrillForDiagram.duration,
        difficulty: currentDrillForDiagram.difficulty,
        description: currentDrillForDiagram.description,
        equipment: currentDrillForDiagram.equipment,
        minPlayers: currentDrillForDiagram.minPlayers,
        maxPlayers: currentDrillForDiagram.maxPlayers,
        focus: currentDrillForDiagram.focus,
        isPublic: currentDrillForDiagram.isPublic,
        courtDiagram: JSON.stringify(diagramData)
      };

      console.log('Sending update data:', updateData);

      const response = await fetch(`http://localhost:3001/api/drills/${currentDrillForDiagram.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      console.log('Response status:', response.status);

      if (response.ok) {
        console.log('Diagram saved successfully');
        
        // Create the updated drill object
        const updatedDrill = { 
          ...currentDrillForDiagram, 
          courtDiagram: JSON.stringify(diagramData) 
        };
        
        // Update local state
        const updatedDrills = drills.map(drill => 
          drill.id === currentDrillForDiagram.id 
            ? updatedDrill
            : drill
        );
        setDrills(updatedDrills);
        
        // Update selectedDrill if the details modal is open for this drill
        if (selectedDrill && selectedDrill.id === currentDrillForDiagram.id) {
          setSelectedDrill(updatedDrill);
        }
        
        setShowDiagramModal(false);
        setCurrentDrillForDiagram(null);
      } else {
        const errorData = await response.json();
        console.error('Failed to save diagram:', errorData.error);
        alert('Failed to save diagram: ' + errorData.error);
      }
    } catch (error) {
      console.error('Error saving diagram:', error);
      alert('Error saving diagram: ' + error.message);
    }
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
              Loading drills...
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
            <h1>Drill Library</h1>
            <p>Create and manage your volleyball practice drills</p>
          </div>
          <button 
            className="glass-button primary"
            onClick={handleCreateDrill}
          >
            + Create New Drill
          </button>
        </div>

        {/* Filters Section */}
        <div className="drill-filters" style={{ marginBottom: '2rem' }}>
          <div className="glass-card" style={{ padding: '1.5rem' }}>
            {/* Filter Buttons */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.5rem', display: 'block' }}>
                Filter Drills
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {filters.map(filter => (
                  <button
                    key={filter}
                    onClick={() => setSelectedFilter(filter)}
                    className={`glass-button ${selectedFilter === filter ? 'primary' : ''}`}
                    style={{ padding: '0.5rem 1rem' }}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', alignItems: 'end' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ color: 'var(--text-primary)', fontWeight: 500, marginBottom: '0.5rem' }}>
                  Category
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
                  Search Drills
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, description, or focus..."
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
        <div style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Showing {filteredDrills.length} of {drills.length} drills
          {selectedCategory !== 'All' && ` in ${selectedCategory}`}
          {searchTerm && ` matching "${searchTerm}"`}
        </div>

        {filteredDrills.length === 0 ? (
          <div className="glass-card" style={{ textAlign: 'center', padding: 'var(--spacing-xl)' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-md)' }}>
              {drills.length === 0 ? '🏐 No Drills Yet' : '🔍 No Drills Found'}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--spacing-lg)' }}>
              {drills.length === 0 
                ? 'Create your first drill to start building your practice library'
                : 'Try adjusting your filters or search terms'
              }
            </p>
            {drills.length === 0 && (
              <button 
                className="glass-button primary"
                onClick={handleCreateDrill}
              >
                Create Your First Drill
              </button>
            )}
          </div>
        ) : (
          <div className="teams-grid">
            {filteredDrills.map(drill => (
              <div 
                key={drill.id} 
                className="team-card"
                onClick={() => handleViewDetails(drill)}
                style={{ cursor: 'pointer' }}
              >
                <div className="team-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <h3>{drill.name}</h3>
                    {drill.isPublic && (
                      <span 
                        style={{ 
                          background: 'var(--accent-green)', 
                          color: 'white', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.7rem', 
                          fontWeight: '600' 
                        }}
                      >
                        🌍 PUBLIC
                      </span>
                    )}
                    {!drill.isOwner && drill.coachName && (
                      <span 
                        style={{ 
                          background: 'var(--glass-secondary)', 
                          color: 'var(--text-secondary)', 
                          padding: '2px 8px', 
                          borderRadius: '12px', 
                          fontSize: '0.7rem' 
                        }}
                      >
                        by {drill.coachName}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleFavorite(drill);
                    }}
                    className="glass-button"
                    style={{
                      padding: '0.5rem',
                      background: 'transparent',
                      border: 'none',
                      fontSize: '1.2rem',
                      color: drill.isFavorited ? '#ef4444' : 'var(--text-secondary)',
                      cursor: 'pointer',
                      borderRadius: '50%',
                      width: '40px',
                      height: '40px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={drill.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    {drill.isFavorited ? '❤️' : '🤍'}
                  </button>
                </div>
                
                {/* Simplified content */}
                <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center', marginTop: 'var(--spacing-sm)' }}>
                  {/* Left side - category only */}
                  <div style={{ flex: '1', minWidth: '0' }}>
                    <div className="detail-row">
                      <label>Category</label>
                      <span>{drill.category}</span>
                    </div>
                  </div>

                  {/* Right side - small court diagram */}
                  <div style={{ width: '120px', height: '75px', flexShrink: 0 }}>
                    {drill.courtDiagram ? (
                      <CourtDiagramPreview 
                        diagram={JSON.parse(drill.courtDiagram)}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDiagramView(drill);
                        }}
                        style={{ width: '100%', height: '100%', cursor: 'pointer' }}
                        showEditButton={false}
                      />
                    ) : (
                      <div 
                        style={{
                          width: '100%',
                          height: '100%',
                          border: '1px dashed var(--glass-border)',
                          borderRadius: 'var(--radius-sm)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'var(--text-secondary)',
                          background: 'rgba(255, 255, 255, 0.02)',
                          fontSize: '0.6rem'
                        }}
                      >
                        🏐
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <DrillModal
            drill={editingDrill}
            onClose={handleModalClose}
            onSave={handleDrillSaved}
          />
        )}

        {showDetailsModal && (
          <DrillDetailsModal
            drill={selectedDrill}
            isOpen={showDetailsModal}
            onClose={() => setShowDetailsModal(false)}
            onEdit={handleEditDrill}
            onDelete={handleDeleteDrill}
            onDiagramClick={(drill) => {
              setCurrentDrillForDiagram(drill);
              setShowDiagramModal(true);
            }}
            onDiagramView={handleDiagramView}
            onToggleFavorite={handleToggleFavorite}
          />
        )}

        {showDiagramModal && (
          <CourtDiagramModal
            isOpen={showDiagramModal}
            onClose={() => setShowDiagramModal(false)}
            onSave={handleDiagramSave}
            initialDiagram={currentDrillForDiagram?.courtDiagram ? JSON.parse(currentDrillForDiagram.courtDiagram) : null}
          />
        )}

        {showDiagramViewer && (
          <CourtDiagramViewer
            diagram={viewerDiagram}
            isOpen={showDiagramViewer}
            onClose={() => setShowDiagramViewer(false)}
          />
        )}
      </div>
    </>
  );
};

export default Drills;