import React from 'react';

const PracticePhaseView = ({ phases, drills = [] }) => {
  const getDrillName = (drillId) => {
    const drill = drills.find(d => d.id === drillId);
    return drill ? drill.name : 'Unknown Drill';
  };

  const formatDuration = (minutes) => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  const getPhaseTypeColor = (type) => {
    const colors = {
      'warm-up': 'var(--success-green)',
      'skill-development': 'var(--accent-blue)',
      'drills': 'var(--warning-yellow)',
      'scrimmage': 'var(--danger-red)',
      'conditioning': 'var(--accent-purple)',
      'cool-down': 'var(--success-green)'
    };
    return colors[type] || 'var(--text-secondary)';
  };

  if (!phases || phases.length === 0) {
    return (
      <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: 'var(--spacing-lg)' }}>
        No phases defined for this practice
      </div>
    );
  }

  return (
    <div className="practice-phases">
      {phases.map((phase, index) => (
        <div key={phase.id || index} className="glass-card" style={{ marginBottom: 'var(--spacing-md)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
              <h4 style={{ margin: 0 }}>
                Phase {phase.phase_order || index + 1}: {phase.name}
              </h4>
              <span
                style={{
                  background: getPhaseTypeColor(phase.type),
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.7rem',
                  fontWeight: 'bold'
                }}
              >
                {phase.type?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
              </span>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'bold' }}>
              {formatDuration(phase.duration)}
            </div>
          </div>

          {phase.objective && (
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontStyle: 'italic', 
              margin: '0 0 var(--spacing-sm) 0',
              fontSize: '0.9rem'
            }}>
              {phase.objective}
            </p>
          )}

          {phase.drills && phase.drills.length > 0 && (
            <div>
              <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                Drills ({phase.drills.length})
              </h5>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {phase.drills.map((drillId, drillIndex) => (
                  <span
                    key={drillId || drillIndex}
                    style={{
                      background: 'var(--glass-secondary)',
                      border: '1px solid var(--glass-border)',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: 'var(--text-primary)'
                    }}
                  >
                    {getDrillName(drillId)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PracticePhaseView;