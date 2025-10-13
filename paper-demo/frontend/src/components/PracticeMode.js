import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';

const PracticeMode = () => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showAttendanceManager, setShowAttendanceManager] = useState(false);
  const [showDrillDetails, setShowDrillDetails] = useState(false);
  const [showClipModal, setShowClipModal] = useState(false);
  const [selectedDrill, setSelectedDrill] = useState(null);
  const timerInterval = useRef(null);

  // Practice state
  const [practiceState, setPracticeState] = useState({
    practiceId: null,
    sessionId: null,
    practiceName: '',
    estimatedDuration: 90,
    phases: [],
    players: [],
    currentPhase: 0,
    phaseTimeRemaining: 0,
    overallTimeElapsed: 0,
    isPaused: false,
    isActive: false,
    startTime: null,
    phaseStartTime: null
  });

  // Attendance data
  const [attendanceData, setAttendanceData] = useState([]);
  const [tempAttendanceData, setTempAttendanceData] = useState([]);

  // Notes state
  const [currentNotesTab, setCurrentNotesTab] = useState('general');
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [practiceNotes, setPracticeNotes] = useState('');
  const [playerNotes, setPlayerNotes] = useState('');
  const [noteType, setNoteType] = useState('practice');
  const [historicalNotes, setHistoricalNotes] = useState([]);
  const [currentSessionNotes, setCurrentSessionNotes] = useState([]);

  useEffect(() => {
    initializeAttendance();
    return () => {
      if (timerInterval.current) {
        clearInterval(timerInterval.current);
      }
    };
  }, []);

  useEffect(() => {
    // Save session state before page unload
    const handleBeforeUnload = async (event) => {
      if (practiceState.sessionId && practiceState.isActive) {
        try {
          const currentTime = new Date();
          const totalElapsed = Math.floor((currentTime - practiceState.startTime) / 1000);
          const phaseElapsed = practiceState.phaseStartTime ? 
            Math.floor((currentTime - practiceState.phaseStartTime) / 1000) : 0;

          const timerState = {
            currentPhase: practiceState.currentPhase,
            phaseTimeRemaining: practiceState.phaseTimeRemaining,
            totalTimeElapsed: totalElapsed,
            phaseTimeElapsed: phaseElapsed,
            isRunning: true,
            pausedAt: currentTime.toISOString()
          };

          const data = {
            status: 'paused',
            timer_state: timerState,
            current_phase_id: practiceState.phases?.[practiceState.currentPhase]?.id || null,
            phase_elapsed_time: phaseElapsed,
            total_elapsed_time: totalElapsed
          };

          const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
          navigator.sendBeacon(`${API_BASE_URL}/api/practice-sessions/${practiceState.sessionId}/timer-state`, blob);
        } catch (error) {
          console.error('Error saving session state on unload:', error);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [practiceState.sessionId, practiceState.isActive, practiceState.startTime, practiceState.phaseStartTime, practiceState.currentPhase, practiceState.phaseTimeRemaining]);

  const initializeAttendance = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const practiceId = urlParams.get('practiceId');
      
      if (!practiceId) {
        setError('No practice ID provided');
        setLoading(false);
        return;
      }

      // Check for active session first
      const activeResponse = await fetch(`${API_BASE_URL}/api/practice-sessions/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (activeResponse.ok) {
        const activeData = await activeResponse.json();
        if (activeData.data) {
          // Resume existing session
          await resumeSession(activeData.data);
          return;
        }
      }

      // Load practice and team data for new session
      const practiceResponse = await fetch(`${API_BASE_URL}/api/practices/${practiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!practiceResponse.ok) {
        throw new Error('Failed to load practice data');
      }

      const practice = await practiceResponse.json();

      // Get active team first
      const activeTeamResponse = await fetch(`${API_BASE_URL}/api/teams/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!activeTeamResponse.ok) {
        throw new Error('No active team selected');
      }

      const activeTeam = await activeTeamResponse.json();
      const teamId = activeTeam.data.id;

      // Now get players for the active team
      const playersResponse = await fetch(`${API_BASE_URL}/api/teams/${teamId}/players`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!playersResponse.ok) {
        throw new Error('Failed to load team players');
      }

      const players = await playersResponse.json();

      setPracticeState(prev => ({
        ...prev,
        practiceId: practice.data.id,
        practiceName: practice.data.name,
        estimatedDuration: practice.data.estimatedDuration,
        phases: practice.data.phases || [],
        players: players.data || []
      }));

      // Initialize attendance data
      const initialAttendance = (players.data || []).map(player => ({
        player_id: player.id,
        attended: true,
        late_minutes: 0,
        notes: ''
      }));

      setAttendanceData(initialAttendance);
      setShowAttendanceModal(true);

    } catch (error) {
      console.error('Error initializing practice:', error);
      setError('Failed to load practice data');
    } finally {
      setLoading(false);
    }
  };

  const resumeSession = async (session) => {
    try {
      // Load practice data
      const practiceResponse = await fetch(`${API_BASE_URL}/api/practices/${session.practiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!practiceResponse.ok) {
        throw new Error('Failed to load practice data');
      }

      const practice = await practiceResponse.json();

      // Restore practice state
      const newState = {
        practiceId: session.practiceId,
        sessionId: session.id,
        practiceName: session.practiceName,
        estimatedDuration: practice.data.estimatedDuration,
        phases: practice.data.phases || [],
        players: session.players || [],
        currentPhase: session.currentPhase || 0,
        phaseTimeRemaining: 0,
        overallTimeElapsed: session.totalElapsedTime || 0,
        isPaused: true,
        isActive: true,
        startTime: new Date(session.startTime),
        phaseStartTime: new Date()
      };

      // Restore timer state
      if (session.timerState) {
        try {
          const timerState = typeof session.timerState === 'string' 
            ? JSON.parse(session.timerState) 
            : session.timerState;
          
          newState.currentPhase = timerState.currentPhase || 0;
          newState.phaseTimeRemaining = timerState.phaseTimeRemaining || 0;
          newState.overallTimeElapsed = timerState.totalTimeElapsed || 0;
          newState.isPaused = true;
        } catch (e) {
          console.error('Error parsing timer state:', e);
        }
      }

      // Restore attendance data
      if (session.attendance) {
        setAttendanceData(session.attendance.map(attendance => ({
          player_id: attendance.player_id,
          attended: attendance.attended,
          late_minutes: attendance.late_minutes || 0,
          notes: attendance.notes || ''
        })));
      }

      setPracticeState(newState);
      startPracticeWithAttendance(true);

    } catch (error) {
      console.error('Error restoring session data:', error);
      setError('Error restoring session. Starting fresh.');
      setShowAttendanceModal(true);
    }
  };

  const togglePlayerAttendance = (playerId, attended) => {
    setAttendanceData(prev => prev.map(record => 
      record.player_id === playerId 
        ? { ...record, attended }
        : record
    ));
  };

  const startPracticeWithAttendance = async (isResuming = false) => {
    try {
      // Only create a new session if we're not resuming an existing one
      if (!practiceState.sessionId && !isResuming) {
        const response = await fetch(`${API_BASE_URL}/api/practice-sessions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            practice_id: practiceState.practiceId,
            attendance: attendanceData
          })
        });

        if (!response.ok) {
          throw new Error('Failed to start practice session');
        }

        const session = await response.json();
        
        setPracticeState(prev => ({
          ...prev,
          sessionId: session.id,
          isActive: true,
          startTime: new Date(),
          phaseStartTime: new Date()
        }));
      }

      setShowAttendanceModal(false);
      initializePracticeMode();

    } catch (error) {
      console.error('Error starting practice:', error);
      setError('Error starting practice session. Please try again.');
    }
  };

  const initializePracticeMode = () => {
    try {
      setPracticeState(prev => {
        const newState = { ...prev };
        
        // Handle practices with or without phases
        if (newState.phases && newState.phases.length > 0) {
          newState.phaseTimeRemaining = (newState.phases[0].duration || 0) * 60;
        } else {
          newState.phaseTimeRemaining = newState.estimatedDuration * 60 || 3600;
        }
        
        newState.isActive = true;
        return newState;
      });

      startTimer();
    } catch (error) {
      console.error('Error initializing practice mode:', error);
      setError('Error initializing practice. Please try again.');
    }
  };

  const startTimer = () => {
    if (timerInterval.current) clearInterval(timerInterval.current);
    
    timerInterval.current = setInterval(() => {
      setPracticeState(prev => {
        if (prev.isPaused) return prev;
        
        const newState = { ...prev };
        
        // Update phase timer (countdown)
        if (newState.phaseTimeRemaining > 0) {
          newState.phaseTimeRemaining--;
          
          // Auto-advance to next phase when time is up
          if (newState.phaseTimeRemaining === 0) {
            if (newState.currentPhase < newState.phases.length - 1) {
              newState.currentPhase++;
              newState.phaseTimeRemaining = (newState.phases[newState.currentPhase].duration || 0) * 60;
              newState.phaseStartTime = new Date();
            } else {
              // Practice is complete
              endPractice();
            }
          }
        }
        
        // Update overall timer (count up)
        newState.overallTimeElapsed++;
        
        return newState;
      });
    }, 1000);
  };

  const togglePause = () => {
    setPracticeState(prev => ({ ...prev, isPaused: !prev.isPaused }));
  };

  const previousPhase = () => {
    if (practiceState.currentPhase > 0) {
      setPracticeState(prev => ({
        ...prev,
        currentPhase: prev.currentPhase - 1,
        phaseTimeRemaining: (prev.phases[prev.currentPhase - 1].duration || 0) * 60,
        phaseStartTime: new Date()
      }));
    }
  };

  const nextPhase = () => {
    if (practiceState.currentPhase < practiceState.phases.length - 1) {
      setPracticeState(prev => ({
        ...prev,
        currentPhase: prev.currentPhase + 1,
        phaseTimeRemaining: (prev.phases[prev.currentPhase + 1].duration || 0) * 60,
        phaseStartTime: new Date()
      }));
    }
  };

  const endPractice = async () => {
    const confirmed = window.confirm('Are you sure you want to end this practice session? This action cannot be undone.');
    
    if (confirmed) {
      clearInterval(timerInterval.current);
      
      try {
        const actualDurationMinutes = Math.round(practiceState.overallTimeElapsed / 60);
        
        if (practiceState.sessionId) {
          const response = await fetch(`${API_BASE_URL}/api/practice-sessions/${practiceState.sessionId}/complete`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              actual_duration: actualDurationMinutes,
              notes: practiceNotes
            })
          });

          if (!response.ok) {
            console.error('Failed to complete practice session');
            setError('Failed to save practice session. Please try again.');
            return;
          }
        }
        
        // Redirect back to practice list
        setTimeout(() => {
          window.location.href = '/practices';
        }, 1500);
        
      } catch (error) {
        console.error('Error completing practice session:', error);
        setError('Error completing practice session. Please try again.');
      }
    }
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatOverallTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const saveNotes = async () => {
    if (!practiceState.sessionId) {
      setError('No active session to save notes to');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/practice-sessions/${practiceState.sessionId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ notes: practiceNotes })
      });

      if (response.ok) {
        alert('Practice notes saved successfully!');
      } else {
        setError('Failed to save practice notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      setError('Error saving notes');
    }
  };

  const savePlayerNotes = async () => {
    if (!selectedPlayerId) {
      setError('Please select a player first');
      return;
    }

    if (!practiceState.sessionId) {
      setError('No active session to save notes to');
      return;
    }

    if (!playerNotes.trim()) {
      setError('Please enter some notes before saving');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/practice-sessions/${practiceState.sessionId}/player-notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          playerId: selectedPlayerId, 
          notes: playerNotes,
          noteType: noteType
        })
      });

      if (response.ok) {
        setPlayerNotes('');
        loadCurrentSessionNotes(selectedPlayerId);
        alert('Player note saved successfully!');
      } else {
        setError('Failed to save player notes');
      }
    } catch (error) {
      console.error('Error saving player notes:', error);
      setError('Error saving player notes');
    }
  };

  const loadCurrentSessionNotes = async (playerId) => {
    if (!practiceState.sessionId) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/practice-sessions/${practiceState.sessionId}/player-notes/${playerId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentSessionNotes(data.data || []);
      }
    } catch (error) {
      console.error('Error loading current session notes:', error);
    }
  };

  const onPlayerSelect = async (playerId) => {
    setSelectedPlayerId(playerId);
    if (playerId) {
      await loadCurrentSessionNotes(playerId);
      // Could also load historical notes here
    }
  };

  const showDrillDetailsModal = (drill) => {
    setSelectedDrill(drill);
    setShowDrillDetails(true);
  };

  const updateAttendanceManager = () => {
    setTempAttendanceData([...attendanceData]);
    setShowAttendanceManager(true);
  };

  const saveAttendanceChanges = async () => {
    setAttendanceData([...tempAttendanceData]);
    setShowAttendanceManager(false);
    
    // Save to backend if session is active
    if (practiceState.sessionId) {
      try {
        await fetch(`${API_BASE_URL}/api/practice-sessions/${practiceState.sessionId}/attendance`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ attendance: tempAttendanceData })
        });
      } catch (error) {
        console.error('Error saving attendance changes:', error);
      }
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: '#000000',
        color: 'white'
      }}>
        <p>Loading practice...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        background: '#000000',
        color: 'white',
        padding: '2rem'
      }}>
        <p style={{ color: '#e74c3c', fontSize: '1.2rem', marginBottom: '1rem' }}>{error}</p>
        <button 
          onClick={() => window.location.href = '/practices'}
          style={{
            background: 'var(--glass-primary)',
            border: '1px solid var(--glass-border)',
            color: 'white',
            padding: '0.75rem 1.5rem',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          ← Back to Practices
        </button>
      </div>
    );
  }

  const currentPhase = practiceState.phases[practiceState.currentPhase];

  return (
    <div style={{
      margin: 0,
      padding: 0,
      overflow: 'hidden',
      background: '#000000',
      minHeight: '100vh',
      height: '100vh',
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0
    }}>
      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: '800px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-header" style={{ textAlign: 'center' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-orange)', fontSize: '1.5rem' }}>
                🏐 {practiceState.practiceName}
              </h2>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>
                Mark attendance before starting practice
              </p>
            </div>
            
            <div style={{ maxHeight: '400px', overflow: 'auto', marginBottom: '2rem' }}>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {practiceState.players.map(player => (
                  <div key={player.id} className="glass-card" style={{ 
                    padding: '1rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between' 
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>#{player.jerseyNumber}</div>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                          {player.firstName} {player.lastName}
                        </div>
                        <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {player.position}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.5rem', 
                        cursor: 'pointer', 
                        color: 'var(--text-primary)' 
                      }}>
                        <input 
                          type="checkbox" 
                          checked={attendanceData.find(a => a.player_id === player.id)?.attended || false}
                          onChange={(e) => togglePlayerAttendance(player.id, e.target.checked)}
                          style={{ width: '18px', height: '18px' }}
                        />
                        Present
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="glass-button" 
                onClick={() => window.location.href = '/practices'}
                style={{ padding: '0.75rem 1.5rem' }}
              >
                ← Back to Practices
              </button>
              <button 
                type="button" 
                className="glass-button primary" 
                onClick={() => startPracticeWithAttendance()}
                style={{ padding: '0.75rem 1.5rem' }}
              >
                🏐 Start Practice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Practice Mode Container */}
      {!showAttendanceModal && (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
          {/* Top phase navigation with timer */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr',
            alignItems: 'center',
            padding: '1rem',
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(10px)',
            borderBottom: '1px solid var(--glass-border)',
            zIndex: 100
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifySelf: 'start' }}>
              <div style={{
                background: 'var(--glass-primary)',
                border: '1px solid var(--accent-orange)',
                borderRadius: '0.5rem',
                padding: '0.5rem 1rem',
                color: 'var(--accent-orange)',
                fontWeight: '600',
                fontSize: '1.1rem'
              }}>
                {currentPhase ? `Phase ${practiceState.currentPhase + 1}: ${currentPhase.name}` : 'Open Session'}
              </div>
              <div style={{
                background: 'var(--glass-primary)',
                backdropFilter: 'blur(20px)',
                border: '1px solid var(--glass-border)',
                borderRadius: '0.75rem',
                padding: '0.5rem 1rem',
                fontSize: '1.25rem',
                fontWeight: '700',
                color: 'var(--accent-orange)',
                textAlign: 'center',
                minWidth: '120px'
              }}>
                {formatTime(practiceState.phaseTimeRemaining)}
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifySelf: 'center' }}>
              <button 
                className="glass-button"
                onClick={previousPhase}
                disabled={practiceState.currentPhase === 0}
                style={{ padding: '0.5rem 1rem' }}
              >
                ← Prev
              </button>
              <button 
                className="glass-button"
                onClick={togglePause}
                style={{ padding: '0.5rem', width: '40px', height: '40px' }}
                title={practiceState.isPaused ? 'Resume' : 'Pause'}
              >
                {practiceState.isPaused ? '▶️' : '⏸️'}
              </button>
              <button 
                className="glass-button"
                onClick={updateAttendanceManager}
                style={{ padding: '0.5rem 1rem' }}
                title="Manage Attendance"
              >
                👥 Attendance
              </button>
              <button 
                className="glass-button"
                onClick={nextPhase}
                disabled={practiceState.currentPhase >= practiceState.phases.length - 1}
                style={{ padding: '0.5rem 1rem' }}
              >
                Next →
              </button>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifySelf: 'end' }}>
              <div style={{ fontSize: '1rem', color: 'var(--text-secondary)', fontWeight: '600' }}>
                Total: {formatOverallTime(practiceState.overallTimeElapsed)}
              </div>
              <button 
                className="glass-button danger"
                onClick={endPractice}
                style={{ padding: '0.5rem', width: '40px', height: '40px' }}
                title="End Practice"
              >
                ⏹️
              </button>
            </div>
          </div>

          {/* Main practice content */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: '2rem',
            paddingTop: 'calc(2rem + 80px)',
            height: 'calc(100vh - 80px)',
            overflowY: 'auto'
          }}>
            {/* Phase header */}
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h1 style={{
                fontSize: '2.5rem',
                fontWeight: '700',
                color: 'var(--text-primary)',
                marginBottom: '0.5rem'
              }}>
                {currentPhase ? currentPhase.name : 'Free Practice'}
              </h1>
              <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                {currentPhase ? currentPhase.objective : 'No structured phases - practice freely'}
              </p>
            </div>

            {/* Phase content */}
            <div style={{
              flex: 1,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '2rem',
              maxWidth: 'none',
              margin: 0,
              width: '100%',
              height: '100%',
              minHeight: 0
            }}>
              {/* Drills section */}
              <div className="glass-card" style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflow: 'hidden'
              }}>
                <h2 style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: 'var(--accent-orange)',
                  marginBottom: '1.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  🏐 Phase Drills
                </h2>
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {currentPhase && currentPhase.drills && currentPhase.drills.length > 0 ? (
                    currentPhase.drills.map((drill, index) => (
                      <div 
                        key={index}
                        className="glass-card"
                        onClick={() => showDrillDetailsModal(drill)}
                        style={{
                          padding: '1rem',
                          marginBottom: '1rem',
                          cursor: 'pointer',
                          transition: 'transform 0.2s ease',
                          background: 'var(--glass-secondary)'
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'translateY(-1px)'}
                        onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
                      >
                        <div style={{
                          fontWeight: '600',
                          color: 'var(--text-primary)',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          {drill.name}
                          <span style={{ color: 'var(--accent-orange)' }}>🔍</span>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                          <span style={{
                            color: 'var(--accent-orange)',
                            fontSize: '0.9rem',
                            fontWeight: '500'
                          }}>
                            📋 {drill.category}
                          </span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            ⭐ {drill.difficulty}
                          </span>
                        </div>
                        {drill.description && (
                          <div style={{
                            color: 'var(--text-tertiary)',
                            fontSize: '0.9rem',
                            marginBottom: '0.5rem',
                            lineHeight: 1.4
                          }}>
                            {drill.description}
                          </div>
                        )}
                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem' }}>
                          {drill.duration} minutes
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="glass-card" style={{ padding: '1rem' }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: '600' }}>
                        No drills assigned to this phase
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes section */}
              <div className="glass-card" style={{
                padding: '1.5rem',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0
              }}>
                <div style={{ display: 'flex', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)' }}>
                  <button 
                    className={`notes-tab ${currentNotesTab === 'general' ? 'active' : ''}`}
                    onClick={() => setCurrentNotesTab('general')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '1rem 1.5rem',
                      color: currentNotesTab === 'general' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      borderBottom: currentNotesTab === 'general' ? '2px solid var(--accent-orange)' : '2px solid transparent',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    📝 Practice Notes
                  </button>
                  <button 
                    className={`notes-tab ${currentNotesTab === 'player' ? 'active' : ''}`}
                    onClick={() => setCurrentNotesTab('player')}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '1rem 1.5rem',
                      color: currentNotesTab === 'player' ? 'var(--accent-orange)' : 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      borderBottom: currentNotesTab === 'player' ? '2px solid var(--accent-orange)' : '2px solid transparent',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    👤 Player Notes
                  </button>
                </div>
                
                {/* General practice notes tab */}
                {currentNotesTab === 'general' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <textarea
                      className="glass-input"
                      placeholder="Add notes about this phase... player performance, adjustments needed, etc."
                      value={practiceNotes}
                      onChange={(e) => setPracticeNotes(e.target.value)}
                      style={{
                        flex: 1,
                        minHeight: '150px',
                        resize: 'none',
                        marginBottom: '1rem'
                      }}
                    />
                    <button className="glass-button" onClick={saveNotes}>
                      💾 Save Practice Notes
                    </button>
                  </div>
                )}
                
                {/* Player notes tab */}
                {currentNotesTab === 'player' && (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <select 
                        className="glass-input"
                        value={selectedPlayerId}
                        onChange={(e) => onPlayerSelect(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <option value="">Select a player...</option>
                        {practiceState.players.map(player => (
                          <option key={player.id} value={player.id}>
                            #{player.jerseyNumber} {player.firstName} {player.lastName}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    {selectedPlayerId && (
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                          marginBottom: '1rem',
                          padding: '0.5rem 1rem',
                          background: 'var(--glass-tertiary)',
                          borderLeft: '4px solid var(--accent-orange)'
                        }}>
                          <span style={{ color: 'var(--accent-orange)', fontWeight: '600' }}>
                            {practiceState.players.find(p => p.id == selectedPlayerId)?.firstName} {practiceState.players.find(p => p.id == selectedPlayerId)?.lastName}
                          </span>
                          <span style={{ color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            {practiceState.players.find(p => p.id == selectedPlayerId)?.position}
                          </span>
                        </div>
                        
                        <div style={{ marginBottom: '0.5rem' }}>
                          <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginRight: '1rem' }}>
                            <input 
                              type="radio" 
                              name="noteType" 
                              value="practice" 
                              checked={noteType === 'practice'}
                              onChange={(e) => setNoteType(e.target.value)}
                              style={{ marginRight: '4px' }}
                            /> 
                            📝 Practice Note
                          </label>
                          <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            <input 
                              type="radio" 
                              name="noteType" 
                              value="player" 
                              checked={noteType === 'player'}
                              onChange={(e) => setNoteType(e.target.value)}
                              style={{ marginRight: '4px' }}
                            /> 
                            👤 Player-Specific Note
                          </label>
                        </div>
                        
                        <textarea
                          className="glass-input"
                          placeholder="Add specific notes about this player's performance during practice..."
                          value={playerNotes}
                          onChange={(e) => setPlayerNotes(e.target.value)}
                          style={{
                            flex: 1,
                            minHeight: '100px',
                            resize: 'none',
                            marginBottom: '1rem'
                          }}
                        />
                        <button className="glass-button" onClick={savePlayerNotes}>
                          💾 Add Note
                        </button>
                        
                        {/* Current Session Notes List */}
                        {currentSessionNotes.length > 0 && (
                          <div style={{ marginTop: '1rem' }}>
                            <h5 style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0.5rem 0' }}>
                              📋 Notes from This Practice
                            </h5>
                            {currentSessionNotes.map((note, index) => (
                              <div key={index} style={{
                                background: 'var(--glass-secondary)',
                                padding: '0.5rem',
                                marginBottom: '0.5rem',
                                borderRadius: '0.25rem',
                                fontSize: '0.9rem'
                              }}>
                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>
                                  {note.note_type === 'practice' ? '📝' : '👤'} {new Date(note.created_at).toLocaleTimeString()}
                                </div>
                                <div style={{ color: 'var(--text-primary)' }}>{note.notes}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Drill Details Modal */}
      {showDrillDetails && selectedDrill && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: '600px', width: '90%' }}>
            <div className="modal-header">
              <h2 style={{ color: 'var(--accent-orange)', margin: 0 }}>🏐 {selectedDrill.name}</h2>
              <button className="modal-close" onClick={() => setShowDrillDetails(false)}>✕</button>
            </div>
            
            <div style={{ display: 'grid', gap: '1rem', marginBottom: '1.5rem' }}>
              <div className="info-item">
                <label style={{ 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  Category
                </label>
                <div style={{ color: 'var(--text-primary)' }}>{selectedDrill.category || 'Not specified'}</div>
              </div>
              
              <div className="info-item">
                <label style={{ 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  Duration
                </label>
                <div style={{ color: 'var(--text-primary)' }}>
                  {selectedDrill.duration ? `${selectedDrill.duration} minutes` : 'Not specified'}
                </div>
              </div>
              
              <div className="info-item">
                <label style={{ 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.5px',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: '600'
                }}>
                  Description
                </label>
                <div style={{ color: 'var(--text-primary)' }}>
                  {selectedDrill.description || 'No description available'}
                </div>
              </div>
            </div>

            <div className="modal-actions">
              <button className="glass-button" onClick={() => setShowDrillDetails(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Manager Modal */}
      {showAttendanceManager && (
        <div className="modal" style={{ display: 'flex' }}>
          <div className="modal-content" style={{ maxWidth: '700px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div className="modal-header" style={{ textAlign: 'center' }}>
              <h2 style={{ margin: 0, color: 'var(--accent-orange)', fontSize: '1.25rem' }}>👥 Manage Attendance</h2>
              <p style={{ margin: '0.5rem 0 0 0', color: 'var(--text-secondary)' }}>Update attendance during practice</p>
            </div>
            
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {tempAttendanceData.map((attendance, index) => {
                  const player = practiceState.players.find(p => p.id === attendance.player_id);
                  return (
                    <div key={attendance.player_id} className="glass-card" style={{ 
                      padding: '1rem', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: '600' }}>#{player?.jerseyNumber}</div>
                        <div>
                          <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                            {player?.firstName} {player?.lastName}
                          </div>
                          <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            {player?.position}
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem', 
                          cursor: 'pointer', 
                          color: 'var(--text-primary)' 
                        }}>
                          <input 
                            type="checkbox" 
                            checked={attendance.attended}
                            onChange={(e) => {
                              const newData = [...tempAttendanceData];
                              newData[index].attended = e.target.checked;
                              setTempAttendanceData(newData);
                            }}
                            style={{ width: '18px', height: '18px' }}
                          />
                          Present
                        </label>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                type="button" 
                className="glass-button" 
                onClick={() => setShowAttendanceManager(false)}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="glass-button primary" 
                onClick={saveAttendanceChanges}
              >
                💾 Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeMode;