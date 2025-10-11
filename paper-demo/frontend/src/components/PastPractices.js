import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';

const PastPractices = () => {
  const { token } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date');

  useEffect(() => {
    fetchPracticeSessions();
  }, []);

  const fetchPracticeSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:3001/api/practice-sessions', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch practice sessions');
      }

      const data = await response.json();
      // Only show completed sessions
      const completedSessions = (data.data || []).filter(session => session.status === 'completed');
      setSessions(completedSessions);
    } catch (error) {
      console.error('Error fetching practice sessions:', error);
      setError('Failed to load practice sessions');
    } finally {
      setLoading(false);
    }
  };

  const runPracticeAgain = async (session) => {
    try {
      setLoading(true);
      
      // First, get the original practice details
      const practiceResponse = await fetch(`http://localhost:3001/api/practices/${session.practiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!practiceResponse.ok) {
        throw new Error('Failed to fetch practice details');
      }

      const practiceData = await practiceResponse.json();
      const originalPractice = practiceData.data;

      // Create a duplicate practice with today's date
      const today = new Date().toISOString().split('T')[0];
      const duplicateData = {
        name: `${originalPractice.name} (Copy)`,
        date: today,
        duration: originalPractice.duration,
        objective: originalPractice.objective,
        phases: originalPractice.phases
      };

      const createResponse = await fetch('http://localhost:3001/api/practices', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(duplicateData)
      });

      if (!createResponse.ok) {
        throw new Error('Failed to create duplicate practice');
      }

      const createData = await createResponse.json();
      const newPracticeId = createData.data;

      // Navigate to practice mode with the new practice ID
      window.location.href = `/practice-mode?practiceId=${newPracticeId}&autoStart=true`;
      
    } catch (error) {
      console.error('Error running practice again:', error);
      setError('Failed to run practice again');
    } finally {
      setLoading(false);
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

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDuration = (minutes) => {
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const filteredSessions = sessions.filter(session =>
    session.practiceName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (session.notes && session.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  ).sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(b.startedAt) - new Date(a.startedAt);
      case 'name':
        return a.practiceName.localeCompare(b.practiceName);
      case 'duration':
        return (b.actualDuration || 0) - (a.actualDuration || 0);
      default:
        return 0;
    }
  });

  if (loading) {
    return (
      <>
        <Navbar />
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '50vh',
          color: 'var(--text-primary)'
        }}>
          <div className="loading">
            <div className="spinner"></div>
            Loading past practices...
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)',
        padding: 'var(--spacing-xl)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <h1 style={{ 
              fontSize: '2.5rem', 
              fontWeight: 'bold', 
              marginBottom: 'var(--spacing-md)',
              background: 'linear-gradient(135deg, #ffd700, #ffed4e)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              📋 Past Practices
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              Review completed practice sessions and notes
            </p>
          </div>

          {error && (
            <div style={{
              background: 'var(--danger-red)',
              color: 'white',
              padding: 'var(--spacing-md)',
              borderRadius: '8px',
              marginBottom: 'var(--spacing-lg)'
            }}>
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="glass-card" style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--spacing-md)', alignItems: 'center' }}>
              <div className="search-container">
                <input
                  type="text"
                  placeholder="Search practices or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="glass-input"
                  style={{ width: '100%' }}
                />
              </div>
              
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="glass-input"
                style={{ width: '150px' }}
              >
                <option value="date">Sort by Date</option>
                <option value="name">Sort by Name</option>
                <option value="duration">Sort by Duration</option>
              </select>

              <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                {filteredSessions.length} sessions
              </div>
            </div>
          </div>

          {filteredSessions.length === 0 ? (
            <div className="glass-card" style={{ 
              padding: '3rem', 
              textAlign: 'center',
              color: 'var(--text-secondary)'
            }}>
              <h3 style={{ marginBottom: '1rem' }}>No past practices found</h3>
              <p>
                {sessions.length === 0 
                  ? "Complete some practice sessions to see them here."
                  : "Try adjusting your search term."
                }
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: 'var(--spacing-lg)' }}>
              {filteredSessions.map(session => (
                <div 
                  key={session.id} 
                  className="glass-card"
                  style={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    border: selectedSession?.id === session.id ? '2px solid var(--accent-blue)' : '1px solid var(--glass-border)'
                  }}
                  onClick={() => setSelectedSession(selectedSession?.id === session.id ? null : session)}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 'var(--spacing-md)', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ marginBottom: 'var(--spacing-xs)' }}>{session.practiceName}</h3>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {formatDate(session.startedAt)} at {formatTime(session.startedAt)}
                      </div>
                    </div>
                    
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-blue)' }}>
                        {formatDuration(session.actualDuration)}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Duration
                      </div>
                    </div>

                    <div style={{ fontSize: '1.2rem' }}>
                      {selectedSession?.id === session.id ? '▼' : '▶'}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {selectedSession?.id === session.id && (
                    <div style={{ 
                      marginTop: 'var(--spacing-lg)', 
                      borderTop: '1px solid var(--glass-border)', 
                      paddingTop: 'var(--spacing-lg)' 
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-xl)' }}>
                        {/* Session Details */}
                        <div>
                          <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--accent-blue)' }}>
                            Session Details
                          </h4>
                          <div style={{ display: 'grid', gap: 'var(--spacing-sm)' }}>
                            <div className="detail-row">
                              <label>Practice Date</label>
                              <span>{formatDate(session.practiceDate)}</span>
                            </div>
                            <div className="detail-row">
                              <label>Started At</label>
                              <span>{formatDate(session.startedAt)} at {formatTime(session.startedAt)}</span>
                            </div>
                            <div className="detail-row">
                              <label>Completed At</label>
                              <span>{formatDate(session.completedAt)} at {formatTime(session.completedAt)}</span>
                            </div>
                            <div className="detail-row">
                              <label>Actual Duration</label>
                              <span>{formatDuration(session.actualDuration)}</span>
                            </div>
                            <div className="detail-row">
                              <label>Total Elapsed</label>
                              <span>{formatDuration(Math.floor((session.totalElapsedTime || 0) / 60))}</span>
                            </div>
                          </div>
                        </div>

                        {/* Practice Notes */}
                        <div>
                          <h4 style={{ marginBottom: 'var(--spacing-md)', color: 'var(--accent-blue)' }}>
                            Practice Notes
                          </h4>
                          {session.notes ? (
                            <div style={{
                              background: 'var(--glass-secondary)',
                              padding: 'var(--spacing-md)',
                              borderRadius: '8px',
                              border: '1px solid var(--glass-border)',
                              whiteSpace: 'pre-wrap',
                              lineHeight: '1.6'
                            }}>
                              {session.notes}
                            </div>
                          ) : (
                            <p style={{ 
                              color: 'var(--text-secondary)', 
                              fontStyle: 'italic',
                              background: 'var(--glass-secondary)',
                              padding: 'var(--spacing-md)',
                              borderRadius: '8px',
                              border: '1px solid var(--glass-border)'
                            }}>
                              No notes were added for this practice session.
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{ 
                        marginTop: 'var(--spacing-lg)', 
                        display: 'flex', 
                        gap: 'var(--spacing-md)',
                        paddingTop: 'var(--spacing-md)',
                        borderTop: '1px solid var(--glass-border)'
                      }}>
                        <button
                          className="glass-button primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            runPracticeAgain(session);
                          }}
                          disabled={loading}
                        >
                          🔄 Run Again
                        </button>
                        
                        <button
                          className="glass-button secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to the original practice plan
                            window.location.href = '/practices';
                          }}
                        >
                          📋 View Practice Plan
                        </button>
                        
                        <button
                          className="glass-button secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Export or print functionality could go here
                            const printContent = `
Practice: ${session.practiceName}
Date: ${formatDate(session.startedAt)}
Duration: ${formatDuration(session.actualDuration)}
Notes: ${session.notes || 'No notes'}
                            `.trim();
                            navigator.clipboard.writeText(printContent);
                            alert('Practice details copied to clipboard!');
                          }}
                        >
                          📋 Copy Details
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default PastPractices;