import React from 'react';

const CourtDiagramViewer = ({ diagram, isOpen, onClose, positionTop = false }) => {
  if (!isOpen || !diagram) return null;

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
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: positionTop ? 'flex-start' : 'center',
        zIndex: 2000,
        padding: positionTop ? '2rem 2rem 0 2rem' : '2rem'
      }}
    >
      <div 
        style={{
          position: 'relative',
          maxWidth: '95vw',
          maxHeight: '95vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '-50px',
            right: '0',
            background: 'rgba(255, 255, 255, 0.9)',
            border: 'none',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            fontSize: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#333',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.3)',
            zIndex: 2001
          }}
          onMouseEnter={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 1)';
            e.target.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.target.style.background = 'rgba(255, 255, 255, 0.9)';
            e.target.style.transform = 'scale(1)';
          }}
        >
          ✕
        </button>

        {/* Large diagram viewer */}
        <CourtDiagramDisplay 
          diagram={diagram}
          style={{
            maxWidth: '90vw',
            maxHeight: '85vh',
            border: '3px solid var(--glass-border)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)'
          }}
        />
        
        {/* Title */}
        <div style={{
          marginTop: '1rem',
          padding: '0.5rem 1rem',
          background: 'rgba(255, 255, 255, 0.9)',
          borderRadius: 'var(--radius-md)',
          color: '#333',
          fontWeight: '600',
          fontSize: '1.1rem'
        }}>
          Court Diagram - Click outside to close
        </div>
      </div>
    </div>
  );
};

