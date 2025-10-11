import React, { useEffect, useRef } from 'react';

const CourtDiagramPreview = ({ diagram, onClick, onEditClick, style = {}, showEditButton = true, highQuality = false }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && diagram) {
      const ctx = canvas.getContext('2d');
      drawCourt(ctx);
      drawPlayers(ctx, diagram.players || []);
      drawArrows(ctx, diagram.arrows || []);
      drawTextLabels(ctx, diagram.textLabels || []);
    }
  }, [diagram]);

  const drawCourt = (ctx) => {
    const { width, height } = ctx.canvas;
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    
    // Use different scaling based on quality mode
    const scale = highQuality ? 1.0 : 0.5; // Full scale for high quality, 0.5x for preview
    
    // Scaled court dimensions
    const courtWidth = 525 * scale;   
    const courtHeight = 270 * scale;   
    const courtX = 37 * scale;       
    const courtY = 52 * scale;
    
    // Draw court background (wood/indoor court color)
    ctx.fillStyle = '#D2691E';
    ctx.fillRect(courtX, courtY, courtWidth, courtHeight);
    
    // Draw court boundary
    ctx.strokeStyle = 'white';
    ctx.lineWidth = highQuality ? 6 : 3; // Thicker lines for high quality
    ctx.beginPath();
    ctx.rect(courtX, courtY, courtWidth, courtHeight);
    ctx.stroke();
    
    // Center line (net line)
    ctx.lineWidth = highQuality ? 4 : 2;
    ctx.beginPath();
    ctx.moveTo(courtX + courtWidth/2, courtY);
    ctx.lineTo(courtX + courtWidth/2, courtY + courtHeight);
    ctx.stroke();
    
    // Attack lines - REMOVED for cleaner look
    // const attackLineDistance = courtWidth * 0.167;
    // ctx.beginPath();
    // ctx.moveTo(courtX + courtWidth/2 - attackLineDistance, courtY);
    // ctx.lineTo(courtX + courtWidth/2 - attackLineDistance, courtY + courtHeight);
    // ctx.moveTo(courtX + courtWidth/2 + attackLineDistance, courtY);
    // ctx.lineTo(courtX + courtWidth/2 + attackLineDistance, courtY + courtHeight);
    // ctx.stroke();
    
    // Attack lines
    const attackLineDistance = courtWidth * 0.167;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(courtX + courtWidth/2 - attackLineDistance, courtY);
    ctx.lineTo(courtX + courtWidth/2 - attackLineDistance, courtY + courtHeight);
    ctx.moveTo(courtX + courtWidth/2 + attackLineDistance, courtY);
    ctx.lineTo(courtX + courtWidth/2 + attackLineDistance, courtY + courtHeight);
    ctx.stroke();
    
  };

  const drawPlayers = (ctx, players) => {
    const scale = highQuality ? 1.0 : 0.5; // Use same scaling as court
    
    players.forEach(player => {
      // Scale coordinates based on quality mode
      const x = player.x * scale;
      const y = player.y * scale;
      
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
      ctx.arc(x, y, 8 * scale, 0, 2 * Math.PI);  // Dynamic radius based on quality
      ctx.fill();
      
      // Border color - black for white ball, white otherwise
      ctx.strokeStyle = player.type === 'ball' ? '#000000' : 'white';
      ctx.lineWidth = 1.5 * scale;  // Dynamic line width based on quality
      ctx.stroke();
      
      // Draw label if not a ball
      if (player.label && player.type !== 'ball') {
        ctx.fillStyle = 'white';
        ctx.font = `${12 * scale}px Arial`;  // Dynamic font size based on quality
        ctx.textAlign = 'center';
        ctx.fillText(player.label, x, y + (3 * scale));
      }
    });
  };

  const drawArrows = (ctx, arrows) => {
    const scale = highQuality ? 1.0 : 0.5;
    
    arrows.forEach(arrow => {
      // Dynamic scale based on quality
      const startX = arrow.startX * scale;
      const startY = arrow.startY * scale;
      const endX = arrow.endX * scale;
      const endY = arrow.endY * scale;
      
      const headLength = 15 * scale;  // Dynamic arrow head size based on quality
      const angle = Math.atan2(endY - startY, endX - startX);

      ctx.strokeStyle = arrow.color || '#22c55e';
      ctx.fillStyle = arrow.color || '#22c55e';
      ctx.lineWidth = 3 * scale;  // Dynamic line width based on quality

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
    });
  };

  const drawTextLabels = (ctx, labels) => {
    if (!labels || !Array.isArray(labels)) return;
    
    const scale = highQuality ? 1.0 : 0.5;
    
    labels.forEach(label => {
      // Dynamic scale based on quality
      const x = label.x * scale;
      const y = label.y * scale;
      
      ctx.fillStyle = label.color || '#ffffff';
      ctx.font = `${16 * scale}px Arial`;  // Dynamic font size based on quality
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 1.5 * scale;  // Dynamic line width based on quality
      ctx.strokeText(label.text, x, y);
      ctx.fillText(label.text, x, y);
    });
  };  return (
    <div style={{ width: '400px', flexShrink: 0, ...style }}>
      <label style={{
        display: 'block',
        marginBottom: 'var(--spacing-sm)',
        fontSize: '1rem',
        fontWeight: '600',
        color: 'var(--accent-orange)'
      }}>
        {/* Court Diagram */}
      </label>
      <div 
        style={{
          position: 'relative',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--radius-sm)',
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.05)',
          padding: '8px',
          width: '100%',
          cursor: onClick ? 'pointer' : 'default'
        }}
      >
        <canvas
          ref={canvasRef}
          width={highQuality ? 600 : 300}
          height={highQuality ? 375 : 188}
          onClick={onClick}
          style={{
            width: '100%',
            display: 'block',
            cursor: onClick ? 'pointer' : 'default'
          }}
        />
      </div>
      {/* Edit button in top right corner */}
      {showEditButton && onEditClick && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditClick(e);
          }}
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '24px',
            height: '24px',
            borderRadius: '4px',
            border: '1px solid var(--glass-border)',
            background: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px',
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
          title="Edit diagram"
        >
          ✏️
        </button>
      )}
    </div>
  );
};

export default CourtDiagramPreview;