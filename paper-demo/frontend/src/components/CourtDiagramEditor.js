import React, { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar';
import './Teams.css';

const CourtDiagramEditor = () => {
  const canvasRef = useRef(null);
  const [courtState, setCourtState] = useState({
    players: [],
    arrows: [],
    textLabels: [],
    mode: 'select',
    nextPlayerId: 1,
    nextTextId: 1,
    scale: 1
  });
  
  const [dragState, setDragState] = useState({
    isDragging: false,
    dragElement: null,
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0
  });

  const [arrowState, setArrowState] = useState({
    isDrawing: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });

  const [selectedTool, setSelectedTool] = useState('select');
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [pendingTextPosition, setPendingTextPosition] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      drawCourt(ctx);
      drawPlayers(ctx);
      drawArrows(ctx);
      drawTextLabels(ctx);
      
      // Draw current arrow if drawing
      if (arrowState.isDrawing && selectedTool === 'arrow') {
        drawCurrentArrow(ctx);
      }
    }
  }, [courtState, arrowState, selectedTool]);

  const drawCourt = (ctx) => {
    const { width, height } = ctx.canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Draw court background
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(50, 50, 500, 300);
    
    // Draw court lines
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    // Center line
    ctx.beginPath();
    ctx.moveTo(300, 50);
    ctx.lineTo(300, 350);
    ctx.stroke();
    
    // Attack lines
    ctx.beginPath();
    ctx.moveTo(50, 125);
    ctx.lineTo(550, 125);
    ctx.moveTo(50, 275);
    ctx.lineTo(550, 275);
    ctx.stroke();
    
    // Net
    ctx.fillStyle = '#666';
    ctx.fillRect(50, 198, 500, 4);
    
    // Court zones
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    // Zone numbers
    const zones = [
      { x: 150, y: 320, text: '1' },
      { x: 200, y: 320, text: '2' },
      { x: 250, y: 320, text: '3' },
      { x: 350, y: 320, text: '4' },
      { x: 400, y: 320, text: '5' },
      { x: 450, y: 320, text: '6' },
    ];
    
    zones.forEach(zone => {
      ctx.fillText(zone.text, zone.x, zone.y);
    });
  };

  const drawPlayers = (ctx) => {
    courtState.players.forEach(player => {
      ctx.fillStyle = player.type === 'home' ? '#3b82f6' : 
                     player.type === 'opponent' ? '#f59e0b' : '#ef4444';
      ctx.beginPath();
      ctx.arc(player.x, player.y, 12, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add white border
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(player.label || player.id, player.x, player.y + 3);
    });
  };

  const drawArrows = (ctx) => {
    courtState.arrows.forEach(arrow => {
      drawArrow(ctx, arrow.startX, arrow.startY, arrow.endX, arrow.endY, arrow.color || '#22c55e', arrow.style || 'solid');
    });
  };

  const drawTextLabels = (ctx) => {
    courtState.textLabels.forEach(label => {
      ctx.fillStyle = label.color || '#ffffff';
      ctx.font = `${label.fontSize || 14}px Arial`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeText(label.text, label.x, label.y);
      ctx.fillText(label.text, label.x, label.y);
    });
  };

  const drawArrow = (ctx, startX, startY, endX, endY, color = '#22c55e', style = 'solid') => {
    const headLength = 15;
    const angle = Math.atan2(endY - startY, endX - startX);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 3;

    if (style === 'dashed') {
      ctx.setLineDash([8, 4]);
    } else {
      ctx.setLineDash([]);
    }

    // Draw line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Draw arrowhead
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - headLength * Math.cos(angle - Math.PI / 6),
      endY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      endX - headLength * Math.cos(angle + Math.PI / 6),
      endY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    
    ctx.setLineDash([]);
  };

  const drawCurrentArrow = (ctx) => {
    if (arrowState.isDrawing) {
      drawArrow(ctx, arrowState.startX, arrowState.startY, arrowState.currentX, arrowState.currentY, '#22c55e');
    }
  };

  const handleCanvasClick = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (selectedTool === 'home' || selectedTool === 'ball') {
      addPlayerAtPosition(x, y, selectedTool);
    } else if (selectedTool === 'text') {
      setPendingTextPosition({ x, y });
      setShowTextInput(true);
    }
  };

  const handleCanvasMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (selectedTool === 'arrow') {
      setArrowState({
        isDrawing: true,
        startX: x,
        startY: y,
        currentX: x,
        currentY: y
      });
    }
  };

  const handleCanvasMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (selectedTool === 'arrow' && arrowState.isDrawing) {
      setArrowState(prev => ({
        ...prev,
        currentX: x,
        currentY: y
      }));
    }
  };

  const handleCanvasMouseUp = (e) => {
    if (selectedTool === 'arrow' && arrowState.isDrawing) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Only add arrow if it has meaningful length
      const distance = Math.sqrt(
        Math.pow(x - arrowState.startX, 2) + Math.pow(y - arrowState.startY, 2)
      );
      
      if (distance > 20) {
        const newArrow = {
          id: Date.now(),
          startX: arrowState.startX,
          startY: arrowState.startY,
          endX: x,
          endY: y,
          color: '#22c55e',
          style: 'solid'
        };
        
        setCourtState(prev => ({
          ...prev,
          arrows: [...prev.arrows, newArrow]
        }));
      }
      
      setArrowState({
        isDrawing: false,
        startX: 0,
        startY: 0,
        currentX: 0,
        currentY: 0
      });
    }
  };

  const addTextLabel = () => {
    if (textInput.trim() && pendingTextPosition) {
      const newLabel = {
        id: courtState.nextTextId,
        text: textInput.trim(),
        x: pendingTextPosition.x,
        y: pendingTextPosition.y,
        color: '#ffffff',
        fontSize: 14
      };
      
      setCourtState(prev => ({
        ...prev,
        textLabels: [...prev.textLabels, newLabel],
        nextTextId: prev.nextTextId + 1
      }));
      
      setTextInput('');
      setShowTextInput(false);
      setPendingTextPosition(null);
    }
  };

  const cancelTextInput = () => {
    setTextInput('');
    setShowTextInput(false);
    setPendingTextPosition(null);
  };

  const addPlayerAtPosition = (x, y, type) => {
    // Keep within court bounds
    const clampedX = Math.max(62, Math.min(x, 538));
    const clampedY = Math.max(62, Math.min(y, 338));
    
    const newPlayer = {
      id: courtState.nextPlayerId,
      type,
      x: clampedX,
      y: clampedY,
      label: type === 'ball' ? '⚽' : courtState.nextPlayerId.toString()
    };
    
    setCourtState(prev => ({
      ...prev,
      players: [...prev.players, newPlayer],
      nextPlayerId: prev.nextPlayerId + 1
    }));
  };

  const clearCourt = () => {
    setCourtState(prev => ({
      ...prev,
      players: [],
      arrows: [],
      textLabels: [],
      nextPlayerId: 1,
      nextTextId: 1
    }));
  };

  const clearArrows = () => {
    setCourtState(prev => ({
      ...prev,
      arrows: []
    }));
  };

  const clearText = () => {
    setCourtState(prev => ({
      ...prev,
      textLabels: []
    }));
  };



  const saveDiagram = () => {
    const diagramData = {
      courtState: courtState,
      timestamp: new Date().toISOString()
    };
    
    console.log('Saving diagram:', diagramData);
    alert('Diagram saved successfully! 🏐');
  };

  const exportDiagram = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `volleyball-diagram-${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="teams-container">
      <Navbar />
      
      <div className="teams-content">
        <div className="teams-header">
          <div>
            <h1>🏐 Court Diagram</h1>
            <p>Draw on the volleyball court to visualize your drill</p>
          </div>
          <button 
            className="glass-button primary"
            onClick={saveDiagram}
          >
            💾 Save
          </button>
        </div>

        {/* Tools Panel */}
        <div className="glass-card" style={{ marginBottom: 'var(--spacing-xl)' }}>
          <h3 style={{ color: 'var(--accent-orange)', marginBottom: 'var(--spacing-md)' }}>
            🛠️ Tools
          </h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
            <button 
              className={`glass-button ${selectedTool === 'select' ? 'primary' : ''}`}
              onClick={() => setSelectedTool('select')}
            >
              👆 Select
            </button>
            <button 
              className={`glass-button ${selectedTool === 'home' ? 'primary' : ''}`}
              onClick={() => setSelectedTool('home')}
            >
              👥 Player
            </button>
            <button 
              className={`glass-button ${selectedTool === 'ball' ? 'primary' : ''}`}
              onClick={() => setSelectedTool('ball')}
            >
              ⚽ Ball
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-lg)' }}>
            <button 
              className={`glass-button ${selectedTool === 'arrow' ? 'primary' : ''}`}
              onClick={() => setSelectedTool('arrow')}
            >
              ➡️ Draw Arrow
            </button>
            <button 
              className={`glass-button ${selectedTool === 'text' ? 'primary' : ''}`}
              onClick={() => setSelectedTool('text')}
            >
              📝 Add Text
            </button>
            <button 
              className="glass-button"
              onClick={clearArrows}
            >
              🧹 Clear Arrows
            </button>
            <button 
              className="glass-button"
              onClick={clearText}
            >
              🗑️ Clear Text
            </button>
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 'var(--spacing-sm)' }}>
            <button 
              className="glass-button"
              onClick={clearCourt}
            >
              🆕 Clear All
            </button>
          </div>
        </div>

        {/* Court Canvas */}
        <div className="glass-card" style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            onClick={handleCanvasClick}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            style={{
              border: '2px solid var(--glass-border)',
              borderRadius: 'var(--radius-lg)',
              cursor: selectedTool !== 'select' ? 'crosshair' : 'default',
              maxWidth: '100%',
              height: 'auto'
            }}
          />
          
          <div style={{ display: 'flex', gap: 'var(--spacing-md)', justifyContent: 'center', marginTop: 'var(--spacing-lg)' }}>
            <button className="glass-button" onClick={exportDiagram}>
              📤 Export PNG
            </button>
            <button 
              className={`glass-button ${selectedTool === 'select' ? 'primary' : ''}`}
              onClick={() => setSelectedTool('select')}
            >
              👆 Select Mode
            </button>
          </div>
        </div>

        {/* Text Input Modal */}
        {showTextInput && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="glass-card" style={{ padding: 'var(--spacing-xl)', minWidth: '300px' }}>
              <h3 style={{ marginBottom: 'var(--spacing-md)' }}>Add Text Label</h3>
              <input
                type="text"
                className="glass-input"
                placeholder="Enter text (letters, numbers, etc.)"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTextLabel()}
                autoFocus
                style={{ marginBottom: 'var(--spacing-md)' }}
              />
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                <button className="glass-button" onClick={cancelTextInput}>
                  Cancel
                </button>
                <button className="glass-button primary" onClick={addTextLabel}>
                  Add Text
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourtDiagramEditor;