const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const dbPath = path.join(__dirname, 'practrac.db');
const db = new Database(dbPath);
db.pragma('foreign_keys = ON');

// Create new tables for practice sessions and attendance tracking
try {
  // Create practice_sessions table to track actual practice sessions
  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      practice_id INTEGER NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled')),
      actual_duration INTEGER,
      notes TEXT,
      FOREIGN KEY (practice_id) REFERENCES practices(id) ON DELETE CASCADE
    )
  `);

  // Create practice_attendance table to track which players attended
  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      attended BOOLEAN NOT NULL DEFAULT 1,
      late_minutes INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE,
      UNIQUE(session_id, player_id)
    )
  `);
  
  console.log('✅ Practice session and attendance tables initialized');
} catch (error) {
  console.error('Error creating attendance tables:', error);
}

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('public'));

// Database helper functions
const getTeams = () => {
  const stmt = db.prepare('SELECT * FROM teams ORDER BY created_at DESC');
  return stmt.all();
};

const getPlayers = () => {
  const stmt = db.prepare(`
    SELECT p.*, ps.kills, ps.blocks, ps.aces, ps.digs, ps.assists
    FROM players p
    LEFT JOIN player_stats ps ON p.id = ps.player_id
    ORDER BY p.jerseyNumber
  `);
  const players = stmt.all();
  
  // Format the response to match the original structure
  return players.map(player => ({
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    skillLevel: player.skillLevel,
    height: player.height,
    year: player.year,
    stats: {
      kills: player.kills || 0,
      blocks: player.blocks || 0,
      aces: player.aces || 0,
      digs: player.digs || 0,
      assists: player.assists || 0
    }
  }));
};

const getDrills = () => {
  const stmt = db.prepare('SELECT * FROM drills ORDER BY category, name');
  const drills = stmt.all();
  
  // Parse JSON fields
  return drills.map(drill => ({
    ...drill,
    equipment: JSON.parse(drill.equipment || '[]'),
    focus: JSON.parse(drill.focus || '[]')
  }));
};

const getPractices = () => {
  const stmt = db.prepare(`
    SELECT p.*, t.name as team_name,
           pp.id as phase_id, pp.name as phase_name, pp.duration as phase_duration, 
           pp.objective as phase_objective, pp.phase_order,
           GROUP_CONCAT(ppd.drill_id) as drill_ids
    FROM practices p
    LEFT JOIN teams t ON p.team_id = t.id
    LEFT JOIN practice_phases pp ON p.id = pp.practice_id
    LEFT JOIN practice_phase_drills ppd ON pp.id = ppd.phase_id
    GROUP BY p.id, pp.id
    ORDER BY p.id DESC, pp.phase_order
  `);
  
  const rows = stmt.all();
  const practicesMap = new Map();
  
  rows.forEach(row => {
    if (!practicesMap.has(row.id)) {
      practicesMap.set(row.id, {
        id: row.id,
        name: row.name,
        team_id: row.team_id,
        team_name: row.team_name,
        objective: row.objective,
        estimated_duration: row.estimated_duration,
        date: row.date,
        phases: []
      });
    }
    
    if (row.phase_id) {
      const practice = practicesMap.get(row.id);
      const drillIds = row.drill_ids ? row.drill_ids.split(',').map(Number) : [];
      
      practice.phases.push({
        id: row.phase_id,
        name: row.phase_name,
        duration: row.phase_duration,
        objective: row.phase_objective,
        phase_order: row.phase_order,
        drills: drillIds
      });
    }
  });
  
  return Array.from(practicesMap.values());
};

const getVideos = () => {
  const stmt = db.prepare('SELECT * FROM videos ORDER BY category, title');
  return stmt.all();
};

const getPlayerById = (id) => {
  const stmt = db.prepare(`
    SELECT p.*, ps.kills, ps.blocks, ps.aces, ps.digs, ps.assists
    FROM players p
    LEFT JOIN player_stats ps ON p.id = ps.player_id
    WHERE p.id = ?
  `);
  const player = stmt.get(id);
  
  if (!player) return null;
  
  return {
    id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    skillLevel: player.skillLevel,
    height: player.height,
    year: player.year,
    stats: {
      kills: player.kills || 0,
      blocks: player.blocks || 0,
      aces: player.aces || 0,
      digs: player.digs || 0,
      assists: player.assists || 0
    }
  };
};

