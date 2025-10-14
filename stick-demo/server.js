const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database
const dbPath = path.join(__dirname, 'practrac.db');
const db = new sqlite3.Database(dbPath);
db.run('PRAGMA foreign_keys = ON');

// Session configuration
app.use(session({
  secret: 'practrac-volleyball-secret-key-2025',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Set to true in production with HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Create new tables for practice sessions and attendance tracking
db.serialize(() => {
  // User authentication table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      organization TEXT,
      coaching_level TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // Core application tables
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      season TEXT NOT NULL,
      division TEXT NOT NULL,
      coach TEXT NOT NULL,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      jerseyNumber INTEGER NOT NULL,
      position TEXT NOT NULL,
      skillLevel INTEGER NOT NULL CHECK(skillLevel >= 1 AND skillLevel <= 5),
      height TEXT,
      year TEXT,
      team_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS player_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      kills INTEGER DEFAULT 0,
      blocks INTEGER DEFAULT 0,
      aces INTEGER DEFAULT 0,
      digs INTEGER DEFAULT 0,
      assists INTEGER DEFAULT 0,
      season TEXT NOT NULL,
      FOREIGN KEY (player_id) REFERENCES players (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS drills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      duration INTEGER NOT NULL,
      difficulty INTEGER NOT NULL CHECK(difficulty >= 1 AND difficulty <= 5),
      description TEXT,
      equipment TEXT,
      minPlayers INTEGER NOT NULL,
      maxPlayers INTEGER NOT NULL,
      focus TEXT,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS practices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      duration INTEGER NOT NULL,
      team_id INTEGER,
      objective TEXT,
      estimated_duration INTEGER,
      user_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id),
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS practice_phases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      practice_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      duration INTEGER NOT NULL,
      type TEXT NOT NULL,
      phase_order INTEGER NOT NULL,
      objective TEXT,
      FOREIGN KEY (practice_id) REFERENCES practices (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS practice_phase_drills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_id INTEGER NOT NULL,
      drill_id INTEGER NOT NULL,
      FOREIGN KEY (phase_id) REFERENCES practice_phases (id),
      FOREIGN KEY (drill_id) REFERENCES drills (id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      duration TEXT NOT NULL,
      thumbnail TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create practice_sessions table to track actual practice sessions
  db.run(`
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      practice_id INTEGER NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled', 'paused')),
      actual_duration INTEGER,
      notes TEXT,
      timer_state TEXT, -- JSON string storing timer data
      current_phase_id INTEGER,
      phase_elapsed_time INTEGER DEFAULT 0,
      total_elapsed_time INTEGER DEFAULT 0,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
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
  `);

  // Create player_notes table to track individual player notes during practice sessions
  db.run(`
    CREATE TABLE IF NOT EXISTS player_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      notes TEXT NOT NULL,
      note_type TEXT DEFAULT 'practice' CHECK(note_type IN ('practice', 'player')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
    )
  `, (err) => {
    if (err) {
      console.error('Error creating player notes table:', err);
    } else {
      // Migration: Add note_type column if it doesn't exist and remove UNIQUE constraint
      db.all("PRAGMA table_info(player_notes)", [], (err, columns) => {
        if (err) {
          console.error('Error checking table schema:', err);
          return;
        }
        
        const hasNoteType = columns.some(col => col.name === 'note_type');
        
        if (!hasNoteType) {
          console.log('🔄 Migrating player_notes table to add note_type column...');
          recreatePlayerNotesTable();
        } else {
          // Check if we need to update the constraint to support new values
          db.all("SELECT sql FROM sqlite_master WHERE type='table' AND name='player_notes'", [], (err, tables) => {
            if (err) {
              console.error('Error checking table constraints:', err);
              return;
            }
            
            const tableSQL = tables[0]?.sql || '';
            if (tableSQL.includes("note_type IN ('coach', 'player')") || tableSQL.includes('UNIQUE(session_id, player_id)')) {
              console.log('🔄 Updating player_notes table constraints...');
              recreatePlayerNotesTable();
            } else {
              console.log('✅ Player notes table schema is up to date');
            }
          });
        }
      });
      
      // Helper function to recreate the player_notes table with correct schema
      function recreatePlayerNotesTable() {
        // Create new table with correct constraints
        db.run(`
          CREATE TABLE player_notes_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            player_id INTEGER NOT NULL,
            notes TEXT NOT NULL,
            note_type TEXT DEFAULT 'practice' CHECK(note_type IN ('practice', 'player')),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES practice_sessions(id) ON DELETE CASCADE,
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
          )
        `, (err) => {
          if (err) {
            console.error('Error creating new player_notes table:', err);
            return;
          }
          
          // Copy data to new table
          db.run(`
            INSERT INTO player_notes_new (id, session_id, player_id, notes, note_type, created_at, updated_at)
            SELECT id, session_id, player_id, notes, 
                   CASE 
                     WHEN COALESCE(note_type, 'coach') = 'coach' THEN 'practice'
                     ELSE COALESCE(note_type, 'practice')
                   END, 
                   created_at, updated_at 
            FROM player_notes
          `, (err) => {
            if (err) {
              console.error('Error copying data to new table:', err);
              return;
            }
            
            // Drop old table and rename new one
            db.run("DROP TABLE player_notes", (err) => {
              if (err) {
                console.error('Error dropping old table:', err);
                return;
              }
              
              db.run("ALTER TABLE player_notes_new RENAME TO player_notes", (err) => {
                if (err) {
                  console.error('Error renaming table:', err);
                } else {
                  console.log('✅ Player notes table migration completed');
                }
              });
            });
          });
        });
      }
      
      console.log('✅ All database tables initialized');
    }
  });
});

// Authentication middleware
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
};

// Optional authentication middleware (doesn't block if not authenticated)
const optionalAuth = (req, res, next) => {
  // This middleware just passes through, useful for routes that can work with or without auth
  next();
};

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
    
    // Parse JSON fields with error handling
    const processedDrills = drills.map(drill => {
      let equipment = [];
      let focus = [];
      
      try {
        equipment = JSON.parse(drill.equipment || '[]');
        if (!Array.isArray(equipment)) {
          // Handle case where equipment is a string instead of array
          equipment = drill.equipment ? [drill.equipment] : [];
        }
      } catch (e) {
        console.warn(`Invalid equipment JSON for drill ${drill.id}:`, drill.equipment);
        equipment = drill.equipment ? [drill.equipment] : [];
      }
      
      try {
        focus = JSON.parse(drill.focus || '[]');
        if (!Array.isArray(focus)) {
          // Handle case where focus is a string instead of array
          focus = drill.focus ? [drill.focus] : [];
        }
      } catch (e) {
        console.warn(`Invalid focus JSON for drill ${drill.id}:`, drill.focus);
        focus = drill.focus ? [drill.focus] : [];
      }
      
      return {
        ...drill,
        equipment,
        focus
      };
    });
    
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
    
    let equipment = [];
    let focus = [];
    
    try {
      equipment = JSON.parse(drill.equipment || '[]');
      if (!Array.isArray(equipment)) {
        equipment = drill.equipment ? [drill.equipment] : [];
      }
    } catch (e) {
      console.warn(`Invalid equipment JSON for drill ${drill.id}:`, drill.equipment);
      equipment = drill.equipment ? [drill.equipment] : [];
    }
    
    try {
      focus = JSON.parse(drill.focus || '[]');
      if (!Array.isArray(focus)) {
        focus = drill.focus ? [drill.focus] : [];
      }
    } catch (e) {
      console.warn(`Invalid focus JSON for drill ${drill.id}:`, drill.focus);
      focus = drill.focus ? [drill.focus] : [];
    }
    
    const processedDrill = {
      ...drill,
      equipment,
      focus
    };
    
    callback(null, processedDrill);
  });
};

// API Routes

// Authentication Routes
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Username, email, and password are required' });
  }
  
  try {
    // Check if user already exists
    db.get('SELECT id FROM users WHERE username = ? OR email = ?', [username, email], async (err, existingUser) => {
      if (err) {
        console.error('Error checking existing user:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create user
      db.run('INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)', 
        [username, email, hashedPassword], 
        function(err) {
          if (err) {
            console.error('Error creating user:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          
          // Set session
          req.session.userId = this.lastID;
          req.session.username = username;
          
          res.status(201).json({ 
            message: 'User registered successfully', 
            user: { id: this.lastID, username, email } 
          });
        }
      );
    });
  } catch (error) {
    console.error('Error in registration:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Find user by username or email
  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, username], async (err, user) => {
    if (err) {
      console.error('Error finding user:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    try {
      // Check password
      const validPassword = await bcrypt.compare(password, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Set session
      req.session.userId = user.id;
      req.session.username = user.username;
      
      res.json({ 
        message: 'Login successful', 
        user: { id: user.id, username: user.username, email: user.email } 
      });
    } catch (error) {
      console.error('Error comparing passwords:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Error destroying session:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logout successful' });
  });
});

app.get('/api/user', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  db.get('SELECT id, username, email, created_at FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user });
  });
});

app.put('/api/user/settings', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { username, email } = req.body;
  
  if (!username || !email) {
    return res.status(400).json({ error: 'Username and email are required' });
  }
  
  // Check if username or email already exists for other users
  db.get('SELECT id FROM users WHERE (username = ? OR email = ?) AND id != ?', 
    [username, email, req.session.userId], (err, existingUser) => {
      if (err) {
        console.error('Error checking existing user:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }
      
      // Update user
      db.run('UPDATE users SET username = ?, email = ? WHERE id = ?', 
        [username, email, req.session.userId], (err) => {
          if (err) {
            console.error('Error updating user:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          
          // Update session username
          req.session.username = username;
          
          res.json({ message: 'Settings updated successfully', user: { username, email } });
        }
      );
    }
  );
});

app.put('/api/user/password', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }
  
  // Get current user
  db.get('SELECT password_hash FROM users WHERE id = ?', [req.session.userId], async (err, user) => {
    if (err) {
      console.error('Error fetching user:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    try {
      // Verify current password
      const validPassword = await bcrypt.compare(currentPassword, user.password_hash);
      if (!validPassword) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      // Hash new password
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      
      // Update password
      db.run('UPDATE users SET password_hash = ? WHERE id = ?', 
        [hashedNewPassword, req.session.userId], (err) => {
          if (err) {
            console.error('Error updating password:', err);
            return res.status(500).json({ error: 'Internal server error' });
          }
          
          res.json({ message: 'Password updated successfully' });
        }
      );
    } catch (error) {
      console.error('Error in password update:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

app.get('/api/teams', optionalAuth, (req, res) => {
  getTeams((err, teams) => {
    if (err) {
      console.error('Error fetching teams:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(teams);
  });
});

app.get('/api/players', optionalAuth, (req, res) => {
  getPlayers((err, players) => {
    if (err) {
      console.error('Error fetching players:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(players);
  });
});

app.get('/api/drills', optionalAuth, (req, res) => {
  getDrills((err, drills) => {
    if (err) {
      console.error('Error fetching drills:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(drills);
  });
});

app.get('/api/practices', optionalAuth, (req, res) => {
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
    INSERT INTO players (firstName, lastName, jerseyNumber, position, skillLevel, height, year) 
    VALUES (?, ?, ?, ?, ?, ?, ?)
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
  const playerId = parseInt(req.params.id);
  
  // Check if player exists first
  getPlayerById(playerId, (err, player) => {
    if (err) {
      console.error('Error fetching player:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }
    
    // Get attendance history
    db.all(`
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
    `, [playerId], (err, attendanceHistory) => {
      if (err) {
        console.error('Error fetching attendance history:', err);
        return res.status(500).json({ error: 'Internal server error' });
      }
      
      // Calculate statistics
      db.get(`
        SELECT COUNT(*) as count 
        FROM practice_sessions 
        WHERE started_at <= datetime('now')
      `, (err, totalResult) => {
        if (err) {
          console.error('Error fetching total practices:', err);
          return res.status(500).json({ error: 'Internal server error' });
        }
        
        const totalPractices = totalResult.count;
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
      });
    });
  });
});

// CRUD operations for teams
app.post('/api/teams', (req, res) => {
  const { name, season, division, coach } = req.body;
  
  db.run(`
    INSERT INTO teams (name, season, division, coach) 
    VALUES (?, ?, ?, ?)
  `, [name, season, division, coach], function(err) {
    if (err) {
      console.error('Error creating team:', err);
      return res.status(500).json({ error: 'Failed to create team' });
    }
    
    // Get the newly created team
    db.get('SELECT * FROM teams WHERE id = ?', [this.lastID], (err, team) => {
      if (err) {
        console.error('Error retrieving team:', err);
        return res.status(500).json({ error: 'Team created but failed to retrieve' });
      }
      res.status(201).json(team);
    });
  });
});

app.put('/api/teams/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, season, division, coach } = req.body;
  
  db.run(`
    UPDATE teams 
    SET name = ?, season = ?, division = ?, coach = ?
    WHERE id = ?
  `, [name, season, division, coach, id], function(err) {
    if (err) {
      console.error('Error updating team:', err);
      return res.status(500).json({ error: 'Failed to update team' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    // Get the updated team
    db.get('SELECT * FROM teams WHERE id = ?', [id], (err, team) => {
      if (err) {
        console.error('Error retrieving updated team:', err);
        return res.status(500).json({ error: 'Team updated but failed to retrieve' });
      }
      res.json(team);
    });
  });
});

app.delete('/api/teams/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  db.run('DELETE FROM teams WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting team:', err);
      return res.status(500).json({ error: 'Failed to delete team' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ message: 'Team deleted successfully' });
  });
});

// CRUD operations for drills
app.post('/api/drills', (req, res) => {
  const { name, category, duration, difficulty, description, equipment, minPlayers, maxPlayers, focus } = req.body;
  
  db.run(`
    INSERT INTO drills (name, category, duration, difficulty, description, equipment, minPlayers, maxPlayers, focus) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    name, 
    category, 
    duration, 
    difficulty, 
    description, 
    JSON.stringify(equipment || []), 
    minPlayers, 
    maxPlayers, 
    JSON.stringify(focus || [])
  ], function(err) {
    if (err) {
      console.error('Error creating drill:', err);
      return res.status(500).json({ error: 'Failed to create drill' });
    }
    
    // Get the newly created drill
    getDrillById(this.lastID, (err, drill) => {
      if (err) {
        console.error('Error retrieving drill:', err);
        return res.status(500).json({ error: 'Drill created but failed to retrieve' });
      }
      res.status(201).json(drill);
    });
  });
});

app.put('/api/drills/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { name, category, duration, difficulty, description, equipment, minPlayers, maxPlayers, focus } = req.body;
  
  db.run(`
    UPDATE drills 
    SET name = ?, category = ?, duration = ?, difficulty = ?, description = ?, equipment = ?, minPlayers = ?, maxPlayers = ?, focus = ?
    WHERE id = ?
  `, [
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
  ], function(err) {
    if (err) {
      console.error('Error updating drill:', err);
      return res.status(500).json({ error: 'Failed to update drill' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Drill not found' });
    }
    
    getDrillById(id, (err, drill) => {
      if (err) {
        console.error('Error retrieving updated drill:', err);
        return res.status(500).json({ error: 'Drill updated but failed to retrieve' });
      }
      res.json(drill);
    });
  });
});

// CRUD operations for videos
app.post('/api/videos', (req, res) => {
  const { title, category, duration, thumbnail, description } = req.body;
  
  db.run(`
    INSERT INTO videos (title, category, duration, thumbnail, description) 
    VALUES (?, ?, ?, ?, ?)
  `, [title, category, duration, thumbnail, description], function(err) {
    if (err) {
      console.error('Error creating video:', err);
      return res.status(500).json({ error: 'Failed to create video' });
    }
    
    db.get('SELECT * FROM videos WHERE id = ?', [this.lastID], (err, video) => {
      if (err) {
        console.error('Error retrieving video:', err);
        return res.status(500).json({ error: 'Video created but failed to retrieve' });
      }
      res.status(201).json(video);
    });
  });
});

app.put('/api/videos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const { title, category, duration, thumbnail, description } = req.body;
  
  db.run(`
    UPDATE videos 
    SET title = ?, category = ?, duration = ?, thumbnail = ?, description = ?
    WHERE id = ?
  `, [title, category, duration, thumbnail, description, id], function(err) {
    if (err) {
      console.error('Error updating video:', err);
      return res.status(500).json({ error: 'Failed to update video' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    db.get('SELECT * FROM videos WHERE id = ?', [id], (err, video) => {
      if (err) {
        console.error('Error retrieving updated video:', err);
        return res.status(500).json({ error: 'Video updated but failed to retrieve' });
      }
      res.json(video);
    });
  });
});

app.delete('/api/videos/:id', (req, res) => {
  const id = parseInt(req.params.id);
  
  db.run('DELETE FROM videos WHERE id = ?', [id], function(err) {
    if (err) {
      console.error('Error deleting video:', err);
      return res.status(500).json({ error: 'Failed to delete video' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }
    
    res.json({ message: 'Video deleted successfully' });
  });
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
        INSERT INTO practice_sessions (practice_id, status, timer_state, phase_elapsed_time, total_elapsed_time) 
        VALUES (?, 'in_progress', '{}', 0, 0)
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
  const sessionId = parseInt(req.params.id);
  const { actual_duration, notes } = req.body;
  
  db.run(`
    UPDATE practice_sessions 
    SET status = 'completed', completed_at = CURRENT_TIMESTAMP, actual_duration = ?, notes = ?
    WHERE id = ?
  `, [actual_duration, notes, sessionId], function(err) {
    if (err) {
      console.error('Error completing practice session:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (this.changes > 0) {
      // Get the updated session data
      getSessionByIdAsync(sessionId, (session) => {
        if (session) {
          res.json(session);
        } else {
          res.json({ message: 'Practice session completed successfully' });
        }
      });
    } else {
      res.status(404).json({ error: 'Practice session not found' });
    }
  });
});

// Get past practice sessions
app.get('/api/practice-sessions', (req, res) => {
  getPracticeSessionsAsync((sessions) => {
    res.json(sessions);
  });
});

// Get active practice sessions (must be before /:id route)
app.get('/api/practice-sessions/active', (req, res) => {
  const query = `
    SELECT ps.*, p.name as practice_name, p.objective, p.estimated_duration
    FROM practice_sessions ps
    JOIN practices p ON ps.practice_id = p.id
    WHERE ps.status IN ('in_progress', 'paused')
    ORDER BY ps.last_activity DESC
    LIMIT 1
  `;
  
  db.get(query, [], (err, session) => {
    if (err) {
      console.error('Error fetching active session:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (session) {
      // Parse timer state if it exists
      if (session.timer_state) {
        try {
          session.timer_state = JSON.parse(session.timer_state);
        } catch (e) {
          session.timer_state = null;
        }
      }
      res.json({ session: session, hasActiveSession: true });
    } else {
      // Return 200 with null session instead of 404 to avoid console errors
      res.json({ session: null, hasActiveSession: false });
    }
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
  const sessionId = parseInt(req.params.id);
  const { player_id, attended, late_minutes, notes } = req.body;
  
  // Check if session exists
  db.get('SELECT id FROM practice_sessions WHERE id = ?', [sessionId], (err, session) => {
    if (err) {
      console.error('Error checking session:', err);
      return res.status(500).json({ error: 'Failed to check session' });
    }
    
    if (!session) {
      return res.status(404).json({ error: 'Practice session not found' });
    }
    
    // Update attendance record
    db.run(`
      UPDATE practice_attendance 
      SET attended = ?, late_minutes = ?, notes = ?
      WHERE session_id = ? AND player_id = ?
    `, [
      attended ? 1 : 0, 
      late_minutes || 0, 
      notes || null, 
      sessionId, 
      player_id
    ], function(err) {
      if (err) {
        console.error('Error updating attendance:', err);
        return res.status(500).json({ error: 'Failed to update attendance' });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({ error: 'Attendance record not found' });
      }
      
      // Get updated session data
      getSessionByIdAsync(sessionId, (session) => {
        if (session) {
          res.json(session);
        } else {
          res.status(500).json({ error: 'Attendance updated but failed to retrieve session' });
        }
      });
    });
  });
});

// Update session notes
app.put('/api/practice-sessions/:id/notes', (req, res) => {
  const sessionId = parseInt(req.params.id);
  const { notes } = req.body;
  
  db.run(`
    UPDATE practice_sessions 
    SET notes = ?, last_activity = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [notes, sessionId], function(err) {
    if (err) {
      console.error('Error updating session notes:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    if (this.changes > 0) {
      res.json({ message: 'Notes updated successfully' });
    } else {
      res.status(404).json({ error: 'Practice session not found' });
    }
  });
});

// Save player notes for a practice session
app.post('/api/practice-sessions/:id/player-notes', (req, res) => {
  const sessionId = parseInt(req.params.id);
  const { playerId, notes, noteType = 'practice' } = req.body;
  
  if (!playerId || notes === undefined) {
    return res.status(400).json({ error: 'Player ID and notes are required' });
  }
  
  db.run(`
    INSERT INTO player_notes (session_id, player_id, notes, note_type, created_at, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `, [sessionId, playerId, notes, noteType], function(err) {
    if (err) {
      console.error('Error saving player notes:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    res.json({ 
      message: 'Player notes saved successfully',
      noteId: this.lastID 
    });
  });
});

// Get player notes for a specific player
app.get('/api/players/:playerId/notes', (req, res) => {
  const playerId = parseInt(req.params.playerId);
  
  db.all(`
    SELECT 
      pn.*,
      ps.started_at,
      ps.completed_at,
      p.name as practice_name
    FROM player_notes pn
    JOIN practice_sessions ps ON pn.session_id = ps.id
    JOIN practices p ON ps.practice_id = p.id
    WHERE pn.player_id = ?
    ORDER BY ps.started_at DESC, pn.created_at DESC
  `, [playerId], (err, notes) => {
    if (err) {
      console.error('Error fetching player notes:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    res.json(notes);
  });
});

// Get player notes for a specific practice session
app.get('/api/practice-sessions/:id/player-notes/:playerId', (req, res) => {
  const sessionId = parseInt(req.params.id);
  const playerId = parseInt(req.params.playerId);
  
  db.all(`
    SELECT * FROM player_notes 
    WHERE session_id = ? AND player_id = ?
    ORDER BY created_at ASC
  `, [sessionId, playerId], (err, notes) => {
    if (err) {
      console.error('Error fetching session player notes:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
    
    res.json(notes);
  });
});

// Update session timer state (for pause/resume functionality)
app.put('/api/practice-sessions/:id/timer-state', (req, res) => {
  const sessionId = parseInt(req.params.id);
  
  // Handle both JSON and sendBeacon (text/plain) content types
  let data;
  if (req.is('application/json')) {
    data = req.body;
  } else {
    // Handle sendBeacon data (text/plain)
    try {
      data = JSON.parse(req.body);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON data' });
    }
  }
  
  const { status, timer_state, current_phase_id, phase_elapsed_time, total_elapsed_time } = data;
  
  console.log('Updating session timer state:', {
    sessionId,
    status,
    current_phase_id,
    phase_elapsed_time,
    total_elapsed_time
  });
  
  db.run(`
    UPDATE practice_sessions 
    SET status = ?, timer_state = ?, current_phase_id = ?, 
        phase_elapsed_time = ?, total_elapsed_time = ?, 
        last_activity = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [status, JSON.stringify(timer_state), current_phase_id, phase_elapsed_time, total_elapsed_time, sessionId], function(err) {
    if (err) {
      console.error('Error updating session timer state:', err);
      return res.status(500).json({ error: 'Failed to update session state' });
    }
    
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Practice session not found' });
    }
    
    console.log('Session timer state updated successfully for session:', sessionId);
    res.json({ message: 'Session state updated successfully' });
  });
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
          
          let attendanceRate = "N/A"; // Default when no data available
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
  
  // Delete all related records in sequence (some tables don't have CASCADE)
  
  // 1. Delete player stats
  db.run('DELETE FROM player_stats WHERE player_id = ?', [playerId], function(err) {
    if (err) {
      console.error('Error deleting player stats:', err);
      return res.status(500).json({ error: 'Failed to delete player stats' });
    }
    
    // 2. Delete practice attendance (this should cascade but being explicit)
    db.run('DELETE FROM practice_attendance WHERE player_id = ?', [playerId], function(err) {
      if (err) {
        console.error('Error deleting player attendance:', err);
        return res.status(500).json({ error: 'Failed to delete player attendance' });
      }
      
      // 3. Delete player notes (this should cascade but being explicit)
      db.run('DELETE FROM player_notes WHERE player_id = ?', [playerId], function(err) {
        if (err) {
          console.error('Error deleting player notes:', err);
          return res.status(500).json({ error: 'Failed to delete player notes' });
        }
        
        // 4. Finally delete the player
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
  const drillId = parseInt(req.params.id);
  
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