const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const dbPath = path.join(__dirname, 'practrac.db');
const db = new sqlite3.Database(dbPath);
db.run('PRAGMA foreign_keys = ON');

// Create new tables for practice sessions and attendance tracking
db.serialize(() => {
  // Create practice_sessions table to track actual practice sessions
  db.run(`
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
  db.run(`
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
  `, (err) => {
    if (err) {
      console.error('Error creating attendance tables:', err);
    } else {
      console.log('✅ Practice session and attendance tables initialized');
    }
  });
});

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('public'));

// Database helper functions
const getTeams = (callback) => {
  db.all('SELECT * FROM teams ORDER BY created_at DESC', [], callback);
};

const getPlayers = (callback) => {
  const query = `
    SELECT p.*, ps.kills, ps.blocks, ps.aces, ps.digs, ps.assists
    FROM players p
    LEFT JOIN player_stats ps ON p.id = ps.player_id
    ORDER BY p.jerseyNumber
  `;
  
  db.all(query, [], (err, players) => {
    if (err) return callback(err);
    
    // Format the response to match the original structure
    const processedPlayers = players.map(player => ({
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
    
    callback(null, processedPlayers);
  });
};

const getDrills = (callback) => {
  db.all('SELECT * FROM drills ORDER BY category, name', [], (err, drills) => {
    if (err) return callback(err);
    
    // Parse JSON fields
    const processedDrills = drills.map(drill => ({
      ...drill,
      equipment: JSON.parse(drill.equipment || '[]'),
      focus: JSON.parse(drill.focus || '[]')
    }));
    
    callback(null, processedDrills);
  });
};

const getPractices = (callback) => {
  const query = `
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
  `;
  
  db.all(query, [], (err, rows) => {
    if (err) return callback(err);
    
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
    
    callback(null, Array.from(practicesMap.values()));
  });
};

const getVideos = (callback) => {
  db.all('SELECT * FROM videos ORDER BY category, title', [], callback);
};

const getPlayerById = (id, callback) => {
  const query = `
    SELECT p.*, ps.kills, ps.blocks, ps.aces, ps.digs, ps.assists
    FROM players p
    LEFT JOIN player_stats ps ON p.id = ps.player_id
    WHERE p.id = ?
  `;
  
  db.get(query, [id], (err, player) => {
    if (err) return callback(err);
    if (!player) return callback(null, null);
    
    const processedPlayer = {
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
    
    callback(null, processedPlayer);
  });
};

// Synchronous version for places that don't use callbacks
const getPlayerByIdSync = (id) => {
  try {
    const query = `
      SELECT p.*, ps.kills, ps.blocks, ps.aces, ps.digs, ps.assists
      FROM players p
      LEFT JOIN player_stats ps ON p.id = ps.player_id
      WHERE p.id = ?
    `;
    
    const stmt = db.prepare(query);
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
  } catch (error) {
    console.error('Error getting player by ID:', error);
    return null;
  }
};

const getDrillById = (id, callback) => {
  db.get('SELECT * FROM drills WHERE id = ?', [id], (err, drill) => {
    if (err) return callback(err);
    if (!drill) return callback(null, null);
    
    const processedDrill = {
      ...drill,
      equipment: JSON.parse(drill.equipment || '[]'),
      focus: JSON.parse(drill.focus || '[]')
    };
    
    callback(null, processedDrill);
  });
};

// API Routes
app.get('/api/teams', (req, res) => {
  getTeams((err, teams) => {
    if (err) {
      console.error('Error fetching teams:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(teams);
  });
});

app.get('/api/players', (req, res) => {
  getPlayers((err, players) => {
    if (err) {
      console.error('Error fetching players:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(players);
  });
});

app.get('/api/drills', (req, res) => {
  getDrills((err, drills) => {
    if (err) {
      console.error('Error fetching drills:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(drills);
  });
});

app.get('/api/practices', (req, res) => {
  getPractices((err, practices) => {
    if (err) {
      console.error('Error fetching practices:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(practices);
  });
});

// Get single practice with phases and drills
app.get('/api/practices/:id', (req, res) => {
  const practiceId = parseInt(req.params.id);
  
  // Get practice details
  db.get('SELECT * FROM practices WHERE id = ?', [practiceId], (err, practice) => {
    if (err) {
      console.error('Error fetching practice:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!practice) {
      return res.status(404).json({ error: 'Practice not found' });
    }
    
    // Get phases for this practice
    const phasesQuery = `
      SELECT pp.*, GROUP_CONCAT(d.id) as drill_ids, GROUP_CONCAT(d.name) as drill_names,
             GROUP_CONCAT(d.category) as drill_categories, GROUP_CONCAT(d.difficulty) as drill_difficulties,
             GROUP_CONCAT(d.description) as drill_descriptions
      FROM practice_phases pp
      LEFT JOIN practice_phase_drills ppd ON pp.id = ppd.phase_id
      LEFT JOIN drills d ON ppd.drill_id = d.id
      WHERE pp.practice_id = ?
      GROUP BY pp.id
      ORDER BY pp.phase_order
    `;
    
    db.all(phasesQuery, [practiceId], (err, phases) => {
      if (err) {
        console.error('Error fetching practice phases:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
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
    });
  });
});

app.get('/api/videos', (req, res) => {
  getVideos((err, videos) => {
    if (err) {
      console.error('Error fetching videos:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(videos);
  });
});

app.get('/api/players/:id', (req, res) => {
  getPlayerById(parseInt(req.params.id), (err, player) => {
    if (err) {
      console.error('Error fetching player:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (player) {
      res.json(player);
    } else {
      res.status(404).json({ error: 'Player not found' });
    }
  });
});

app.get('/api/drills/:id', (req, res) => {
  getDrillById(parseInt(req.params.id), (err, drill) => {
    if (err) {
      console.error('Error fetching drill:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    if (drill) {
      res.json(drill);
    } else {
      res.status(404).json({ error: 'Drill not found' });
    }
  });
});

// CRUD operations for players
app.post('/api/players', (req, res) => {
  const { firstName, lastName, jerseyNumber, position, skillLevel, height, year } = req.body;
  
  // Insert the player first
  db.run(`
    INSERT INTO players (firstName, lastName, jerseyNumber, position, skillLevel, height, year, team_id) 
    VALUES (?, ?, ?, ?, ?, ?, ?, 1)
  `, [firstName, lastName, jerseyNumber, position, skillLevel, height, year], function(err) {
    if (err) {
      console.error('Error creating player:', err);
      return res.status(500).json({ error: 'Failed to create player' });
    }
    
    const playerId = this.lastID;
    
    // Insert default stats for the new player
    db.run(`
      INSERT INTO player_stats (player_id, season) VALUES (?, 'Fall 2025')
    `, [playerId], (err) => {
      if (err) {
        console.error('Error creating player stats:', err);
        return res.status(500).json({ error: 'Failed to create player stats' });
      }
      
      // Get the complete player data and return it
      getPlayerById(playerId, (err, newPlayer) => {
        if (err || !newPlayer) {
          console.error('Error retrieving new player:', err);
          return res.status(500).json({ error: 'Player created but failed to retrieve data' });
        }
        
        res.status(201).json(newPlayer);
      });
    });
  });
});

app.put('/api/players/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { firstName, lastName, jerseyNumber, position, skillLevel, height, year } = req.body;
  
  // Update player info only
  db.run(`
    UPDATE players 
    SET firstName = ?, lastName = ?, jerseyNumber = ?, position = ?, skillLevel = ?, height = ?, year = ?
    WHERE id = ?
  `, [firstName, lastName, jerseyNumber, position, skillLevel, height, year, id], function(err) {
    if (err) {
      console.error('Error updating player:', err);
      return res.status(500).json({ error: 'Failed to update player' });
    }
    
    // Get updated player data
    getPlayerById(id, (err, updatedPlayer) => {
      if (err || !updatedPlayer) {
        console.error('Error retrieving updated player:', err);
        return res.status(500).json({ error: 'Player updated but failed to retrieve data' });
      }
      
      res.json(updatedPlayer);
    });
  });
});

// Get all practices with drills

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
  const { name, objective, estimated_duration, phases, date } = req.body;
  
  // Use provided date or default to current date
  const practiceDate = date || new Date().toISOString().split('T')[0];
  
  // Insert practice
  db.run(`
    INSERT INTO practices (name, objective, estimated_duration, date, duration) 
    VALUES (?, ?, ?, ?, ?)
  `, [name, objective, estimated_duration, practiceDate, estimated_duration], function(err) {
    if (err) {
      console.error('Error creating practice:', err);
      return res.status(500).json({ error: 'Failed to create practice' });
    }
    
    const practiceId = this.lastID;
    
    // Insert phases if provided
    if (phases && phases.length > 0) {
      let phasesCompleted = 0;
      const totalPhases = phases.length;
      
      phases.forEach((phase, index) => {
        const phaseType = phase.type || 'practice'; // Default type
        
        db.run(`
          INSERT INTO practice_phases (practice_id, name, duration, objective, type, phase_order) 
          VALUES (?, ?, ?, ?, ?, ?)
        `, [practiceId, phase.name, phase.duration, phase.objective, phaseType, index + 1], function(err) {
          if (err) {
            console.error('Error creating phase:', err);
            return res.status(500).json({ error: 'Failed to create practice phase' });
          }
          
          const phaseId = this.lastID;
          
          // Insert drill assignments for this phase
          if (phase.drills && phase.drills.length > 0) {
            let drillsCompleted = 0;
            const totalDrills = phase.drills.length;
            
            phase.drills.forEach(drillId => {
              db.run(`
                INSERT INTO practice_phase_drills (phase_id, drill_id) 
                VALUES (?, ?)
              `, [phaseId, drillId], (err) => {
                if (err) {
                  console.error('Error assigning drill to phase:', err);
                  return res.status(500).json({ error: 'Failed to assign drills to phase' });
                }
                
                drillsCompleted++;
                if (drillsCompleted === totalDrills) {
                  // All drills for this phase are done
                  phasesCompleted++;
                  if (phasesCompleted === totalPhases) {
                    // All phases are complete, return the practice
                    getPracticeByIdAsync(practiceId, (completePractice) => {
                      res.status(201).json(completePractice);
                    });
                  }
                }
              });
            });
          } else {
            // No drills for this phase
            phasesCompleted++;
            if (phasesCompleted === totalPhases) {
              // All phases are complete, return the practice
              getPracticeByIdAsync(practiceId, (completePractice) => {
                res.status(201).json(completePractice);
              });
            }
          }
        });
      });
    } else {
      // No phases, just return the basic practice
      getPracticeByIdAsync(practiceId, (completePractice) => {
        res.status(201).json(completePractice);
      });
    }
  });
});

app.put('/api/practices/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, date, duration, estimated_duration, objective, phases } = req.body;
  
  // Validate required fields
  if (!name || !date) {
    return res.status(400).json({ error: 'Name and date are required' });
  }
  
  // Use either duration or estimated_duration, with a default fallback
  const practiceDuration = duration || estimated_duration || 60;
  
  // Update practice
  db.run(`
    UPDATE practices 
    SET name = ?, date = ?, duration = ?, estimated_duration = ?, objective = ?
    WHERE id = ?
  `, [name, date, practiceDuration, practiceDuration, objective || '', id], function(err) {
    if (err) {
      console.error('Error updating practice:', err);
      return res.status(500).json({ error: 'Failed to update practice' });
    }
    
    // Delete existing phases and their drill assignments
    // First delete drill assignments, then phases
    db.run(`
      DELETE FROM practice_phase_drills 
      WHERE phase_id IN (
        SELECT id FROM practice_phases WHERE practice_id = ?
      )
    `, [id], (err) => {
      if (err) {
        console.error('Error deleting existing phase drills:', err);
        return res.status(500).json({ error: 'Failed to update practice phase drills' });
      }
      
      // Now delete the phases themselves
      db.run('DELETE FROM practice_phases WHERE practice_id = ?', [id], (err) => {
        if (err) {
          console.error('Error deleting existing phases:', err);
          return res.status(500).json({ error: 'Failed to update practice phases' });
        }
      
      // Insert new phases if provided
      if (phases && phases.length > 0) {
        let phasesCompleted = 0;
        const totalPhases = phases.length;
        
        phases.forEach((phase, index) => {
          db.run(`
            INSERT INTO practice_phases (practice_id, name, duration, objective, type, phase_order) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, [id, phase.name, phase.duration, phase.objective || '', phase.type || 'practice', phase.phase_order || (index + 1)], function(err) {
            if (err) {
              console.error('Error inserting phase:', err);
              return res.status(500).json({ error: 'Failed to create practice phase' });
            }
            
            const phaseId = this.lastID;
            
            // Insert drill assignments for this phase if provided
            if (phase.drills && phase.drills.length > 0) {
              let drillsCompleted = 0;
              const totalDrills = phase.drills.length;
              
              phase.drills.forEach(drillId => {
                db.run(`
                  INSERT INTO practice_phase_drills (phase_id, drill_id) 
                  VALUES (?, ?)
                `, [phaseId, drillId], function(err) {
                  if (err) {
                    console.error('Error inserting phase drill:', err);
                    return res.status(500).json({ error: 'Failed to assign drill to phase' });
                  }
                  
                  drillsCompleted++;
                  if (drillsCompleted === totalDrills) {
                    checkPhaseCompletion();
                  }
                });
              });
            } else {
              checkPhaseCompletion();
            }
            
            function checkPhaseCompletion() {
              phasesCompleted++;
              if (phasesCompleted === totalPhases) {
                // All phases are complete, return the updated practice
                getPracticeByIdAsync(id, (updatedPractice) => {
                  res.json(updatedPractice);
                });
              }
            }
          });
        });
      } else {
        // No phases to insert, just return the updated practice
        getPracticeByIdAsync(id, (updatedPractice) => {
          res.json(updatedPractice);
        });
      }
      });
    });
  });
});