// Reusable component for displaying court diagrams at any size
const CourtDiagramDisplay = ({ diagram, style = {} }) => {
  const canvasRef = React.useRef(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && diagram) {
      const ctx = canvas.getContext('2d');
      
      // Set high DPI for crisp rendering
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      
      ctx.scale(dpr, dpr);
      
      drawCourt(ctx, canvas.width / dpr, canvas.height / dpr);
      
      // Calculate the scale factor for converting from modal coordinates (600x375) to viewer coordinates
      const modalWidth = 600;
      const modalHeight = 375;
      const viewerWidth = canvas.width / dpr;
      const viewerHeight = canvas.height / dpr;
      
      // Scale to fit the entire modal canvas area (not just the court)
      const scaleX = viewerWidth / modalWidth;
      const scaleY = viewerHeight / modalHeight;
      const scale = Math.min(scaleX, scaleY); // Use uniform scaling to maintain aspect ratio
      
      if (diagram.players) {
        drawPlayers(ctx, diagram.players, scale, viewerWidth, viewerHeight);
      }
      if (diagram.arrows) {
        drawArrows(ctx, diagram.arrows, scale, viewerWidth, viewerHeight);
      }
      if (diagram.textLabels) {
        drawTextLabels(ctx, diagram.textLabels, scale, viewerWidth, viewerHeight);
      }
    }
  }, [diagram]);

  const drawCourt = (ctx, canvasWidth, canvasHeight) => {
    // Calculate court dimensions to fit canvas while maintaining aspect ratio
    const courtAspectRatio = 525 / 270; // Original court aspect ratio
    const canvasAspectRatio = canvasWidth / canvasHeight;
    
    let courtWidth, courtHeight, courtX, courtY;
    
    if (canvasAspectRatio > courtAspectRatio) {
      // Canvas is wider than court aspect ratio
      courtHeight = canvasHeight * 0.8;
      courtWidth = courtHeight * courtAspectRatio;
      courtX = (canvasWidth - courtWidth) / 2;
      courtY = (canvasHeight - courtHeight) / 2;
    } else {
      // Canvas is taller than court aspect ratio
      courtWidth = canvasWidth * 0.9;
      courtHeight = courtWidth / courtAspectRatio;
      courtX = (canvasWidth - courtWidth) / 2;
      courtY = (canvasHeight - courtHeight) / 2;
    }

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw court background
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
    
    // Attack lines
    const attackLineDistance = courtWidth * 0.167;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(courtX + courtWidth/2 - attackLineDistance, courtY);
    ctx.lineTo(courtX + courtWidth/2 - attackLineDistance, courtY + courtHeight);
    ctx.moveTo(courtX + courtWidth/2 + attackLineDistance, courtY);
    ctx.lineTo(courtX + courtWidth/2 + attackLineDistance, courtY + courtHeight);
    ctx.stroke();

    // Store court dimensions for scaling elements
    ctx.courtDimensions = { courtX, courtY, courtWidth, courtHeight };
  };

  const drawPlayers = (ctx, players, scale, canvasWidth, canvasHeight) => {
    // Calculate centering offsets to center the scaled modal area in the viewer canvas
    const modalWidth = 600;
    const modalHeight = 375;
    const scaledWidth = modalWidth * scale;
    const scaledHeight = modalHeight * scale;
    const offsetX = (canvasWidth - scaledWidth) / 2;
    const offsetY = (canvasHeight - scaledHeight) / 2;
    
    players.forEach(player => {
      // Convert from modal coordinates to viewer coordinates with centering
      const x = offsetX + (player.x * scale);
      const y = offsetY + (player.y * scale);
      
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
      ctx.arc(x, y, 10 * scale, 0, 2 * Math.PI);
      ctx.fill();
      
      // Border color - black for white ball, white otherwise
      ctx.strokeStyle = player.type === 'ball' ? '#000000' : 'white';
      ctx.lineWidth = 2 * scale;
      ctx.stroke();
      
      // Draw label if not a ball
      if (player.label && player.type !== 'ball') {
        ctx.fillStyle = 'white';
        ctx.font = `${14 * scale}px Arial`;
        ctx.textAlign = 'center';
        ctx.fillText(player.label, x, y + 3 * scale);
      }
    });
  };  const drawArrows = (ctx, arrows, scale, canvasWidth, canvasHeight) => {
    // Calculate centering offsets to center the scaled modal area in the viewer canvas
    const modalWidth = 600;
    const modalHeight = 375;
    const scaledWidth = modalWidth * scale;
    const scaledHeight = modalHeight * scale;
    const offsetX = (canvasWidth - scaledWidth) / 2;
    const offsetY = (canvasHeight - scaledHeight) / 2;
    
    arrows.forEach(arrow => {
      // Convert from modal coordinates to viewer coordinates with centering
      const startX = offsetX + (arrow.startX * scale);
      const startY = offsetY + (arrow.startY * scale);
      const endX = offsetX + (arrow.endX * scale);
      const endY = offsetY + (arrow.endY * scale);
      
      const headLength = 15 * scale;
      const angle = Math.atan2(endY - startY, endX - startX);

      ctx.strokeStyle = arrow.color || '#22c55e';
      ctx.fillStyle = arrow.color || '#22c55e';
      ctx.lineWidth = 4 * scale;

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

  const drawTextLabels = (ctx, textLabels, scale, canvasWidth, canvasHeight) => {
    // Calculate centering offsets to center the scaled modal area in the viewer canvas
    const modalWidth = 600;
    const modalHeight = 375;
    const scaledWidth = modalWidth * scale;
    const scaledHeight = modalHeight * scale;
    const offsetX = (canvasWidth - scaledWidth) / 2;
    const offsetY = (canvasHeight - scaledHeight) / 2;
    
    textLabels.forEach(label => {
      // Convert from modal coordinates to viewer coordinates with centering
      const x = offsetX + (label.x * scale);
      const y = offsetY + (label.y * scale);
      
      ctx.fillStyle = label.color || '#ffffff';
      ctx.font = `${20 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 2;
      ctx.strokeText(label.text, x, y);
      ctx.fillText(label.text, x, y);
    });
  };

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '800px',
        height: '500px',
        display: 'block',
        ...style
      }}
    />
  );
};

export default CourtDiagramViewer;