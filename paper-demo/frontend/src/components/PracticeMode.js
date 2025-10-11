import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { API_BASE_URL } from '../config/api';
import DrillDetailsModal from './DrillDetailsModal';
import CourtDiagramViewer from './CourtDiagramViewer';

const PracticeMode = () => {
  const { token } = useAuth();
  const [activeSession, setActiveSession] = useState(null);
  const [selectedPractice, setSelectedPractice] = useState(null);
  const [practices, setPractices] = useState([]);
  const [players, setPlayers] = useState([]);
  const [drills, setDrills] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [timer, setTimer] = useState({
    totalElapsed: 0,
    phaseElapsed: 0,
    isRunning: false,
    currentPhaseIndex: 0
  });
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDrill, setSelectedDrill] = useState(null);
  const [showDrillModal, setShowDrillModal] = useState(false);
  const [showDiagramViewer, setShowDiagramViewer] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [pendingPracticeId, setPendingPracticeId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [phaseNotifications, setPhaseNotifications] = useState(new Set());
  const [showAttendanceManager, setShowAttendanceManager] = useState(false);
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const timerRef = useRef(null);

  // Timer effect
  useEffect(() => {
    console.log('Timer effect triggered. isRunning:', timer.isRunning);
    if (timer.isRunning) {
      console.log('Starting timer interval');
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          const newPhaseElapsed = prev.phaseElapsed + 1;
          const currentPhase = getCurrentPhase();
          
          // Check if phase duration is exceeded
          if (currentPhase && currentPhase.duration) {
            const phaseDurationSeconds = currentPhase.duration * 60;
            const phaseKey = `${prev.currentPhaseIndex}-${phaseDurationSeconds}`;
            
            if (newPhaseElapsed >= phaseDurationSeconds && !phaseNotifications.has(phaseKey)) {
              setPhaseNotifications(prevNotifications => new Set([...prevNotifications, phaseKey]));
              
              // Show notification that phase time is up
              const notification = document.createElement('div');
              notification.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: var(--accent-orange);
                color: white;
                padding: var(--spacing-lg);
                border-radius: var(--radius-lg);
                z-index: 10000;
                font-size: 1.2rem;
                font-weight: bold;
                text-align: center;
                border: 2px solid #fff;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
              `;
              notification.innerHTML = `
                <div>⏰ Phase Time Complete!</div>
                <div style="font-size: 1rem; margin-top: 8px;">"${currentPhase.name}" - ${currentPhase.duration} minutes</div>
                <div style="font-size: 0.9rem; margin-top: 8px; opacity: 0.9;">Ready to move to next phase?</div>
              `;
              document.body.appendChild(notification);
              
              setTimeout(() => {
                if (document.body.contains(notification)) {
                  document.body.removeChild(notification);
                }
              }, 5000);
            }
          }
          
          return {
            ...prev,
            totalElapsed: prev.totalElapsed + 1,
            phaseElapsed: newPhaseElapsed
          };
        });
      }, 1000);
    } else {
      console.log('Clearing timer interval');
      clearInterval(timerRef.current);
    }

    return () => {
      console.log('Timer effect cleanup');
      clearInterval(timerRef.current);
    };
  }, [timer.isRunning]);

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      // Load all basic data first
      await Promise.all([
        fetchPractices(),
        fetchPlayers(),
        fetchDrills(),
        fetchTeams(),
        fetchActiveTeam()
      ]);
      
      // Check if there are URL parameters for practice selection
      const urlParams = new URLSearchParams(window.location.search);
      const practiceId = urlParams.get('practiceId') || urlParams.get('practice');
      
      if (practiceId) {
        // If URL parameters exist, don't load active session practice to avoid conflicts
        console.log('PracticeMode - URL params detected, skipping active session practice loading');
        const response = await fetch(`${API_BASE_URL}/api/practice-sessions/active`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.data) {
            setActiveSession(data.data);
            // Set timer state but don't load practice (URL params will handle that)
            const phaseIndex = 0; // Reset to beginning for new practice
            setTimer(prev => ({
              ...prev,
              totalElapsed: 0,
              phaseElapsed: 0,
              isRunning: false,
              currentPhaseIndex: phaseIndex
            }));
          }
        }
      } else {
        // No URL parameters, load active session normally
        await fetchActiveSession();
      }
      
      setLoading(false);
    };

    loadInitialData();
  }, []);

  // Auto-select practice from URL parameter after practices are loaded
  useEffect(() => {
    if (practices.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const practiceId = urlParams.get('practiceId') || urlParams.get('practice');
      const autoStart = urlParams.get('autoStart') === 'true';
      
      console.log('PracticeMode - URL params:', { practiceId, autoStart });
      console.log('PracticeMode - Available practices:', practices.map(p => ({ id: p.id, name: p.name })));
      console.log('PracticeMode - Current selectedPractice:', selectedPractice?.id, selectedPractice?.name);
      console.log('PracticeMode - Current activeSession:', activeSession?.id);
      
      // Only process URL parameters if there's actually a practiceId in the URL
      if (practiceId) {
        const requestedPracticeId = parseInt(practiceId);
        const practice = practices.find(p => p.id === requestedPracticeId);
        console.log('PracticeMode - Found practice:', practice);
        
        if (practice) {
          // Check if this is a different practice than currently selected/active
          const isDifferentPractice = selectedPractice?.id !== requestedPracticeId && 
                                     activeSession?.practiceId !== requestedPracticeId;
          
          if (isDifferentPractice || !selectedPractice) {
            console.log('PracticeMode - Setting new practice:', practice.id, practice.name);
            setSelectedPractice(practice);
            
            // If autoStart is true, automatically start the practice
            if (autoStart) {
              console.log('PracticeMode - Auto-starting practice:', practice.id);
              startPracticeSession(practice.id);
            }
          } else {
            console.log('PracticeMode - Practice already selected/active');
          }
          
          // Don't clear URL parameters - let them remain for debugging and consistency
        } else {
          console.log('PracticeMode - Practice not found for ID:', practiceId);
        }
      } else {
        console.log('PracticeMode - No practiceId in URL parameters');
      }
    }
  }, [practices]); // Only depend on practices being loaded

  const fetchActiveSession = async () => {
    try {
      console.log('PracticeMode - Fetching active session...');
      const response = await fetch(`${API_BASE_URL}/api/practice-sessions/active`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('PracticeMode - Active session response:', data);
        if (data.data) {
          setActiveSession(data.data);
          console.log('PracticeMode - Active session set:', data.data);
          
          // Load the practice for this session
          console.log('PracticeMode - Loading practice for session:', data.data.practiceId);
          await fetchPracticeById(data.data.practiceId);
          
          // Then set timer state
          const phaseIndex = data.data.currentPhaseId ? 
            await findPhaseIndex(data.data.practiceId, data.data.currentPhaseId) : 0;
          
          setTimer(prev => ({
            ...prev,
            totalElapsed: data.data.totalElapsedTime || 0,
            phaseElapsed: data.data.phaseElapsedTime || 0,
            isRunning: data.data.status === 'in_progress',
            currentPhaseIndex: phaseIndex
          }));
        }
      } else {
        console.log('PracticeMode - No active session found');
      }
    } catch (error) {
      console.error('Error fetching active session:', error);
    }
  };

  const fetchPractices = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/practices`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPractices(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching practices:', error);
    }
  };

  const fetchPracticeById = async (practiceId) => {
    try {
      console.log('PracticeMode - Fetching practice by ID:', practiceId);
      const response = await fetch(`${API_BASE_URL}/api/practices/${practiceId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('PracticeMode - Practice by ID response:', data);
        console.log('PracticeMode - Setting selectedPractice to:', data.data);
        setSelectedPractice(data.data);
      } else {
        console.log('PracticeMode - Failed to fetch practice by ID:', response.status);
      }
    } catch (error) {
      console.error('Error fetching practice:', error);
    }
  };

  const fetchPlayers = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/players`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const playerList = data.data || [];
        setPlayers(playerList);
        
        // Initialize attendance
        setAttendance(playerList.map(player => ({
          playerId: player.id,
          playerName: player.name,
          attended: true,
          lateMinutes: 0,
          notes: ''
        })));
      }
    } catch (error) {
      console.error('Error fetching players:', error);
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

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTeams(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

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
        if (data.data?.activeTeam) {
          setSelectedTeam(data.data.activeTeam);
        }
      }
    } catch (error) {
      console.error('Error fetching active team:', error);
    }
  };

  const setActiveTeam = async (teamId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${teamId}/select`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const team = teams.find(t => t.id === teamId);
        setSelectedTeam(team);
        // Reload players for the selected team
        await fetchPlayers();
        return true;
      }
    } catch (error) {
      console.error('Error setting active team:', error);
    }
    return false;
  };

  const findPhaseIndex = async (practiceId, phaseId) => {
    const practice = selectedPractice || await fetchPracticeById(practiceId);
    if (practice && practice.phases) {
      return practice.phases.findIndex(phase => phase.id === phaseId);
    }
    return 0;
  };

  const startPracticeSession = async (practiceId) => {
    // First check if there are teams available
    if (teams.length === 0) {
      setError('No teams available. Please create a team first.');
      return;
    }
    
    // Check if a team is already selected, if not show team selection
    if (!selectedTeam) {
      setPendingPracticeId(practiceId);
      setShowTeamSelection(true);
      return;
    }
    
    // Team is selected, proceed to attendance modal
    setPendingPracticeId(practiceId);
    setShowAttendanceModal(true);
  };

  const handleTeamSelection = async (teamId) => {
    const success = await setActiveTeam(teamId);
    if (success && pendingPracticeId) {
      setShowTeamSelection(false);
      // Initialize attendance with the new team's players
      const playerList = players.map(player => ({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        attended: true,
        lateMinutes: 0
      }));
      setAttendance(playerList);
      setShowAttendanceModal(true);
    }
  };

  const cancelTeamSelection = () => {
    setShowTeamSelection(false);
    setPendingPracticeId(null);
  };

  const actuallyStartPracticeSession = async (practiceId) => {
    try {
      console.log('Starting practice session for practice ID:', practiceId);
      const response = await fetch(`${API_BASE_URL}/api/practice-sessions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          practiceId,
          attendance: attendance.filter(a => a.attended)
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Practice session created:', data);
        setActiveSession(data.data);
        // Reset timer and start it for new practice session
        const newTimerState = {
          totalElapsed: 0,
          phaseElapsed: 0,
          isRunning: true,
          currentPhaseIndex: 0
        };
        console.log('Setting timer state to:', newTimerState);
        setTimer(newTimerState);
        await fetchPracticeById(practiceId);
      } else {
        throw new Error('Failed to start practice session');
      }
    } catch (error) {
      console.error('Error starting practice session:', error);
      setError('Failed to start practice session');
    }
  };

  const confirmAttendanceAndStart = async () => {
    if (pendingPracticeId) {
      setShowAttendanceModal(false);
      await actuallyStartPracticeSession(pendingPracticeId);
      setPendingPracticeId(null);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      // Enter fullscreen
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) {
        document.documentElement.webkitRequestFullscreen();
      } else if (document.documentElement.msRequestFullscreen) {
        document.documentElement.msRequestFullscreen();
      }
    } else {
      // Exit fullscreen
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement ||
        false
      );
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('msfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Attendance Manager Functions
  const openAttendanceManager = async () => {
    if (!activeSession) return;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/practice-sessions/${activeSession.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const session = await response.json();
        // Transform attendance data to include player details
        const attendanceWithDetails = session.data.attendance?.map(record => {
          const player = players.find(p => p.id === record.playerId || p.id === record.player_id);
          return {
            ...record,
            playerId: record.playerId || record.player_id,
            playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown Player',
            jerseyNumber: player?.jerseyNumber || '?',
            position: player?.position || 'Unknown'
          };
        }) || [];
        
        setSessionAttendance(attendanceWithDetails);
        setShowAttendanceManager(true);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      setError('Failed to load attendance data');
    }
  };

  const updateSessionAttendance = (playerId, field, value) => {
    setSessionAttendance(prev => prev.map(record => 
      record.playerId === playerId ? { ...record, [field]: value } : record
    ));
  };

  const saveAttendanceChanges = async () => {
    if (!activeSession) return;
    
    try {
      for (const record of sessionAttendance) {
        await fetch(`${API_BASE_URL}/api/practice-sessions/${activeSession.id}/attendance`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            playerId: record.playerId,
            attended: record.attended,
            lateMinutes: record.lateMinutes || 0,
            notes: record.notes || ''
          })
        });
      }
      
      setShowAttendanceManager(false);
      setError('');
      console.log('Attendance updated successfully');
    } catch (error) {
      console.error('Error saving attendance:', error);
      setError('Failed to save attendance changes');
    }
  };

  const toggleTimer = () => {
    console.log('Toggling timer. Current state:', timer.isRunning);
    setTimer(prev => {
      const newState = { ...prev, isRunning: !prev.isRunning };
      console.log('New timer state:', newState);
      return newState;
    });
  };

  const nextPhase = () => {
    if (selectedPractice && timer.currentPhaseIndex < selectedPractice.phases.length - 1) {
      setTimer(prev => ({
        ...prev,
        currentPhaseIndex: prev.currentPhaseIndex + 1,
        phaseElapsed: 0
      }));
    }
  };

  const prevPhase = () => {
    if (timer.currentPhaseIndex > 0) {
      setTimer(prev => ({
        ...prev,
        currentPhaseIndex: prev.currentPhaseIndex - 1,
        phaseElapsed: 0
      }));
    }
  };

  const [isCompletingPractice, setIsCompletingPractice] = useState(false);

  const completePractice = async () => {
    if (!activeSession || isCompletingPractice) return;

    try {
      setIsCompletingPractice(true);
      const totalElapsed = timer.totalElapsed || 0;
      const actualDuration = Math.max(0, Math.floor(totalElapsed / 60)); // Ensure it's a positive integer
      const practiceNotes = notes || ''; // Ensure it's a string, not null
      
      const requestBody = {
        status: 'completed',
        actualDuration: actualDuration,
        notes: practiceNotes
      };

      console.log('Completing practice with data:', requestBody);
      console.log('Timer state:', timer);

      const response = await fetch(`${API_BASE_URL}/api/practice-sessions/${activeSession.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        setActiveSession(null);
        setSelectedPractice(null);
        setTimer({ totalElapsed: 0, phaseElapsed: 0, isRunning: false, currentPhaseIndex: 0 });
        setNotes('');
        
        // Navigate to past practices page
        window.location.href = '/past-practices';
      } else {
        const errorData = await response.json();
        console.error('Failed to complete practice:', response.status, errorData);
        setError(`Failed to complete practice: ${errorData.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error completing practice:', error);
      setError('Failed to complete practice');
    } finally {
      setIsCompletingPractice(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getCurrentPhase = () => {
    if (!selectedPractice || !selectedPractice.phases || timer.currentPhaseIndex >= selectedPractice.phases.length) {
      return null;
    }
    return selectedPractice.phases[timer.currentPhaseIndex];
  };

  const updateAttendance = (playerId, field, value) => {
    setAttendance(prev => prev.map(a => 
      a.playerId === playerId ? { ...a, [field]: value } : a
    ));
  };

  const openDrillModal = (drillId) => {
    console.log('Opening drill modal for drillId:', drillId);
    const drill = drills.find(d => d.id === drillId);
    console.log('Found drill:', drill);
    console.log('Available drills:', drills.map(d => ({ id: d.id, name: d.name })));
    if (drill) {
      console.log('Setting selectedDrill to:', drill);
      setSelectedDrill(drill);
      console.log('Setting showDrillModal to true');
      setShowDrillModal(true);
      console.log('Drill modal should be open now');
      
      // Add a timeout to check the state after setting
      setTimeout(() => {
        console.log('State check after 100ms:', {
          showDrillModal,
          selectedDrill: selectedDrill?.name
        });
      }, 100);
    } else {
      console.log('Drill not found for ID:', drillId);
    }
  };

  const closeDrillModal = () => {
    setSelectedDrill(null);
    setShowDrillModal(false);
  };

  const openDiagramViewer = (drill) => {
    console.log('Opening diagram viewer for drill:', drill?.name);
    console.log('Drill has diagram:', drill?.courtDiagram ? 'YES' : 'NO');
    setSelectedDrill(drill);
    setShowDiagramViewer(true);
    console.log('Diagram viewer should be open now');
  };

  const closeDiagramViewer = () => {
    console.log('Closing diagram viewer');
    setShowDiagramViewer(false);
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)',
        color: 'var(--text-primary)'
      }}>
        <div className="loading">
          <div className="spinner"></div>
          Loading Practice Mode...
        </div>
      </div>
    );
  }

  // No active session - show practice selection
  if (!activeSession) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)',
        padding: 'var(--spacing-xl)',
        position: 'relative'
      }}>
        {/* Background overlay with glass effect */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 20% 80%, rgba(255, 107, 53, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(53, 162, 235, 0.1) 0%, transparent 50%)',
          pointerEvents: 'none'
        }} />
        
        <div style={{
          maxWidth: '1000px',
          margin: '0 auto',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Header Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--spacing-xl)',
            textAlign: 'center',
            marginBottom: 'var(--spacing-xl)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <h1 style={{ 
              fontSize: '2.5rem',
              fontWeight: '700',
              background: 'linear-gradient(135deg, var(--accent-orange) 0%, #ff8a65 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              marginBottom: 'var(--spacing-md)'
            }}>
              🏐 Practice Mode
            </h1>
            <p style={{ 
              color: 'var(--text-secondary)',
              fontSize: '1.1rem',
              margin: 0
            }}>
              Select a practice plan and team to begin your session
            </p>
          </div>

          {error && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.1)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-md)',
              marginBottom: 'var(--spacing-lg)',
              color: '#fca5a5'
            }}>
              {error}
            </div>
          )}

          {/* Practice Selection Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 'var(--radius-xl)',
            padding: 'var(--spacing-xl)',
            marginBottom: 'var(--spacing-xl)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{ 
              color: 'var(--accent-orange)',
              fontSize: '1.5rem',
              marginBottom: 'var(--spacing-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)'
            }}>
              📋 Select Practice Plan
            </h3>
            
            <div style={{ 
              display: 'grid', 
              gap: 'var(--spacing-lg)',
              gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))'
            }}>
              {practices.map(practice => (
                <div
                  key={practice.id}
                  style={{
                    background: selectedPractice?.id === practice.id 
                      ? 'rgba(255, 107, 53, 0.1)' 
                      : 'rgba(255, 255, 255, 0.03)',
                    backdropFilter: 'blur(15px)',
                    border: selectedPractice?.id === practice.id 
                      ? '2px solid var(--accent-orange)' 
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--spacing-lg)',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    transform: selectedPractice?.id === practice.id ? 'translateY(-2px)' : 'translateY(0)',
                    boxShadow: selectedPractice?.id === practice.id 
                      ? '0 12px 40px rgba(255, 107, 53, 0.2)' 
                      : '0 4px 20px rgba(0, 0, 0, 0.1)'
                  }}
                  onClick={() => setSelectedPractice(practice)}
                  onMouseEnter={(e) => {
                    if (selectedPractice?.id !== practice.id) {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedPractice?.id !== practice.id) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.background = 'rgba(255, 255, 255, 0.03)';
                    }
                  }}
                >
                  <h4 style={{ 
                    color: 'var(--text-primary)',
                    fontSize: '1.3rem',
                    fontWeight: '600',
                    marginBottom: 'var(--spacing-md)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)'
                  }}>
                    {selectedPractice?.id === practice.id && '✓'} {practice.name}
                  </h4>
                  
                  <div style={{ 
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-md)'
                  }}>
                    <div style={{ 
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)'
                    }}>
                      📅 {new Date(practice.date).toLocaleDateString()}
                    </div>
                    <div style={{ 
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)'
                    }}>
                      ⏱️ {practice.duration} minutes
                    </div>
                    <div style={{ 
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)'
                    }}>
                      🎯 {practice.phases?.length || 0} phases
                    </div>
                    <div style={{ 
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)'
                    }}>
                      📈 {practice.focusAreas?.join(', ') || 'General'}
                    </div>
                  </div>
                  
                  {practice.objective && (
                    <p style={{ 
                      color: 'var(--text-secondary)',
                      fontSize: '0.9rem',
                      fontStyle: 'italic',
                      margin: 0,
                      lineHeight: 1.4
                    }}>
                      "{practice.objective}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Start Practice Button */}
          {selectedPractice && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: 'var(--radius-xl)',
              padding: 'var(--spacing-xl)',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}>
              <button
                onClick={() => startPracticeSession(selectedPractice.id)}
                style={{
                  background: 'linear-gradient(135deg, var(--accent-orange) 0%, #ff8a65 100%)',
                  border: 'none',
                  borderRadius: 'var(--radius-lg)',
                  color: 'white',
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  padding: 'var(--spacing-lg) var(--spacing-xl)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 8px 25px rgba(255, 107, 53, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--spacing-sm)',
                  margin: '0 auto'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 12px 35px rgba(255, 107, 53, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 53, 0.3)';
                }}
              >
                🏐 Start Practice Session
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active session - show practice mode interface
  const currentPhase = getCurrentPhase();

  return (
    <div style={{
      height: isFullscreen ? '100vh' : '100vh',
      width: isFullscreen ? '100vw' : '100vw',
      background: 'linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #0f0f0f 100%)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      position: isFullscreen ? 'fixed' : 'relative',
      top: isFullscreen ? 0 : 'auto',
      left: isFullscreen ? 0 : 'auto',
      zIndex: isFullscreen ? 9999 : 'auto'
    }}>
      {/* Top navigation bar with phase info */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--spacing-md)',
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--glass-border)',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
          <button
            className="glass-button secondary"
            onClick={prevPhase}
            disabled={timer.currentPhaseIndex === 0}
            style={{ padding: '0.5rem' }}
          >
            ◀
          </button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
              {currentPhase ? currentPhase.name : 'Practice Complete'}
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Phase {timer.currentPhaseIndex + 1} of {selectedPractice?.phases?.length || 0}
            </div>
          </div>
          <button
            className="glass-button secondary"
            onClick={nextPhase}
            disabled={!selectedPractice || timer.currentPhaseIndex >= selectedPractice.phases.length - 1}
            style={{ padding: '0.5rem' }}
          >
            ▶
          </button>
        </div>

        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {formatTime(timer.totalElapsed)}
          </div>
          <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Phase: {formatTime(timer.phaseElapsed)}
            {currentPhase?.duration && (
              <span style={{
                color: timer.phaseElapsed >= (currentPhase.duration * 60) ? 'var(--accent-orange)' : 'var(--text-secondary)',
                marginLeft: '8px'
              }}>
                / {formatTime(currentPhase.duration * 60)}
                {timer.phaseElapsed >= (currentPhase.duration * 60) && ' ⏰'}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
          <button
            className={`glass-button ${timer.isRunning ? 'danger' : 'primary'}`}
            onClick={toggleTimer}
          >
            {timer.isRunning ? '⏸️ Pause' : '▶️ Resume'}
          </button>
          <button
            className="glass-button secondary"
            onClick={openAttendanceManager}
            title="Manage Attendance"
          >
            👥 Attendance
          </button>
          <button
            className="glass-button secondary"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? '🗗' : '⛶'}
          </button>
          <button
            className="glass-button secondary"
            onClick={completePractice}
            disabled={isCompletingPractice}
          >
            {isCompletingPractice ? '⏳ Completing...' : '✅ Complete'}
          </button>
        </div>
      </div>

      {/* Main content area */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--spacing-lg)',
        padding: 'var(--spacing-lg)',
        overflow: 'auto'
      }}>
        {/* Left panel - Current phase details */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h2>Current Phase</h2>
          {currentPhase ? (
            <>
              <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <h3>{currentPhase.name}</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--spacing-sm)' }}>
                  <span>Duration: {currentPhase.duration} minutes</span>
                  <span>Type: {currentPhase.type}</span>
                </div>
                {currentPhase.objective && (
                  <p style={{ color: 'var(--text-secondary)' }}>{currentPhase.objective}</p>
                )}
              </div>

              {currentPhase.drills && currentPhase.drills.length > 0 && (
                <div>
                  <h4>Drills for this Phase</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-sm)' }}>
                    {[...new Set(currentPhase.drills)].map(drillId => {
                      const drill = drills.find(d => d.id === drillId);
                      console.log('Rendering drill:', drillId, drill?.name);
                      return (
                        <span
                          key={drillId}
                          onClick={() => {
                            console.log('Drill clicked:', drillId);
                            openDrillModal(drillId);
                          }}
                          style={{
                            background: 'var(--accent-blue)',
                            color: 'white',
                            padding: '6px 12px',
                            borderRadius: '12px',
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            border: '1px solid transparent'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = 'var(--accent-blue-hover)';
                            e.target.style.transform = 'scale(1.05)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'var(--accent-blue)';
                            e.target.style.transform = 'scale(1)';
                          }}
                        >
                          {drill ? drill.name : `Drill ${drillId}`}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
              Practice complete! All phases finished.
            </p>
          )}
        </div>

        {/* Right panel - Notes and controls */}
        <div className="glass-card" style={{ height: 'fit-content' }}>
          <h2>Practice Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="glass-input"
            placeholder="Add notes about this practice session..."
            rows={10}
            style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
          />

          <div>
            <h3>Practice Overview</h3>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <div>Practice: {selectedPractice?.name}</div>
              <div>Total Phases: {selectedPractice?.phases?.length || 0}</div>
              <div>Expected Duration: {selectedPractice?.duration} minutes</div>
              <div>Actual Duration: {Math.floor(timer.totalElapsed / 60)} minutes</div>
            </div>
          </div>
        </div>
      </div>

      {/* Drill Details Modal */}
      {showDrillModal && selectedDrill && (
        <DrillDetailsModal
          drill={selectedDrill}
          isOpen={showDrillModal}
          onClose={closeDrillModal}
          practiceMode={true}
          onDiagramView={openDiagramViewer}
        />
      )}

      {/* Court Diagram Viewer Modal */}
      {(() => {
        console.log('Diagram viewer render check:', {
          showDiagramViewer,
          selectedDrill: selectedDrill?.name,
          hasDiagram: !!selectedDrill?.courtDiagram
        });
        return showDiagramViewer && selectedDrill ? (
          <CourtDiagramViewer
            drill={selectedDrill}
            isOpen={showDiagramViewer}
            onClose={closeDiagramViewer}
            positionTop={true}
          />
        ) : null;
      })()}

      {/* Attendance Modal */}
      {showAttendanceModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAttendanceModal(false);
              setPendingPracticeId(null);
            }
          }}
        >
          <div
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-lg)',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 'var(--spacing-lg)'
            }}>
              <h2 style={{ 
                color: 'var(--accent-orange)', 
                margin: 0,
                fontSize: '1.5rem'
              }}>
                Take Attendance
              </h2>
              <button
                onClick={() => {
                  setShowAttendanceModal(false);
                  setPendingPracticeId(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <p style={{ 
                color: 'var(--text-secondary)', 
                margin: '0 0 var(--spacing-md) 0' 
              }}>
                Mark which players are present for today's practice:
              </p>
              
              <div style={{ 
                maxHeight: '400px', 
                overflow: 'auto',
                border: '1px solid var(--glass-border)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-md)'
              }}>
                {attendance.map(playerAttendance => (
                  <div key={playerAttendance.playerId} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-sm)',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--glass-border)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="checkbox"
                        checked={playerAttendance.attended}
                        onChange={(e) => updateAttendance(playerAttendance.playerId, 'attended', e.target.checked)}
                        style={{ marginRight: 'var(--spacing-sm)' }}
                      />
                      <span style={{ 
                        color: 'var(--text-primary)',
                        fontSize: '1rem',
                        fontWeight: playerAttendance.attended ? '600' : '400'
                      }}>
                        {playerAttendance.playerName}
                      </span>
                    </div>
                    {playerAttendance.attended && (
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <label style={{ 
                          color: 'var(--text-secondary)', 
                          marginRight: 'var(--spacing-xs)',
                          fontSize: '0.9rem'
                        }}>
                          Late (min):
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={playerAttendance.lateMinutes}
                          onChange={(e) => updateAttendance(playerAttendance.playerId, 'lateMinutes', parseInt(e.target.value) || 0)}
                          style={{
                            width: '60px',
                            padding: 'var(--spacing-xs)',
                            border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'var(--glass-bg)',
                            color: 'var(--text-primary)'
                          }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              gap: 'var(--spacing-md)'
            }}>
              <button
                onClick={() => {
                  setShowAttendanceModal(false);
                  setPendingPracticeId(null);
                }}
                style={{
                  flex: 1,
                  padding: 'var(--spacing-md)',
                  background: 'transparent',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => confirmAttendanceAndStart()}
                style={{
                  flex: 2,
                  padding: 'var(--spacing-md)',
                  background: 'var(--accent-orange)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Start Practice ({attendance.filter(a => a.attended).length} present)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance Manager Modal */}
      {showAttendanceManager && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAttendanceManager(false);
            }
          }}
        >
          <div
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-lg)',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 'var(--spacing-lg)'
            }}>
              <h2 style={{ 
                color: 'var(--accent-orange)', 
                margin: 0,
                fontSize: '1.5rem'
              }}>
                Manage Attendance
              </h2>
              <button
                onClick={() => setShowAttendanceManager(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ 
              maxHeight: '500px', 
              overflow: 'auto',
              marginBottom: 'var(--spacing-lg)'
            }}>
              {sessionAttendance.map(record => (
                <div key={record.playerId} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: 'var(--spacing-md)',
                  marginBottom: 'var(--spacing-sm)',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    <div style={{ 
                      fontSize: '1.2rem', 
                      fontWeight: '600',
                      color: 'var(--accent-orange)',
                      minWidth: '40px'
                    }}>
                      #{record.jerseyNumber}
                    </div>
                    <div>
                      <div style={{ 
                        fontWeight: '600',
                        color: 'var(--text-primary)',
                        fontSize: '1rem'
                      }}>
                        {record.playerName}
                      </div>
                      <div style={{ 
                        color: 'var(--text-secondary)', 
                        fontSize: '0.9rem' 
                      }}>
                        {record.position}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 'var(--spacing-md)',
                    flexWrap: 'wrap'
                  }}>
                    <label style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 'var(--spacing-xs)',
                      cursor: 'pointer',
                      color: 'var(--text-primary)'
                    }}>
                      <input
                        type="checkbox"
                        checked={record.attended}
                        onChange={(e) => updateSessionAttendance(record.playerId, 'attended', e.target.checked)}
                        style={{ width: '18px', height: '18px' }}
                      />
                      Present
                    </label>
                    
                    <input
                      type="number"
                      placeholder="Late (min)"
                      min="0"
                      max="120"
                      value={record.lateMinutes || ''}
                      onChange={(e) => updateSessionAttendance(record.playerId, 'lateMinutes', parseInt(e.target.value) || 0)}
                      style={{
                        width: '80px',
                        padding: 'var(--spacing-xs)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--glass-bg)',
                        color: 'var(--text-primary)'
                      }}
                    />
                    
                    <input
                      type="text"
                      placeholder="Notes"
                      value={record.notes || ''}
                      onChange={(e) => updateSessionAttendance(record.playerId, 'notes', e.target.value)}
                      style={{
                        width: '120px',
                        padding: 'var(--spacing-xs)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'var(--glass-bg)',
                        color: 'var(--text-primary)'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              gap: 'var(--spacing-md)'
            }}>
              <button
                onClick={() => setShowAttendanceManager(false)}
                style={{
                  flex: 1,
                  padding: 'var(--spacing-md)',
                  background: 'transparent',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={saveAttendanceChanges}
                style={{
                  flex: 2,
                  padding: 'var(--spacing-md)',
                  background: 'var(--accent-orange)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  color: 'white',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Selection Modal */}
      {showTeamSelection && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              cancelTeamSelection();
            }
          }}
        >
          <div
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--spacing-lg)',
              width: '90%',
              maxWidth: '600px',
              maxHeight: '80vh',
              overflow: 'auto',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: 'var(--spacing-lg)'
            }}>
              <h2 style={{ 
                color: 'var(--accent-orange)', 
                margin: 0,
                fontSize: '1.5rem'
              }}>
                Select Team for Practice
              </h2>
              <button
                onClick={cancelTeamSelection}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-primary)',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <p style={{ 
                color: 'var(--text-secondary)', 
                margin: '0 0 var(--spacing-md) 0' 
              }}>
                Choose which team you want to use for this practice session:
              </p>
              
              <div style={{ 
                display: 'grid',
                gap: 'var(--spacing-md)'
              }}>
                {teams.map(team => (
                  <div
                    key={team.id}
                    onClick={() => handleTeamSelection(team.id)}
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--glass-border)',
                      borderRadius: 'var(--radius-md)',
                      padding: 'var(--spacing-md)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'rgba(255, 107, 53, 0.1)';
                      e.target.style.borderColor = 'var(--accent-orange)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
                      e.target.style.borderColor = 'var(--glass-border)';
                    }}
                  >
                    <div>
                      <div style={{ 
                        color: 'var(--text-primary)',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        marginBottom: '4px'
                      }}>
                        {team.name}
                      </div>
                      <div style={{ 
                        color: 'var(--text-secondary)', 
                        fontSize: '0.9rem' 
                      }}>
                        {team.season} {team.division && `• ${team.division}`}
                      </div>
                      {team.description && (
                        <div style={{ 
                          color: 'var(--text-secondary)', 
                          fontSize: '0.8rem',
                          marginTop: '4px'
                        }}>
                          {team.description}
                        </div>
                      )}
                    </div>
                    <div style={{
                      color: 'var(--accent-orange)',
                      fontSize: '1.2rem'
                    }}>
                      →
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ 
              display: 'flex', 
              justifyContent: 'center'
            }}>
              <button
                onClick={cancelTeamSelection}
                style={{
                  padding: 'var(--spacing-md) var(--spacing-lg)',
                  background: 'transparent',
                  border: '1px solid var(--glass-border)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PracticeMode;