// Helper function to get practice by ID (converted to sqlite3)
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

// Async version for sqlite3
const getPracticeByIdAsync = (id, callback) => {
  db.all(`
    SELECT p.*, pp.id as phase_id, pp.name as phase_name, pp.duration as phase_duration, 
           pp.type as phase_type, pp.phase_order
    FROM practices p
    LEFT JOIN practice_phases pp ON p.id = pp.practice_id
    WHERE p.id = ?
    ORDER BY pp.phase_order
  `, [id], (err, rows) => {
    if (err) {
      console.error('Error getting practice by ID:', err);
      return callback(null);
    }
    
    if (rows.length === 0) return callback(null);
    
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
    
    callback(practice);
  });
};

// Start a practice session with attendance
app.post('/api/practice-sessions', (req, res) => {
  try {
    const { practice_id, attendance } = req.body;
    
    // Check if practice exists
    db.get('SELECT * FROM practices WHERE id = ?', [practice_id], (err, practice) => {
      if (err) {
        console.error('Error checking practice:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      if (!practice) {
        return res.status(404).json({ error: 'Practice not found' });
      }
      
      // Create practice session
      db.run(`
        INSERT INTO practice_sessions (practice_id, status) 
        VALUES (?, 'in_progress')
      `, [practice_id], function(err) {
        if (err) {
          console.error('Error creating practice session:', err);
          return res.status(500).json({ error: 'Failed to create practice session' });
        }
        
        const sessionId = this.lastID;
        
        // Record attendance for each player
        if (attendance && attendance.length > 0) {
          let completed = 0;
          const total = attendance.length;
          
          attendance.forEach(record => {
            db.run(`
              INSERT INTO practice_attendance (session_id, player_id, attended, late_minutes, notes)
              VALUES (?, ?, ?, ?, ?)
            `, [
              sessionId, 
              record.player_id, 
              record.attended ? 1 : 0, 
              record.late_minutes || 0,
              record.notes || null
            ], (err) => {
              if (err) {
                console.error('Error recording attendance:', err);
                return res.status(500).json({ error: 'Failed to record attendance' });
              }
              
              completed++;
              if (completed === total) {
                // All attendance records created, return the session
                getSessionByIdAsync(sessionId, (session) => {
                  res.status(201).json(session);
                });
              }
            });
          });
        } else {
          // No attendance to record, return the session immediately
          getSessionByIdAsync(sessionId, (session) => {
            res.status(201).json(session);
          });
        }
      });
    });
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
  getPracticeSessionsAsync((sessions) => {
    res.json(sessions);
  });
});

// Get specific practice session with attendance
app.get('/api/practice-sessions/:id', (req, res) => {
  const sessionId = parseInt(req.params.id);
  getSessionByIdAsync(sessionId, (session) => {
    if (session) {
      res.json(session);
    } else {
      res.status(404).json({ error: 'Practice session not found' });
    }
  });
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

// Async version for sqlite3
const getPracticeSessionsAsync = (callback) => {
  db.all(`
    SELECT ps.*, p.name as practice_name, p.objective, p.estimated_duration,
           COUNT(pa.id) as total_players,
           SUM(pa.attended) as attended_count
    FROM practice_sessions ps
    JOIN practices p ON ps.practice_id = p.id
    LEFT JOIN practice_attendance pa ON ps.id = pa.session_id
    GROUP BY ps.id
    ORDER BY ps.started_at DESC
  `, [], (err, sessions) => {
    if (err) {
      console.error('Error fetching practice sessions:', err);
      return callback([]);
    }
    callback(sessions || []);
  });
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

// Async version for sqlite3
const getSessionByIdAsync = (sessionId, callback) => {
  // Get session details
  db.get(`
    SELECT ps.*, p.name as practice_name, p.objective, p.estimated_duration
    FROM practice_sessions ps
    JOIN practices p ON ps.practice_id = p.id
    WHERE ps.id = ?
  `, [sessionId], (err, session) => {
    if (err) {
      console.error('Error getting session:', err);
      return callback(null);
    }
    
    if (!session) return callback(null);
    
    // Get attendance records
    db.all(`
      SELECT pa.*, pl.firstName, pl.lastName, pl.jerseyNumber, pl.position
      FROM practice_attendance pa
      JOIN players pl ON pa.player_id = pl.id
      WHERE pa.session_id = ?
      ORDER BY pl.jerseyNumber
    `, [sessionId], (err, attendance) => {
      if (err) {
        console.error('Error getting attendance:', err);
        return callback(session);
      }
      
      callback({
        ...session,
        attendance: attendance || []
      });
    });
  });
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
  // Get total number of players
  db.get('SELECT COUNT(*) as count FROM players', [], (err, totalPlayersResult) => {
    if (err) {
      console.error('Error getting total players:', err);
      return res.status(500).json({ error: 'Failed to get team statistics' });
    }
    
    const totalPlayers = totalPlayersResult.count;
    
    // Calculate average skill level
    db.get('SELECT AVG(skillLevel) as avgSkill FROM players', [], (err, avgSkillResult) => {
      if (err) {
        console.error('Error getting average skill level:', err);
        return res.status(500).json({ error: 'Failed to get team statistics' });
      }
      
      const avgSkillLevel = avgSkillResult.avgSkill ? parseFloat(avgSkillResult.avgSkill).toFixed(1) : 0;
      
      // Calculate average height
      db.all("SELECT height FROM players WHERE height IS NOT NULL AND height != ''", [], (err, heights) => {
        if (err) {
          console.error('Error getting heights:', err);
          return res.status(500).json({ error: 'Failed to get team statistics' });
        }
        
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
        db.get('SELECT COUNT(*) as totalAttendanceRecords, SUM(CASE WHEN attended = 1 THEN 1 ELSE 0 END) as attendedCount FROM practice_attendance', [], (err, attendanceResult) => {
          if (err) {
            console.error('Error getting attendance data:', err);
            return res.status(500).json({ error: 'Failed to get team statistics' });
          }
          
          let attendanceRate = "95%"; // Default fallback
          if (attendanceResult && attendanceResult.totalAttendanceRecords > 0) {
            const rate = (attendanceResult.attendedCount / attendanceResult.totalAttendanceRecords * 100).toFixed(0);
            attendanceRate = `${rate}%`;
          }
          
          res.json({
            totalPlayers,
            attendanceRate,
            avgSkillLevel: parseFloat(avgSkillLevel),
            avgHeight
          });
        });
      });
    });
  });
});

// DELETE ENDPOINTS

// Delete player
app.delete('/api/players/:id', (req, res) => {
  const playerId = req.params.id;
  
  // First, delete all related attendance records
  db.run('DELETE FROM practice_attendance WHERE player_id = ?', [playerId], function(err) {
    if (err) {
      console.error('Error deleting player attendance:', err);
      return res.status(500).json({ error: 'Failed to delete player attendance' });
    }
    
    // Then delete the player
    db.run('DELETE FROM players WHERE id = ?', [playerId], function(err) {
      if (err) {
        console.error('Error deleting player:', err);
        return res.status(500).json({ error: 'Failed to delete player' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Player not found' });
      }
      
      res.json({ message: 'Player deleted successfully' });
    });
  });
});

// Delete practice plan
app.delete('/api/practices/:id', (req, res) => {
  const practiceId = req.params.id;
  
  // First, delete related practice sessions and attendance
  db.run('DELETE FROM practice_attendance WHERE session_id IN (SELECT id FROM practice_sessions WHERE practice_id = ?)', [practiceId], function(err) {
    if (err) {
      console.error('Error deleting practice attendance:', err);
      return res.status(500).json({ error: 'Failed to delete practice attendance' });
    }
    
    // Delete practice sessions
    db.run('DELETE FROM practice_sessions WHERE practice_id = ?', [practiceId], function(err) {
      if (err) {
        console.error('Error deleting practice sessions:', err);
        return res.status(500).json({ error: 'Failed to delete practice sessions' });
      }
      
      // Delete phase drills
      db.run('DELETE FROM practice_phase_drills WHERE phase_id IN (SELECT id FROM practice_phases WHERE practice_id = ?)', [practiceId], function(err) {
        if (err) {
          console.error('Error deleting phase drills:', err);
          return res.status(500).json({ error: 'Failed to delete phase drills' });
        }
        
        // Delete practice phases
        db.run('DELETE FROM practice_phases WHERE practice_id = ?', [practiceId], function(err) {
          if (err) {
            console.error('Error deleting practice phases:', err);
            return res.status(500).json({ error: 'Failed to delete practice phases' });
          }
          
          // Finally, delete the practice
          db.run('DELETE FROM practices WHERE id = ?', [practiceId], function(err) {
            if (err) {
              console.error('Error deleting practice:', err);
              return res.status(500).json({ error: 'Failed to delete practice' });
            }
            
            if (this.changes === 0) {
              return res.status(404).json({ error: 'Practice not found' });
            }
            
            res.json({ message: 'Practice deleted successfully' });
          });
        });
      });
    });
  });
});

// Delete practice session (past practice)
app.delete('/api/practice-sessions/:id', (req, res) => {
  const sessionId = req.params.id;
  
  // First, delete attendance records
  db.run('DELETE FROM practice_attendance WHERE session_id = ?', [sessionId], function(err) {
    if (err) {
      console.error('Error deleting session attendance:', err);
      return res.status(500).json({ error: 'Failed to delete session attendance' });
    }
    
    // Then delete the session
    db.run('DELETE FROM practice_sessions WHERE id = ?', [sessionId], function(err) {
      if (err) {
        console.error('Error deleting practice session:', err);
        return res.status(500).json({ error: 'Failed to delete practice session' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Practice session not found' });
      }
      
      res.json({ message: 'Practice session deleted successfully' });
    });
  });
});

// Delete drill
app.delete('/api/drills/:id', (req, res) => {
  const drillId = req.params.id;
  
  // First, delete drill from practice phases
  db.run('DELETE FROM practice_phase_drills WHERE drill_id = ?', [drillId], function(err) {
    if (err) {
      console.error('Error removing drill from practices:', err);
      return res.status(500).json({ error: 'Failed to remove drill from practices' });
    }
    
    // Then delete the drill
    db.run('DELETE FROM drills WHERE id = ?', [drillId], function(err) {
      if (err) {
        console.error('Error deleting drill:', err);
        return res.status(500).json({ error: 'Failed to delete drill' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Drill not found' });
      }
      
      res.json({ message: 'Drill deleted successfully' });
    });
  });
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