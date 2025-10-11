import React from 'react';
import CourtDiagramPreview from './CourtDiagramPreview';
import CourtDiagramViewer from './CourtDiagramViewer';

const DrillDetailsModal = ({ drill, isOpen, onClose, onEdit, onDelete, onDiagramClick, onDiagramView, onToggleFavorite, practiceMode = false }) => {
  if (!isOpen || !drill) return null;

  const getDifficultyStars = (difficulty) => {
    return '⭐'.repeat(difficulty) + '☆'.repeat(5 - difficulty);
  };

  const getDifficultyLabel = (difficulty) => {
    const labels = ['', 'Beginner', 'Easy', 'Intermediate', 'Advanced', 'Expert'];
    return labels[difficulty] || 'Unknown';
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="modal-backdrop" 
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: practiceMode ? 10000 : 1000, // Higher z-index in practice mode
        padding: '1rem'
      }}
    >
      <div 
        className="glass-card"
        style={{
          width: '90%',
          maxWidth: '900px',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative'
        }}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          marginBottom: 'var(--spacing-lg)',
          paddingBottom: 'var(--spacing-md)',
          borderBottom: '1px solid var(--glass-border)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--text-primary)' }}>{drill.name}</h2>
              {drill.isPublic && (
                <span 
                  style={{ 
                    background: 'var(--accent-green)', 
                    color: 'white', 
                    padding: '4px 12px', 
                    borderRadius: '16px', 
                    fontSize: '0.75rem', 
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
                    padding: '4px 12px', 
                    borderRadius: '16px', 
                    fontSize: '0.75rem' 
                  }}
                >
                  by {drill.coachName}
                </span>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {/* Favorite Button - only show when not in practice mode */}
            {!practiceMode && (
              <button
                onClick={() => onToggleFavorite(drill)}
                className="glass-button"
                style={{
                  padding: '0.75rem',
                  background: 'transparent',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: drill.isFavorited ? '#ef4444' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  borderRadius: '50%',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={drill.isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                {drill.isFavorited ? '❤️' : '🤍'}
              </button>
            )}
            
            {!practiceMode && drill.isOwner && (
              <>
                <button 
                  className="glass-button secondary"
                  onClick={() => {
                    onEdit(drill);
                    onClose();
                  }}
                  style={{ padding: '0.5rem 1rem' }}
                >
                  ✏️ Edit
                </button>
                <button 
                  className="glass-button"
                  onClick={() => {
                    onDelete(drill.id);
                    onClose();
                  }}
                  style={{ 
                    padding: '0.5rem 1rem',
                    background: 'var(--glass-danger)',
                    color: 'white'
                  }}
                >
                  🗑️ Delete
                </button>
              </>
            )}
            <button 
              className="glass-button secondary"
              onClick={onClose}
              style={{ padding: '0.5rem 1rem' }}
            >
              ✕ Close
            </button>
          </div>
        </div>

        {/* Main content */}
        <div style={{ display: 'flex', gap: 'var(--spacing-xl)', alignItems: 'flex-start' }}>
          {/* Left side - drill details */}
          <div style={{ flex: '1', minWidth: '0' }}>
            <div className="team-details">
              <div className="detail-row">
                <label>Category</label>
                <span>{drill.category}</span>
              </div>
              <div className="detail-row">
                <label>Duration</label>
                <span>{drill.duration} minutes</span>
              </div>
              <div className="detail-row">
                <label>Difficulty</label>
                <span>
                  {getDifficultyStars(drill.difficulty)} ({getDifficultyLabel(drill.difficulty)})
                </span>
              </div>
              <div className="detail-row">
                <label>Players</label>
                <span>{drill.minPlayers}-{drill.maxPlayers} players</span>
              </div>
              {drill.equipment && drill.equipment.length > 0 && (
                <div className="detail-row">
                  <label>Equipment</label>
                  <span>{drill.equipment.join(', ')}</span>
                </div>
              )}
              {drill.focus && drill.focus.length > 0 && (
                <div className="detail-row">
                  <label>Focus Areas</label>
                  <span>{drill.focus.join(', ')}</span>
                </div>
              )}
              {drill.description && (
                <div className="detail-row">
                  <label>Description</label>
                  <div style={{ 
                    fontSize: '0.875rem', 
                    lineHeight: '1.5',
                    color: 'var(--text-primary)',
                    marginTop: '0.25rem',
                    whiteSpace: 'pre-wrap'
                  }}>
                    {drill.description}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - large court diagram */}
          <div style={{ width: '400px', flexShrink: 0 }}>
            <label style={{ 
              display: 'block', 
              marginBottom: 'var(--spacing-sm)', 
              fontSize: '1rem', 
              fontWeight: '600', 
              color: 'var(--accent-orange)' 
            }}>
              Court Diagram
            </label>
            {drill.courtDiagram ? (
              <CourtDiagramPreview 
                diagram={JSON.parse(drill.courtDiagram)}
                onClick={() => onDiagramView && onDiagramView(drill)}
                onEditClick={() => !practiceMode && onDiagramClick(drill)}
                style={{ 
                  width: '100%', 
                  height: practiceMode ? '500px' : '250px', // Much larger in practice mode
                  cursor: practiceMode ? 'pointer' : 'default'
                }}
                showEditButton={!practiceMode && drill.isOwner}
                highQuality={practiceMode} // Pass a prop for higher quality rendering
              />
            ) : (
              <div 
                onClick={() => !practiceMode && drill.isOwner && onDiagramClick(drill)}
                style={{
                  position: 'relative',
                  width: '100%',
                  height: practiceMode ? '350px' : '250px',
                  border: '2px dashed var(--glass-border)',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  background: 'rgba(255, 255, 255, 0.02)',
                  fontSize: '1rem',
                  textAlign: 'center',
                  cursor: (!practiceMode && drill.isOwner) ? 'pointer' : 'default'
                }}
              >
                🏐 {(!practiceMode && drill.isOwner) ? 'Click to add diagram' : 'No diagram available'}
                {!practiceMode && drill.isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDiagramClick(drill);
                    }}
                    style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: '1px solid var(--glass-border)',
                      background: 'rgba(0, 0, 0, 0.7)',
                      color: 'white',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      padding: 0,
                      zIndex: 10,
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(0, 0, 0, 0.9)';
                      e.target.style.transform = 'scale(1.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(0, 0, 0, 0.7)';
                      e.target.style.transform = 'scale(1)';
                    }}
                    title="Add diagram"
                  >
                    ➕
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DrillDetailsModal;