const getDrillById = (id) => {
  const stmt = db.prepare('SELECT * FROM drills WHERE id = ?');
  const drill = stmt.get(id);
  
  if (!drill) return null;
  
  return {
    ...drill,
    equipment: JSON.parse(drill.equipment || '[]'),
    focus: JSON.parse(drill.focus || '[]')
  };
};

// API Routes
app.get('/api/teams', (req, res) => {
  try {
    const teams = getTeams();
    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/players', (req, res) => {
  try {
    const players = getPlayers();
    res.json(players);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/drills', (req, res) => {
  try {
    const drills = getDrills();
    res.json(drills);
  } catch (error) {
    console.error('Error fetching drills:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/practices', (req, res) => {
  try {
    const practices = getPractices();
    res.json(practices);
  } catch (error) {
    console.error('Error fetching practices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single practice with phases and drills
app.get('/api/practices/:id', (req, res) => {
  try {
    const practiceId = parseInt(req.params.id);
    
    // Get practice details
    const practice = db.prepare('SELECT * FROM practices WHERE id = ?').get(practiceId);
    if (!practice) {
      return res.status(404).json({ error: 'Practice not found' });
    }
    
    // Get phases for this practice
    const phases = db.prepare(`
      SELECT pp.*, GROUP_CONCAT(d.id) as drill_ids, GROUP_CONCAT(d.name) as drill_names,
             GROUP_CONCAT(d.category) as drill_categories, GROUP_CONCAT(d.difficulty) as drill_difficulties,
             GROUP_CONCAT(d.description) as drill_descriptions
      FROM practice_phases pp
      LEFT JOIN practice_phase_drills ppd ON pp.id = ppd.phase_id
      LEFT JOIN drills d ON ppd.drill_id = d.id
      WHERE pp.practice_id = ?
      GROUP BY pp.id
      ORDER BY pp.phase_order
    `).all(practiceId);
    
    // Format phases with drills
    practice.phases = phases.map(phase => {
      const drills = [];
      if (phase.drill_ids) {
        const ids = phase.drill_ids.split(',');
        const names = phase.drill_names.split(',');
        const categories = phase.drill_categories.split(',');
        const difficulties = phase.drill_difficulties.split(',');
        const descriptions = phase.drill_descriptions.split(',');
        
        for (let i = 0; i < ids.length; i++) {
          drills.push({
            id: parseInt(ids[i]),
            name: names[i],
            category: categories[i],
            difficulty: difficulties[i],
            description: descriptions[i] === 'null' ? null : descriptions[i]
          });
        }
      }
      
      return {
        id: phase.id,
        name: phase.name,
        duration: phase.duration,
        objective: phase.objective,
        phase_order: phase.phase_order,
        drills: drills
      };
    });
    
    res.json(practice);
  } catch (error) {
    console.error('Error fetching practice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update practice
app.put('/api/practices/:id', (req, res) => {
  try {
    const practiceId = parseInt(req.params.id);
    const { name, objective, estimated_duration, date, phases } = req.body;
    
    // Check if practice exists
    const existingPractice = db.prepare('SELECT id FROM practices WHERE id = ?').get(practiceId);
    if (!existingPractice) {
      return res.status(404).json({ error: 'Practice not found' });
    }
    
    // Use provided date or default to current date
    const practiceDate = date || new Date().toISOString().split('T')[0];
    
    // Update practice
    const updatePractice = db.prepare(`
      UPDATE practices 
      SET name = ?, objective = ?, estimated_duration = ?, date = ?, duration = ?
      WHERE id = ?
    `);
    
    updatePractice.run(name, objective, estimated_duration, practiceDate, estimated_duration, practiceId);
    
    // Delete existing phases and drills
    const deletePhasesDrills = db.prepare('DELETE FROM practice_phase_drills WHERE phase_id IN (SELECT id FROM practice_phases WHERE practice_id = ?)');
    const deletePhases = db.prepare('DELETE FROM practice_phases WHERE practice_id = ?');
    
    deletePhasesDrills.run(practiceId);
    deletePhases.run(practiceId);
    
    // Insert updated phases
    if (phases && phases.length > 0) {
      const insertPhase = db.prepare(`
        INSERT INTO practice_phases (practice_id, name, duration, objective, type, phase_order) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const insertPhaseDrill = db.prepare(`
        INSERT INTO practice_phase_drills (phase_id, drill_id) 
        VALUES (?, ?)
      `);
      
      phases.forEach((phase, index) => {
        const phaseType = phase.type || 'practice'; // Default type
        const phaseResult = insertPhase.run(practiceId, phase.name, phase.duration, phase.objective, phaseType, index + 1);
        const phaseId = phaseResult.lastInsertRowid;
        
        // Insert drills for this phase
        if (phase.drills && phase.drills.length > 0) {
          phase.drills.forEach(drillId => {
            insertPhaseDrill.run(phaseId, drillId);
          });
        }
      });
    }
    
    res.json({ message: 'Practice updated successfully' });
  } catch (error) {
    console.error('Error updating practice:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.get('/api/videos', (req, res) => {
  try {
    const videos = getVideos();
    res.json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/players/:id', (req, res) => {
  try {
    const player = getPlayerById(parseInt(req.params.id));
    if (player) {
      res.json(player);
    } else {
      res.status(404).json({ error: 'Player not found' });
    }
  } catch (error) {
    console.error('Error fetching player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/drills/:id', (req, res) => {
  try {
    const drill = getDrillById(parseInt(req.params.id));
    if (drill) {
      res.json(drill);
    } else {
      res.status(404).json({ error: 'Drill not found' });
    }
  } catch (error) {
    console.error('Error fetching drill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD operations for players
app.post('/api/players', (req, res) => {
  try {
    const { firstName, lastName, jerseyNumber, position, skillLevel, height, year } = req.body;
    
    const insertPlayer = db.prepare(`
      INSERT INTO players (firstName, lastName, jerseyNumber, position, skillLevel, height, year, team_id) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    
    const result = insertPlayer.run(firstName, lastName, jerseyNumber, position, skillLevel, height, year);
    
    // Insert default stats
    const insertStats = db.prepare(`
      INSERT INTO player_stats (player_id, season) VALUES (?, 'Fall 2025')
    `);
    insertStats.run(result.lastInsertRowid);
    
    const newPlayer = getPlayerById(result.lastInsertRowid);
    res.status(201).json(newPlayer);
  } catch (error) {
    console.error('Error creating player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/players/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { firstName, lastName, jerseyNumber, position, skillLevel, height, year, stats } = req.body;
    
    // Update player info
    const updatePlayer = db.prepare(`
      UPDATE players 
      SET firstName = ?, lastName = ?, jerseyNumber = ?, position = ?, skillLevel = ?, height = ?, year = ?
      WHERE id = ?
    `);
    updatePlayer.run(firstName, lastName, jerseyNumber, position, skillLevel, height, year, id);
    
    // Update stats if provided
    if (stats) {
      const updateStats = db.prepare(`
        UPDATE player_stats 
        SET kills = ?, blocks = ?, aces = ?, digs = ?, assists = ?
        WHERE player_id = ?
      `);
      updateStats.run(stats.kills, stats.blocks, stats.aces, stats.digs, stats.assists, id);
    }
    
    const updatedPlayer = getPlayerById(id);
    res.json(updatedPlayer);
  } catch (error) {
    console.error('Error updating player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/players/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Delete stats first (foreign key constraint)
    const deleteStats = db.prepare('DELETE FROM player_stats WHERE player_id = ?');
    deleteStats.run(id);
    
    // Delete player
    const deletePlayer = db.prepare('DELETE FROM players WHERE id = ?');
    const result = deletePlayer.run(id);
    
    if (result.changes > 0) {
      res.json({ message: 'Player deleted successfully' });
    } else {
      res.status(404).json({ error: 'Player not found' });
    }
  } catch (error) {
    console.error('Error deleting player:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get player attendance history and statistics
app.get('/api/players/:id/attendance', (req, res) => {
  try {
    const playerId = parseInt(req.params.id);
    
    // Check if player exists
    const player = getPlayerById(playerId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Get attendance history
    const attendanceHistory = db.prepare(`
      SELECT 
        CASE 
          WHEN pa.attended = 1 AND pa.late_minutes > 0 THEN 'late'
          WHEN pa.attended = 1 THEN 'present'
          ELSE 'absent'
        END as status,
        pa.late_minutes,
        ps.started_at as practice_date,
        p.name as practice_name,
        'practice' as practice_type
      FROM practice_attendance pa
      JOIN practice_sessions ps ON pa.session_id = ps.id
      JOIN practices p ON ps.practice_id = p.id
      WHERE pa.player_id = ?
      ORDER BY ps.started_at DESC
    `).all(playerId);
    
    // Calculate statistics
    const totalPractices = db.prepare(`
      SELECT COUNT(*) as count 
      FROM practice_sessions 
      WHERE started_at <= datetime('now')
    `).get().count;
    
    const attendedPractices = attendanceHistory.filter(a => a.status === 'present' || a.status === 'late').length;
    const missedPractices = attendanceHistory.filter(a => a.status === 'absent').length;
    const attendanceRate = totalPractices > 0 ? Math.round((attendedPractices / totalPractices) * 100) : 0;
    
    const stats = {
      totalPractices,
      practicesAttended: attendedPractices,
      practicesMissed: missedPractices,
      attendanceRate: `${attendanceRate}%`
    };
    
    res.json({
      history: attendanceHistory,
      stats: stats
    });
  } catch (error) {
    console.error('Error fetching player attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD operations for teams
app.post('/api/teams', (req, res) => {
  try {
    const { name, season, division, coach } = req.body;
    
    const insertTeam = db.prepare(`
      INSERT INTO teams (name, season, division, coach) 
      VALUES (?, ?, ?, ?)
    `);
    
    const result = insertTeam.run(name, season, division, coach);
    
    const newTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newTeam);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/teams/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, season, division, coach } = req.body;
    
    const updateTeam = db.prepare(`
      UPDATE teams 
      SET name = ?, season = ?, division = ?, coach = ?
      WHERE id = ?
    `);
    updateTeam.run(name, season, division, coach, id);
    
    const updatedTeam = db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
    res.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/teams/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const deleteTeam = db.prepare('DELETE FROM teams WHERE id = ?');
    const result = deleteTeam.run(id);
    
    if (result.changes > 0) {
      res.json({ message: 'Team deleted successfully' });
    } else {
      res.status(404).json({ error: 'Team not found' });
    }
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD operations for drills
app.post('/api/drills', (req, res) => {
  try {
    const { name, category, duration, difficulty, description, equipment, minPlayers, maxPlayers, focus } = req.body;
    
    const insertDrill = db.prepare(`
      INSERT INTO drills (name, category, duration, difficulty, description, equipment, minPlayers, maxPlayers, focus) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const result = insertDrill.run(
      name, 
      category, 
      duration, 
      difficulty, 
      description, 
      JSON.stringify(equipment || []), 
      minPlayers, 
      maxPlayers, 
      JSON.stringify(focus || [])
    );
    
    const newDrill = getDrillById(result.lastInsertRowid);
    res.status(201).json(newDrill);
  } catch (error) {
    console.error('Error creating drill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/drills/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, category, duration, difficulty, description, equipment, minPlayers, maxPlayers, focus } = req.body;
    
    const updateDrill = db.prepare(`
      UPDATE drills 
      SET name = ?, category = ?, duration = ?, difficulty = ?, description = ?, equipment = ?, minPlayers = ?, maxPlayers = ?, focus = ?
      WHERE id = ?
    `);
    updateDrill.run(
      name, 
      category, 
      duration, 
      difficulty, 
      description, 
      JSON.stringify(equipment || []), 
      minPlayers, 
      maxPlayers, 
      JSON.stringify(focus || []),
      id
    );
    
    const updatedDrill = getDrillById(id);
    res.json(updatedDrill);
  } catch (error) {
    console.error('Error updating drill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/drills/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const deleteDrill = db.prepare('DELETE FROM drills WHERE id = ?');
    const result = deleteDrill.run(id);
    
    if (result.changes > 0) {
      res.json({ message: 'Drill deleted successfully' });
    } else {
      res.status(404).json({ error: 'Drill not found' });
    }
  } catch (error) {
    console.error('Error deleting drill:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD operations for videos
app.post('/api/videos', (req, res) => {
  try {
    const { title, category, duration, thumbnail, description } = req.body;
    
    const insertVideo = db.prepare(`
      INSERT INTO videos (title, category, duration, thumbnail, description) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const result = insertVideo.run(title, category, duration, thumbnail, description);
    
    const newVideo = db.prepare('SELECT * FROM videos WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newVideo);
  } catch (error) {
    console.error('Error creating video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/videos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, category, duration, thumbnail, description } = req.body;
    
    const updateVideo = db.prepare(`
      UPDATE videos 
      SET title = ?, category = ?, duration = ?, thumbnail = ?, description = ?
      WHERE id = ?
    `);
    updateVideo.run(title, category, duration, thumbnail, description, id);
    
    const updatedVideo = db.prepare('SELECT * FROM videos WHERE id = ?').get(id);
    res.json(updatedVideo);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/videos/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const deleteVideo = db.prepare('DELETE FROM videos WHERE id = ?');
    const result = deleteVideo.run(id);
    
    if (result.changes > 0) {
      res.json({ message: 'Video deleted successfully' });
    } else {
      res.status(404).json({ error: 'Video not found' });
    }
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// CRUD operations for practices
app.post('/api/practices', (req, res) => {
  try {
    const { name, objective, estimated_duration, phases, date } = req.body;
    
    // Use provided date or default to current date
    const practiceDate = date || new Date().toISOString().split('T')[0];
    
    // Insert practice
    const insertPractice = db.prepare(`
      INSERT INTO practices (name, objective, estimated_duration, date, duration) 
      VALUES (?, ?, ?, ?, ?)
    `);
    
    const practiceResult = insertPractice.run(name, objective, estimated_duration, practiceDate, estimated_duration);
    const practiceId = practiceResult.lastInsertRowid;
    
    // Insert phases
    if (phases && phases.length > 0) {
      const insertPhase = db.prepare(`
        INSERT INTO practice_phases (practice_id, name, duration, objective, type, phase_order) 
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const insertPhaseDrill = db.prepare(`
        INSERT INTO practice_phase_drills (phase_id, drill_id) 
        VALUES (?, ?)
      `);
      
      phases.forEach((phase, index) => {
        const phaseType = phase.type || 'practice'; // Default type
        const phaseResult = insertPhase.run(practiceId, phase.name, phase.duration, phase.objective, phaseType, index + 1);
        const phaseId = phaseResult.lastInsertRowid;
        
        // Insert drill assignments for this phase
        if (phase.drills && phase.drills.length > 0) {
          phase.drills.forEach(drillId => {
            insertPhaseDrill.run(phaseId, drillId);
          });
        }
      });
    }
    
    // Get the complete practice with phases
    const completePractice = getPracticeById(practiceId);
    res.status(201).json(completePractice);
  } catch (error) {
    console.error('Error creating practice:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.put('/api/practices/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { name, date, duration, phases } = req.body;
    
    // Update practice
    const updatePractice = db.prepare(`
      UPDATE practices 
      SET name = ?, date = ?, duration = ?
      WHERE id = ?
    `);
    updatePractice.run(name, date, duration, id);
    
    // Delete existing phases
    const deletePhases = db.prepare('DELETE FROM practice_phases WHERE practice_id = ?');
    deletePhases.run(id);
    
    // Insert new phases
    if (phases && phases.length > 0) {
      const insertPhase = db.prepare(`
        INSERT INTO practice_phases (practice_id, name, duration, type, phase_order) 
        VALUES (?, ?, ?, ?, ?)
      `);
      
      phases.forEach(phase => {
        insertPhase.run(id, phase.name, phase.duration, phase.type, phase.phase_order);
      });
    }
    
    const updatedPractice = getPracticeById(id);
    res.json(updatedPractice);
  } catch (error) {
    console.error('Error updating practice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/practices/:id', (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    // Delete phases first (foreign key constraint)
    const deletePhases = db.prepare('DELETE FROM practice_phases WHERE practice_id = ?');
    deletePhases.run(id);
    
    // Delete phase drills
    const deletePhaseDrills = db.prepare(`
      DELETE FROM practice_phase_drills 
      WHERE phase_id IN (SELECT id FROM practice_phases WHERE practice_id = ?)
    `);
    deletePhaseDrills.run(id);
    
    // Delete practice
    const deletePractice = db.prepare('DELETE FROM practices WHERE id = ?');
    const result = deletePractice.run(id);
    
    if (result.changes > 0) {
      res.json({ message: 'Practice deleted successfully' });
    } else {
      res.status(404).json({ error: 'Practice not found' });
    }
  } catch (error) {
    console.error('Error deleting practice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper function to get practice by ID
const getPracticeById = (id) => {
  const stmt = db.prepare(`
    SELECT p.*, pp.id as phase_id, pp.name as phase_name, pp.duration as phase_duration, 
           pp.type as phase_type, pp.phase_order
    FROM practices p
    LEFT JOIN practice_phases pp ON p.id = pp.practice_id
    WHERE p.id = ?
    ORDER BY pp.phase_order
  `);
  
  const rows = stmt.all(id);
  if (rows.length === 0) return null;
  
  const practice = {
    id: rows[0].id,
    name: rows[0].name,
    date: rows[0].date,
    duration: rows[0].duration,
    phases: []
  };
  
  rows.forEach(row => {
    if (row.phase_id) {
      practice.phases.push({
        id: row.phase_id,
        name: row.phase_name,
        duration: row.phase_duration,
        type: row.phase_type,
        drills: [] // Could be populated with drill data if needed
      });
    }
  });
  
  return practice;
};

// Start a practice session with attendance
app.post('/api/practice-sessions', (req, res) => {
  try {
    const { practice_id, attendance } = req.body;
    
    // Check if practice exists
    const practice = db.prepare('SELECT * FROM practices WHERE id = ?').get(practice_id);
    if (!practice) {
      return res.status(404).json({ error: 'Practice not found' });
    }
    
    // Create practice session
    const insertSession = db.prepare(`
      INSERT INTO practice_sessions (practice_id, status) 
      VALUES (?, 'in_progress')
    `);
    
    const sessionResult = insertSession.run(practice_id);
    const sessionId = sessionResult.lastInsertRowid;
    
    // Record attendance for each player
    if (attendance && attendance.length > 0) {
      const insertAttendance = db.prepare(`
        INSERT INTO practice_attendance (session_id, player_id, attended, late_minutes, notes)
        VALUES (?, ?, ?, ?, ?)
      `);
      
      attendance.forEach(record => {
        insertAttendance.run(
          sessionId, 
          record.player_id, 
          record.attended ? 1 : 0, 
          record.late_minutes || 0,
          record.notes || null
        );
      });
    }
    
    // Return the created session with attendance
    const session = getSessionById(sessionId);
    res.status(201).json(session);
  } catch (error) {
    console.error('Error starting practice session:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

// Complete a practice session
app.put('/api/practice-sessions/:id/complete', (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { actual_duration, notes } = req.body;
    
    const updateSession = db.prepare(`
      UPDATE practice_sessions 
      SET status = 'completed', completed_at = CURRENT_TIMESTAMP, actual_duration = ?, notes = ?
      WHERE id = ?
    `);
    
    const result = updateSession.run(actual_duration, notes, sessionId);
    
    if (result.changes > 0) {
      const session = getSessionById(sessionId);
      res.json(session);
    } else {
      res.status(404).json({ error: 'Practice session not found' });
    }
  } catch (error) {
    console.error('Error completing practice session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get past practice sessions
app.get('/api/practice-sessions', (req, res) => {
  try {
    const sessions = getPracticeSessions();
    res.json(sessions);
  } catch (error) {
    console.error('Error fetching practice sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific practice session with attendance
app.get('/api/practice-sessions/:id', (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const session = getSessionById(sessionId);
    
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({ error: 'Practice session not found' });
    }
  } catch (error) {
    console.error('Error fetching practice session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update attendance for a specific practice session
app.put('/api/practice-sessions/:id/attendance', (req, res) => {
  try {
    const sessionId = parseInt(req.params.id);
    const { player_id, attended, late_minutes, notes } = req.body;
    
    // Check if session exists
    const session = db.prepare('SELECT id FROM practice_sessions WHERE id = ?').get(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Practice session not found' });
    }
    
    // Update attendance record
    const updateAttendance = db.prepare(`
      UPDATE practice_attendance 
      SET attended = ?, late_minutes = ?, notes = ?
      WHERE session_id = ? AND player_id = ?
    `);
    
    const result = updateAttendance.run(
      attended ? 1 : 0, 
      late_minutes || 0, 
      notes || null, 
      sessionId, 
      player_id
    );
    
    if (result.changes > 0) {
      const updatedSession = getSessionById(sessionId);
      res.json(updatedSession);
    } else {
      res.status(404).json({ error: 'Attendance record not found' });
    }
  } catch (error) {
    console.error('Error updating attendance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Helper functions for practice sessions
const getPracticeSessions = () => {
  const stmt = db.prepare(`
    SELECT ps.*, p.name as practice_name, p.objective, p.estimated_duration,
           COUNT(pa.id) as total_players,
           SUM(pa.attended) as attended_count
    FROM practice_sessions ps
    JOIN practices p ON ps.practice_id = p.id
    LEFT JOIN practice_attendance pa ON ps.id = pa.session_id
    GROUP BY ps.id
    ORDER BY ps.started_at DESC
  `);
  
  return stmt.all();
};

const getSessionById = (sessionId) => {
  // Get session details
  const sessionStmt = db.prepare(`
    SELECT ps.*, p.name as practice_name, p.objective, p.estimated_duration
    FROM practice_sessions ps
    JOIN practices p ON ps.practice_id = p.id
    WHERE ps.id = ?
  `);
  
  const session = sessionStmt.get(sessionId);
  if (!session) return null;
  
  // Get attendance records
  const attendanceStmt = db.prepare(`
    SELECT pa.*, pl.firstName, pl.lastName, pl.jerseyNumber, pl.position
    FROM practice_attendance pa
    JOIN players pl ON pa.player_id = pl.id
    WHERE pa.session_id = ?
    ORDER BY pl.jerseyNumber
  `);
  
  const attendance = attendanceStmt.all(sessionId);
  
  return {
    ...session,
    attendance: attendance
  };
};

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/practice', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'practice.html'));
});

app.get('/past-practices', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'past-practices.html'));
});

app.get('/roster', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'roster.html'));
});

app.get('/drills', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'drills.html'));
});

app.get('/videos', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'videos.html'));
});

app.get('/analytics', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'analytics.html'));
});

// Team statistics endpoint
app.get('/api/team/stats', (req, res) => {
  try {
    // Get total number of players
    const totalPlayersStmt = db.prepare('SELECT COUNT(*) as count FROM players');
    const totalPlayers = totalPlayersStmt.get().count;
    
    // Calculate average skill level
    const avgSkillStmt = db.prepare('SELECT AVG(skillLevel) as avgSkill FROM players');
    const avgSkillResult = avgSkillStmt.get();
    const avgSkillLevel = avgSkillResult.avgSkill ? parseFloat(avgSkillResult.avgSkill).toFixed(1) : 0;
    
    // Calculate average height
    const heightsStmt = db.prepare("SELECT height FROM players WHERE height IS NOT NULL AND height != ''");
    const heights = heightsStmt.all();
    let avgHeight = "N/A";
    
    if (heights.length > 0) {
      const totalInches = heights.reduce((sum, player) => {
        const height = player.height;
        if (height && height.includes("'")) {
          const [feet, inches] = height.split("'");
          const inchPart = inches ? parseInt(inches.replace('"', '')) : 0;
          return sum + (parseInt(feet) * 12 + inchPart);
        }
        return sum;
      }, 0);
      
      const avgInches = totalInches / heights.length;
      const avgFeet = Math.floor(avgInches / 12);
      const avgRemainingInches = Math.round(avgInches % 12);
      avgHeight = `${avgFeet}'${avgRemainingInches}"`;
    }
    
    // Calculate attendance rate from practice attendance data
    const attendanceStmt = db.prepare('SELECT COUNT(*) as totalAttendanceRecords, SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) as attendedCount FROM practice_attendance');
    const attendanceResult = attendanceStmt.get();
    
    let attendanceRate = "95%"; // Default fallback
    if (attendanceResult.totalAttendanceRecords > 0) {
      const rate = (attendanceResult.attendedCount / attendanceResult.totalAttendanceRecords * 100).toFixed(0);
      attendanceRate = `${rate}%`;
    }
    
    res.json({
      totalPlayers,
      attendanceRate,
      avgSkillLevel: parseFloat(avgSkillLevel),
      avgHeight
    });
  } catch (error) {
    console.error('Error fetching team statistics:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    database: 'connected',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down gracefully...');
  db.close();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`🏐 PracTrac Stick Demo Server running on http://localhost:${PORT}`);
  console.log(`📊 SQLite Database Demo - Volleyball Practice Management`);
  console.log(`🗄️  Database: ${dbPath}`);
});