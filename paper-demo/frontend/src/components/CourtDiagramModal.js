import React, { useState, useEffect, useRef } from 'react';
import './Teams.css';

const CourtDiagramModal = ({ isOpen, onClose, onSave, initialDiagram = null }) => {
  const canvasRef = useRef(null);
  const [courtState, setCourtState] = useState({
    players: [],
    arrows: [],
    textLabels: [],
    nextPlayerId: 1,
    nextTextId: 1
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
  const [showPositionSelector, setShowPositionSelector] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  
  // Drag state for select tool
  const [dragState, setDragState] = useState({
    isDragging: false,
    hasMoved: false, // Track if actual movement occurred during drag
    draggedItem: null,
    draggedType: null, // 'player', 'arrow', 'text'
    startX: 0,
    startY: 0,
    offsetX: 0,
    offsetY: 0,
    totalDistance: 0 // Track total distance moved during drag
  });

  // Load initial diagram if provided
  useEffect(() => {
    if (initialDiagram && isOpen) {
      // Calculate next IDs safely
      const playerIds = initialDiagram.players?.map(p => p.id).filter(id => typeof id === 'number' && !isNaN(id)) || [];
      const textIds = initialDiagram.textLabels?.map(t => t.id).filter(id => typeof id === 'number' && !isNaN(id)) || [];
      
      const nextPlayerId = playerIds.length > 0 ? Math.max(...playerIds) + 1 : 1;
      const nextTextId = textIds.length > 0 ? Math.max(...textIds) + 1 : 1;
      
      setCourtState(prev => ({
        ...prev,
        ...initialDiagram,
        nextPlayerId: nextPlayerId,
        nextTextId: nextTextId
      }));
    }
  }, [initialDiagram, isOpen]);

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [courtState, arrowState, selectedTool, isOpen]);

  const drawCourt = (ctx) => {
    const { width, height } = ctx.canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Court dimensions (volleyball court is 18m x 9m, scaled to fit canvas)
    const courtWidth = 525;
    const courtHeight = 270;
    const courtX = 37;
    const courtY = 52;
    
    // Draw court background (wood/indoor court color)
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(courtX, courtY, courtWidth, courtHeight);
    
    // Draw court boundary lines
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.rect(courtX, courtY, courtWidth, courtHeight);
    ctx.stroke();
    
    // Center line (net line)
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(courtX + courtWidth/2, courtY);
    ctx.lineTo(courtX + courtWidth/2, courtY + courtHeight);
    ctx.stroke();
    
    // Attack lines (3m from center line on each side) - REMOVED
    // const attackLineDistance = courtWidth * 0.167; // 3m out of 18m court = 0.167
    // ctx.strokeStyle = 'white';
    // ctx.lineWidth = 2;
    
    // Left attack line - REMOVED
    // ctx.beginPath();
    // ctx.moveTo(courtX + courtWidth/2 - attackLineDistance, courtY);
    // ctx.lineTo(courtX + courtWidth/2 - attackLineDistance, courtY + courtHeight);
    // ctx.stroke();
    
    // Right attack line - REMOVED
    // ctx.beginPath();
    // ctx.moveTo(courtX + courtWidth/2 + attackLineDistance, courtY);
    // ctx.lineTo(courtX + courtWidth/2 + attackLineDistance, courtY + courtHeight);
    // ctx.stroke();
    
    // Net (thick black line in center)
    // ctx.fillStyle = '#333';
    // ctx.fillRect(courtX, courtY + courtHeight/2 - 2, courtWidth, 4);
    
    // Attack lines (3m from center line on each side)
    const attackLineDistance = courtWidth * 0.167; // 3m out of 18m court = 0.167
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    // Left attack line
    ctx.beginPath();
    ctx.moveTo(courtX + courtWidth/2 - attackLineDistance, courtY);
    ctx.lineTo(courtX + courtWidth/2 - attackLineDistance, courtY + courtHeight);
    ctx.stroke();
    
    // Right attack line  
    ctx.beginPath();
    ctx.moveTo(courtX + courtWidth/2 + attackLineDistance, courtY);
    ctx.lineTo(courtX + courtWidth/2 + attackLineDistance, courtY + courtHeight);
    ctx.stroke();
    
    // Net (thick black line in center)
    // ctx.fillStyle = '#333';
    // ctx.fillRect(courtX, courtY + courtHeight/2 - 2, courtWidth, 4);
    
    // Net posts
    // ctx.fillStyle = '#666';
    // ctx.fillRect(courtX - 5, courtY + courtHeight/2 - 8, 5, 16);
    // ctx.fillRect(courtX + courtWidth, courtY + courtHeight/2 - 8, 5, 16);
    
    // Service zones (behind baseline)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    
    // Service zone lines
    ctx.beginPath();
    ctx.moveTo(courtX, courtY - 15);
    ctx.lineTo(courtX + courtWidth, courtY - 15);
    ctx.moveTo(courtX, courtY + courtHeight + 15);
    ctx.lineTo(courtX + courtWidth, courtY + courtHeight + 15);
    ctx.stroke();
    
    ctx.setLineDash([]); // Reset dash
    
    // Position numbers - REMOVED for cleaner look
    // ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    // ctx.font = '12px Arial';
    // ctx.textAlign = 'center';
  };

  const drawPlayers = (ctx) => {
    courtState.players.forEach(player => {
      const isBeingDragged = dragState.isDragging && 
                           dragState.draggedType === 'player' && 
                           dragState.draggedItem.id === player.id;
      
      // Determine color based on type and position
      let fillColor;
      if (player.type === 'ball') {
        fillColor = 'white';
      } else if (player.label === 'Coach') {
        fillColor = '#8b5cf6'; // Purple
      } else if (player.label === 'L') {
        fillColor = '#ef4444'; // Red
      } else {
        fillColor = player.type === 'home' ? '#3b82f6' : '#ef4444';
      }
      
      ctx.fillStyle = fillColor;
      ctx.beginPath();
      ctx.arc(player.x, player.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Add border - yellow if being dragged, black for white ball, white otherwise
      let strokeColor;
      if (isBeingDragged) {
        strokeColor = '#fbbf24';
      } else if (player.type === 'ball') {
        strokeColor = '#000000'; // Black border for white ball
      } else {
        strokeColor = 'white';
      }
      
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = isBeingDragged ? 3 : 1;
      ctx.stroke();
      
      // Add selection highlight if being dragged
      if (isBeingDragged) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(player.x, player.y, 12, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      
      // Draw label if not a ball
      if (player.label && player.type !== 'ball') {
        ctx.fillStyle = 'white';
        ctx.font = '8px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(player.label, player.x, player.y + 2);
      }
    });
  };

  const drawArrows = (ctx) => {
    courtState.arrows.forEach(arrow => {
      const isBeingDragged = dragState.isDragging && 
                           dragState.draggedType === 'arrow' && 
                           dragState.draggedItem.id === arrow.id;
      
      const color = isBeingDragged ? '#fbbf24' : (arrow.color || '#22c55e');
      drawArrow(ctx, arrow.startX, arrow.startY, arrow.endX, arrow.endY, color);
      
      // Add selection highlight if being dragged
      if (isBeingDragged) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(arrow.startX, arrow.startY);
        ctx.lineTo(arrow.endX, arrow.endY);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    });
  };

  const drawTextLabels = (ctx) => {
    courtState.textLabels.forEach(label => {
      const isBeingDragged = dragState.isDragging && 
                           dragState.draggedType === 'text' && 
                           dragState.draggedItem.id === label.id;
      
      const color = isBeingDragged ? '#fbbf24' : (label.color || '#ffffff');
      
      ctx.fillStyle = color;
      ctx.font = `${label.fontSize || 12}px Arial`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = isBeingDragged ? '#fbbf24' : '#000000';
      ctx.lineWidth = isBeingDragged ? 2 : 1;
      ctx.strokeText(label.text, label.x, label.y);
      ctx.fillText(label.text, label.x, label.y);
      
      // Add selection highlight if being dragged
      if (isBeingDragged) {
        const textMetrics = ctx.measureText(label.text);
        const textHeight = parseInt(label.fontSize || 12);
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.strokeRect(
          label.x - textMetrics.width/2 - 3, 
          label.y - textHeight + 2, 
          textMetrics.width + 6, 
          textHeight + 4
        );
        ctx.setLineDash([]);
      }
    });
  };

  const drawArrow = (ctx, startX, startY, endX, endY, color = '#22c55e') => {
    const headLength = 10;
    const angle = Math.atan2(endY - startY, endX - startX);

    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;

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
  };

  const drawCurrentArrow = (ctx) => {
    if (arrowState.isDrawing) {
      drawArrow(ctx, arrowState.startX, arrowState.startY, arrowState.currentX, arrowState.currentY, '#22c55e');
    }
  };

  // Helper functions for drag functionality
  const findPlayerAtPoint = (x, y) => {
    return courtState.players.find(player => {
      const distance = Math.sqrt((player.x - x) ** 2 + (player.y - y) ** 2);
      return distance <= 15; // 15px radius for selection
    });
  };

  const findTextLabelAtPoint = (x, y) => {
    return courtState.textLabels.find(label => {
      const distance = Math.sqrt((label.x - x) ** 2 + (label.y - y) ** 2);
      return distance <= 20; // 20px radius for text selection
    });
  };

  const findArrowAtPoint = (x, y) => {
    return courtState.arrows.find(arrow => {
      // Check if point is near the arrow line
      const A = { x: arrow.startX, y: arrow.startY };
      const B = { x: arrow.endX, y: arrow.endY };
      const P = { x, y };
      
      // Calculate distance from point to line segment
      const AB = { x: B.x - A.x, y: B.y - A.y };
      const AP = { x: P.x - A.x, y: P.y - A.y };
      const ABSquared = AB.x * AB.x + AB.y * AB.y;
      
      if (ABSquared === 0) return false;
      
      const t = Math.max(0, Math.min(1, (AP.x * AB.x + AP.y * AB.y) / ABSquared));
      const projection = { x: A.x + t * AB.x, y: A.y + t * AB.y };
      const distance = Math.sqrt((P.x - projection.x) ** 2 + (P.y - projection.y) ** 2);
      
      return distance <= 10; // 10px threshold for arrow selection
    });
  };

  const findItemAtPoint = (x, y) => {
    // Check in order of priority: players, text labels, arrows
    const player = findPlayerAtPoint(x, y);
    if (player) return { item: player, type: 'player' };
    
    const textLabel = findTextLabelAtPoint(x, y);
    if (textLabel) return { item: textLabel, type: 'text' };
    
    const arrow = findArrowAtPoint(x, y);
    if (arrow) return { item: arrow, type: 'arrow' };
    
    return null;
  };

  // Check if coordinates are within the court boundaries
  const isWithinCourt = (x, y) => {
    const courtX = 37;
    const courtY = 52;
    const courtWidth = 525;
    const courtHeight = 270;
    
    return x >= courtX && x <= courtX + courtWidth && 
           y >= courtY && y <= courtY + courtHeight;
  };

    const handleCanvasClick = (e) => {
    // Don't handle clicks if we just finished dragging
    if (dragState.hasMoved) {
      return;
    }
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Account for canvas scaling by calculating the scale factor
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // In select mode, check if clicking on a player to change position
    if (selectedTool === 'select') {
      const foundItem = findItemAtPoint(x, y);
      if (foundItem && foundItem.type === 'player' && foundItem.item.type !== 'ball') {
        setSelectedPlayer(foundItem.item);
        setShowPositionSelector(true);
        return;
      }
    }
    
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
    
    // Account for canvas scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    if (selectedTool === 'select') {
      const foundItem = findItemAtPoint(x, y);
      if (foundItem) {
        // Start dragging with proper offset calculation for each type
        let offsetX, offsetY;
        
        if (foundItem.type === 'arrow') {
          // For arrows, use the start point as reference
          offsetX = x - foundItem.item.startX;
          offsetY = y - foundItem.item.startY;
        } else {
          // For players and text, use their x,y coordinates
          offsetX = x - foundItem.item.x;
          offsetY = y - foundItem.item.y;
        }
        
        setDragState({
          isDragging: true,
          hasMoved: false, // Initialize as false - will be set to true if movement occurs
          draggedItem: foundItem.item,
          draggedType: foundItem.type,
          startX: x,
          startY: y,
          offsetX: offsetX,
          offsetY: offsetY,
          totalDistance: 0
        });
      }
    } else if (selectedTool === 'arrow') {
      // Allow drawing arrows anywhere on the canvas
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
    
    // Account for canvas scaling
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    // Update cursor based on tool and location
    if (selectedTool === 'select' && !dragState.isDragging) {
      const foundItem = findItemAtPoint(x, y);
      canvas.style.cursor = foundItem ? 'move' : 'default';
    } else if (selectedTool === 'select' && dragState.isDragging) {
      canvas.style.cursor = 'grabbing';
    } else if (selectedTool !== 'select') {
      // For placing tools, show crosshair anywhere on canvas
      canvas.style.cursor = 'crosshair';
    }
    
    if (selectedTool === 'select' && dragState.isDragging) {
      // Update dragged item position
      const newX = x - dragState.offsetX;
      const newY = y - dragState.offsetY;
      
      // Calculate distance moved in this mouse move
      const deltaX = x - dragState.startX;
      const deltaY = y - dragState.startY;
      const distanceFromStart = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // Mark that we've actually moved if we've moved more than 3 pixels from start
      if (distanceFromStart > 3) {
        setDragState(prev => ({ 
          ...prev, 
          hasMoved: true,
          totalDistance: distanceFromStart
        }));
      }
      
      if (dragState.draggedType === 'player') {
        setCourtState(prev => ({
          ...prev,
          players: prev.players.map(player =>
            player.id === dragState.draggedItem.id
              ? { ...player, x: newX, y: newY }
              : player
          )
        }));
      } else if (dragState.draggedType === 'text') {
        setCourtState(prev => ({
          ...prev,
          textLabels: prev.textLabels.map(label =>
            label.id === dragState.draggedItem.id
              ? { ...label, x: newX, y: newY }
              : label
          )
        }));
      } else if (dragState.draggedType === 'arrow') {
        // Calculate new position based on drag offset
        const newStartX = x - dragState.offsetX;
        const newStartY = y - dragState.offsetY;
        const deltaX = newStartX - dragState.draggedItem.startX;
        const deltaY = newStartY - dragState.draggedItem.startY;
        
        setCourtState(prev => ({
          ...prev,
          arrows: prev.arrows.map(arrow =>
            arrow.id === dragState.draggedItem.id
              ? { 
                  ...arrow, 
                  startX: dragState.draggedItem.startX + deltaX,
                  startY: dragState.draggedItem.startY + deltaY,
                  endX: dragState.draggedItem.endX + deltaX,
                  endY: dragState.draggedItem.endY + deltaY
                }
              : arrow
          )
        }));
      }
    } else if (selectedTool === 'arrow' && arrowState.isDrawing) {
      setArrowState(prev => ({
        ...prev,
        currentX: x,
        currentY: y
      }));
    }
  };

  const handleCanvasMouseUp = (e) => {
    const canvas = canvasRef.current;
    
    if (selectedTool === 'select' && dragState.isDragging) {
      const wasMoving = dragState.hasMoved;
      
      // End dragging and reset cursor
      setDragState({
        isDragging: false,
        hasMoved: wasMoving, // Keep the hasMoved flag temporarily for click handler
        draggedItem: null,
        draggedType: null,
        startX: 0,
        startY: 0,
        offsetX: 0,
        offsetY: 0,
        totalDistance: 0
      });
      
      // Reset hasMoved flag after a brief delay to allow click handler to check it
      if (wasMoving) {
        setTimeout(() => {
          setDragState(prev => ({ ...prev, hasMoved: false }));
        }, 10);
      }
      
      canvas.style.cursor = 'default';
    } else if (selectedTool === 'arrow' && arrowState.isDrawing) {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      
      // Account for canvas scaling
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const x = (e.clientX - rect.left) * scaleX;
      const y = (e.clientY - rect.top) * scaleY;
      
      // Only add arrow if it has meaningful length
      const distance = Math.sqrt(
        Math.pow(x - arrowState.startX, 2) + Math.pow(y - arrowState.startY, 2)
      );
      
      if (distance > 15) {
        const newArrow = {
          id: Date.now(),
          startX: arrowState.startX,
          startY: arrowState.startY,
          endX: x,
          endY: y,
          color: '#22c55e'
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
        fontSize: 12
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
    // Allow placing players anywhere on the canvas (no clamping to court boundaries)
    const newPlayer = {
      id: courtState.nextPlayerId,
      type,
      x: x,
      y: y,
      label: type === 'ball' ? '⚽' : 'Player',
      position: type === 'ball' ? null : 'Player' // Default position
    };
    
    setCourtState(prev => ({
      ...prev,
      players: [...prev.players, newPlayer],
      nextPlayerId: prev.nextPlayerId + 1
    }));
  };

  const updatePlayerPosition = (playerId, position) => {
    setCourtState(prev => ({
      ...prev,
      players: prev.players.map(player =>
        player.id === playerId
          ? { ...player, position: position, label: position }
          : player
      )
    }));
  };

  const removePlayer = (playerId) => {
    setCourtState(prev => ({
      ...prev,
      players: prev.players.filter(player => player.id !== playerId)
    }));
  };

  const clearAll = () => {
    setCourtState(prev => ({
      ...prev,
      players: [],
      arrows: [],
      textLabels: [],
      nextPlayerId: 1,
      nextTextId: 1
    }));
  };

  const handleSave = () => {
    onSave(courtState);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
        <div className="modal-header">
          <h2>🏐 Court Diagram</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body">
          {/* Tools Panel */}
          <div className="glass-card" style={{ marginBottom: 'var(--spacing-md)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
              <button 
                className={`glass-button ${selectedTool === 'select' ? 'primary' : ''}`}
                onClick={() => setSelectedTool('select')}
              >
                👆
              </button>
              <button 
                className={`glass-button ${selectedTool === 'home' ? 'primary' : ''}`}
                onClick={() => setSelectedTool('home')}
              >
                👥
              </button>
              <button 
                className={`glass-button ${selectedTool === 'ball' ? 'primary' : ''}`}
                onClick={() => setSelectedTool('ball')}
              >
                ⚽
              </button>
              <button 
                className={`glass-button ${selectedTool === 'arrow' ? 'primary' : ''}`}
                onClick={() => setSelectedTool('arrow')}
              >
                ➡️
              </button>
              <button 
                className={`glass-button ${selectedTool === 'text' ? 'primary' : ''}`}
                onClick={() => setSelectedTool('text')}
              >
                📝
              </button>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="glass-button" onClick={clearAll} style={{ background: 'var(--danger-red)', color: 'white' }}>
                🆕 Clear All
              </button>
            </div>
          </div>

          {/* Court Canvas */}
          <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-lg)' }}>
            <canvas
              ref={canvasRef}
              width={600}
              height={375}
              onClick={handleCanvasClick}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              style={{
                border: '2px solid var(--glass-border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'default',
                display: 'block',
                maxWidth: '100%',
                height: 'auto'
              }}
            />
          </div>
        </div>

        <div className="modal-footer">
          <button className="glass-button" onClick={onClose}>Cancel</button>
          <button className="glass-button primary" onClick={handleSave}>Save Diagram</button>
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
            zIndex: 1001
          }}>
            <div className="glass-card" style={{ padding: 'var(--spacing-lg)', minWidth: '250px' }}>
              <h4 style={{ marginBottom: 'var(--spacing-md)' }}>Add Text</h4>
              <input
                type="text"
                className="glass-input"
                placeholder="Enter text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTextLabel()}
                autoFocus
                style={{ marginBottom: 'var(--spacing-md)' }}
              />
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                <button className="glass-button" onClick={cancelTextInput}>Cancel</button>
                <button className="glass-button primary" onClick={addTextLabel}>Add</button>
              </div>
            </div>
          </div>
        )}

        {/* Position Selector Modal */}
        {showPositionSelector && selectedPlayer && (
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
            zIndex: 1001
          }}>
            <div className="glass-card" style={{ padding: 'var(--spacing-lg)', minWidth: '250px' }}>
              <h4 style={{ marginBottom: 'var(--spacing-md)' }}>Select Player Position</h4>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(2, 1fr)', 
                gap: 'var(--spacing-sm)', 
                marginBottom: 'var(--spacing-md)' 
              }}>
                {['OH', 'S', 'Coach', 'L', 'DS', 'M', 'OP', 'Player'].map(position => (
                  <button
                    key={position}
                    className="glass-button"
                    onClick={() => {
                      updatePlayerPosition(selectedPlayer.id, position);
                      setShowPositionSelector(false);
                      setSelectedPlayer(null);
                    }}
                    style={{ 
                      padding: 'var(--spacing-sm)',
                      background: selectedPlayer.position === position ? 'var(--accent-blue)' : 'var(--glass-bg)'
                    }}
                  >
                    {position}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'space-between' }}>
                <button 
                  className="glass-button" 
                  onClick={() => {
                    removePlayer(selectedPlayer.id);
                    setShowPositionSelector(false);
                    setSelectedPlayer(null);
                  }}
                  style={{ 
                    background: 'var(--danger-red)',
                    color: 'white'
                  }}
                >
                  Remove Player
                </button>
                <button 
                  className="glass-button" 
                  onClick={() => {
                    setShowPositionSelector(false);
                    setSelectedPlayer(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CourtDiagramModal;