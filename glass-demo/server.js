const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = process.env.PORT || 3000;

// Database setup
const dbPath = path.join(__dirname, 'practrac.db');
const db = new sqlite3.Database(dbPath);
db.run('PRAGMA foreign_keys = ON');

// Create tables
db.serialize(() => {
  // Teams table
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      season TEXT,
      division TEXT,
      coach TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Players table
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      firstName TEXT NOT NULL,
      lastName TEXT NOT NULL,
      jerseyNumber INTEGER,
      position TEXT,
      skillLevel INTEGER,
      height TEXT,
      year TEXT,
      kills INTEGER DEFAULT 0,
      blocks INTEGER DEFAULT 0,
      aces INTEGER DEFAULT 0,
      digs INTEGER DEFAULT 0,
      assists INTEGER DEFAULT 0,
      team_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
    )
  `);

  // Drills table
  db.run(`
    CREATE TABLE IF NOT EXISTS drills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT,
      duration INTEGER,
      difficulty INTEGER,
      description TEXT,
      equipment TEXT,
      minPlayers INTEGER,
      maxPlayers INTEGER,
      focus TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Practices table
  db.run(`
    CREATE TABLE IF NOT EXISTS practices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT,
      duration INTEGER,
      phases TEXT,
      notes TEXT,
      team_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
    )
  `);

  // Videos table
  db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT,
      duration TEXT,
      thumbnail TEXT,
      description TEXT,
      url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Practice sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      practice_id INTEGER,
      practice_name TEXT,
      start_time DATETIME,
      end_time DATETIME,
      current_phase INTEGER,
      current_phase_start DATETIME,
      phase_timer_seconds INTEGER,
      total_elapsed_seconds INTEGER,
      is_paused BOOLEAN DEFAULT 0,
      notes TEXT,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (practice_id) REFERENCES practices (id) ON DELETE CASCADE
    )
  `);

  // Practice attendance table
  db.run(`
    CREATE TABLE IF NOT EXISTS practice_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      player_id INTEGER,
      status TEXT DEFAULT 'present',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES practice_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
    )
  `);

  // Player notes table
  db.run(`
    CREATE TABLE IF NOT EXISTS player_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER,
      player_id INTEGER,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES practice_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
    )
  `);

  // Seed initial data if tables are empty
  db.get('SELECT COUNT(*) as count FROM teams', [], (err, result) => {
    if (err) {
      console.error('Error checking teams count:', err);
      return;
    }
    
    if (result.count === 0) {
      console.log('Seeding initial data...');
      
      // Insert team
      db.run(`
        INSERT INTO teams (name, season, division, coach)
        VALUES ('Riverside High Volleyball', 'Fall 2025', 'Varsity', 'Sarah Johnson')
      `, function(err) {
        if (err) {
          console.error('Error inserting team:', err);
          return;
        }
        
        const teamId = this.lastID;
        
        // Insert players
        const players = [
          ['Emma', 'Martinez', 12, 'Outside Hitter', 4, '5\'8"', 'Junior', 145, 23, 31, 89, 0],
          ['Olivia', 'Chen', 8, 'Setter', 5, '5\'6"', 'Senior', 34, 0, 18, 67, 298],
          ['Sophia', 'Williams', 15, 'Middle Blocker', 4, '6\'1"', 'Sophomore', 89, 67, 12, 45, 0],
          ['Ava', 'Thompson', 6, 'Libero', 5, '5\'4"', 'Senior', 8, 0, 15, 234, 0],
          ['Isabella', 'Davis', 3, 'Right Side', 3, '5\'10"', 'Junior', 78, 34, 22, 56, 0],
          ['Mia', 'Rodriguez', 11, 'Outside Hitter', 4, '5\'9"', 'Sophomore', 112, 18, 28, 72, 0]
        ];
        
        const playerStmt = db.prepare(`
          INSERT INTO players (firstName, lastName, jerseyNumber, position, skillLevel, height, year, kills, blocks, aces, digs, assists, team_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        players.forEach(player => {
          playerStmt.run([...player, teamId]);
        });
        playerStmt.finalize();
        
        // Insert drills
        const drills = [
          ['Pepper Warm-up', 'Warm-up', 10, 2, 'Basic partner passing and setting to warm up', JSON.stringify(['Volleyballs']), 2, 12, JSON.stringify(['Passing', 'Setting', 'Ball Control'])],
          ['Attack Line Hitting', 'Offense', 20, 4, 'Practice attacking from different positions along the net', JSON.stringify(['Volleyballs', 'Net']), 6, 12, JSON.stringify(['Attacking', 'Timing', 'Footwork'])],
          ['Block and Transition', 'Defense', 15, 4, 'Practice blocking and quick transition to offense', JSON.stringify(['Volleyballs', 'Net']), 6, 12, JSON.stringify(['Blocking', 'Transition', 'Communication'])],
          ['Serve and Pass', 'Serve/Receive', 15, 3, 'Practice serving accuracy and passing under pressure', JSON.stringify(['Volleyballs', 'Targets']), 4, 8, JSON.stringify(['Serving', 'Passing', 'Pressure'])]
        ];
        
        const drillStmt = db.prepare(`
          INSERT INTO drills (name, category, duration, difficulty, description, equipment, minPlayers, maxPlayers, focus)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        drills.forEach(drill => {
          drillStmt.run(drill);
        });
        drillStmt.finalize();
        
        // Insert practice plan
        const practicePhases = JSON.stringify([
          {
            id: 1,
            name: "Dynamic Warm-up",
            duration: 15,
            type: "warmup",
            drills: [1]
          },
          {
            id: 2,
            name: "Skill Development",
            duration: 45,
            type: "skill",
            drills: [2, 4]
          },
          {
            id: 3,
            name: "Game Situations",
            duration: 30,
            type: "scrimmage",
            drills: [3]
          },
          {
            id: 4,
            name: "Cool Down",
            duration: 15,
            type: "cooldown",
            drills: [1]
          }
        ]);
        
        db.run(`
          INSERT INTO practices (name, date, duration, phases, team_id)
          VALUES ('Championship Prep', '2025-10-08', 120, ?, ?)
        `, [practicePhases, teamId]);
        
        // Insert videos
        const videos = [
          ['Serving Fundamentals', 'Technique', '6:23', '/images/serving-thumb.jpg', 'Basic serving techniques and stance for consistent serves'],
          ['Setting Techniques', 'Technique', '8:15', '/images/setting-thumb.jpg', 'Hand positioning, footwork, and timing for effective setting'],
          ['Spiking Power', 'Offense', '5:47', '/images/spiking-thumb.jpg', 'Approach steps, arm swing, and contact point for powerful attacks'],
          ['Digging and Defense', 'Defense', '7:12', '/images/digging-thumb.jpg', 'Proper body positioning and platform angle for defensive digs'],
          ['Team Communication', 'Strategy', '4:38', '/images/communication-thumb.jpg', 'Verbal and non-verbal communication strategies during play'],
          ['Rotation Basics', 'Strategy', '9:22', '/images/rotation-thumb.jpg', 'Understanding court positions and rotation responsibilities'],
          ['Blocking Mechanics', 'Defense', '4:45', '/images/blocking-thumb.jpg', 'Proper blocking technique, timing, and court positioning'],
          ['Team Rotation Systems', 'Strategy', '7:30', '/images/rotation-thumb.jpg', 'Understanding 6-2 and 5-1 rotation systems and player movement']
        ];
        
        const videoStmt = db.prepare(`
          INSERT INTO videos (title, category, duration, thumbnail, description)
          VALUES (?, ?, ?, ?, ?)
        `);
        
        videos.forEach(video => {
          videoStmt.run(video);
        });
        videoStmt.finalize();
        
        console.log('Initial data seeded successfully!');
      });
    }
  });
});

// Middleware
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('public'));
  // API Routes

  drills: [
    {
      id: 1,
      name: "Pepper Warm-up",
      category: "Warm-up",
      duration: 10,
      difficulty: 2,
      description: "Basic partner passing and setting to warm up",
      equipment: ["Volleyballs"],
      minPlayers: 2,
      maxPlayers: 12,
      focus: ["Passing", "Setting", "Ball Control"]
    },
    {
      id: 2,
      name: "Attack Line Hitting",
      category: "Offense",
      duration: 20,
      difficulty: 4,
      description: "Practice attacking from different positions along the net",
      equipment: ["Volleyballs", "Net"],
      minPlayers: 6,
      maxPlayers: 12,
      focus: ["Attacking", "Timing", "Footwork"]
    },
    {
      id: 3,
      name: "Block and Transition",
      category: "Defense",
      duration: 15,
      difficulty: 4,
      description: "Practice blocking and quick transition to offense",
      equipment: ["Volleyballs", "Net"],
      minPlayers: 6,
      maxPlayers: 12,
      focus: ["Blocking", "Transition", "Communication"]
    },
    {
      id: 4,
      name: "Serve and Pass",
      category: "Serve/Receive",
      duration: 15,
      difficulty: 3,
      description: "Practice serving accuracy and passing under pressure",
      equipment: ["Volleyballs", "Targets"],
      minPlayers: 4,
      maxPlayers: 8,
      focus: ["Serving", "Passing", "Pressure"]
    }
  ],

  practices: [
    {
      id: 1,
      name: "Championship Prep",
      date: "2025-10-08",
      duration: 120,
      phases: [
        {
          id: 1,
          name: "Dynamic Warm-up",
          duration: 15,
          type: "warmup",
          drills: [1]
        },
        {
          id: 2,
          name: "Skill Development",
          duration: 45,
          type: "skill",
          drills: [2, 4]
        },
        {
          id: 3,
          name: "Game Situations",
          duration: 40,
          type: "scrimmage",
          drills: [3]
        },
        {
          id: 4,
          name: "Cool Down",
          duration: 20,
          type: "cooldown",
          drills: []
        }
      ]
    },
    {
      id: 2,
      name: "Fundamentals Focus",
      date: "2025-10-10",
      duration: 90,
      phases: [
        {
          id: 1,
          name: "Warm-up",
          duration: 15,
          type: "warmup",
          drills: [1]
        },
        {
          id: 2,
          name: "Passing & Setting",
          duration: 35,
          type: "skill",
          drills: [4]
        },
        {
          id: 3,
          name: "Attack Practice",
          duration: 25,
          type: "drill",
          drills: [2]
        },
        {
          id: 4,
          name: "Conditioning",
          duration: 15,
          type: "cooldown",
          drills: []
        }
      ]
    }
  ],

  videos: [
    {
      id: 1,
      title: "Perfect Spike Technique",
      category: "Attacking",
      duration: "3:45",
      thumbnail: "/images/spike-thumb.jpg",
      description: "Learn the fundamentals of a powerful volleyball spike with proper approach and contact"
    },
    {
      id: 2,
      title: "Setter Hand Position",
      category: "Setting",
      duration: "2:30",
      thumbnail: "/images/setting-thumb.jpg",
      description: "Master the proper hand positioning for consistent and accurate sets"
    },
    {
      id: 3,
      title: "Defensive Positioning",
      category: "Defense",
      duration: "4:15",
      thumbnail: "/images/defense-thumb.jpg",
      description: "Understanding court positioning and reading the game for effective defense"
    },
    {
      id: 4,
      title: "Serving Accuracy Drills",
      category: "Serving",
      duration: "5:20",
      thumbnail: "/images/serve-thumb.jpg",
      description: "Improve serving consistency and target accuracy with progressive drills"
    },
    {
      id: 5,
      title: "Quick Attack Timing",
      category: "Attacking",
      duration: "3:30",
      thumbnail: "/images/quick-attack-thumb.jpg",
      description: "Perfect the timing between setter and attacker for quick attacks"
    },
    {
      id: 6,
      title: "Passing Fundamentals",
      category: "Defense",
      duration: "6:10",
      thumbnail: "/images/passing-thumb.jpg",
      description: "Basic passing technique, platform formation, and ball control"
    },
    {
      id: 7,
      title: "Blocking Mechanics",
      category: "Defense",
      duration: "4:45",
      thumbnail: "/images/blocking-thumb.jpg",
      description: "Proper blocking technique, timing, and court positioning"
    },
    {
      id: 8,
      title: "Team Rotation Systems",
      category: "Strategy",
      duration: "7:30",
      thumbnail: "/images/rotation-thumb.jpg",
      description: "Understanding 6-2 and 5-1 rotation systems and player movement"
    }
  ]
};

// API Routes
app.get('/api/teams', (req, res) => {
  db.all('SELECT * FROM teams ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/players', (req, res) => {
  const query = `
    SELECT p.*, t.name as team_name
    FROM players p
    LEFT JOIN teams t ON p.team_id = t.id
    ORDER BY p.lastName, p.firstName
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Format the response to match the expected structure
    const players = rows.map(row => ({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      jerseyNumber: row.jerseyNumber,
      position: row.position,
      skillLevel: row.skillLevel,
      height: row.height,
      year: row.year,
      stats: {
        kills: row.kills || 0,
        blocks: row.blocks || 0,
        aces: row.aces || 0,
        digs: row.digs || 0,
        assists: row.assists || 0
      },
      team_name: row.team_name
    }));
    res.json(players);
  });
});

app.get('/api/drills', (req, res) => {
  db.all('SELECT * FROM drills ORDER BY category, name', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Parse JSON fields that were stored as strings
    const drills = rows.map(row => ({
      ...row,
      equipment: row.equipment ? JSON.parse(row.equipment) : [],
      focus: row.focus ? JSON.parse(row.focus) : []
    }));
    res.json(drills);
  });
});

app.get('/api/practices', (req, res) => {
  const query = `
    SELECT p.*, t.name as team_name
    FROM practices p
    LEFT JOIN teams t ON p.team_id = t.id
    ORDER BY p.date DESC, p.created_at DESC
  `;
  db.all(query, [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Parse JSON fields that were stored as strings
    const practices = rows.map(row => ({
      ...row,
      phases: row.phases ? JSON.parse(row.phases) : [],
      team_name: row.team_name
    }));
    res.json(practices);
  });
});

app.get('/api/videos', (req, res) => {
  db.all('SELECT * FROM videos ORDER BY category, title', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get('/api/players/:id', (req, res) => {
  const query = `
    SELECT p.*, t.name as team_name
    FROM players p
    LEFT JOIN teams t ON p.team_id = t.id
    WHERE p.id = ?
  `;
  db.get(query, [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      const player = {
        id: row.id,
        firstName: row.firstName,
        lastName: row.lastName,
        jerseyNumber: row.jerseyNumber,
        position: row.position,
        skillLevel: row.skillLevel,
        height: row.height,
        year: row.year,
        stats: {
          kills: row.kills || 0,
          blocks: row.blocks || 0,
          aces: row.aces || 0,
          digs: row.digs || 0,
          assists: row.assists || 0
        },
        team_name: row.team_name
      };
      res.json(player);
    } else {
      res.status(404).json({ error: 'Player not found' });
    }
  });
});

app.get('/api/drills/:id', (req, res) => {
  db.get('SELECT * FROM drills WHERE id = ?', [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      const drill = {
        ...row,
        equipment: row.equipment ? JSON.parse(row.equipment) : [],
        focus: row.focus ? JSON.parse(row.focus) : []
      };
      res.json(drill);
    } else {
      res.status(404).json({ error: 'Drill not found' });
    }
  });
});

// Practice session management
app.get('/api/practice-sessions/active', (req, res) => {
  db.get(
    'SELECT * FROM practice_sessions WHERE status = "active" ORDER BY created_at DESC LIMIT 1',
    [],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(row || null);
    }
  );
});

app.post('/api/practice-sessions', (req, res) => {
  const { practice_id, practice_name, start_time, notes } = req.body;
  
  const query = `
    INSERT INTO practice_sessions (practice_id, practice_name, start_time, notes, status)
    VALUES (?, ?, ?, ?, 'active')
  `;
  
  db.run(query, [practice_id, practice_name, start_time, notes], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    db.get('SELECT * FROM practice_sessions WHERE id = ?', [this.lastID], (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json(row);
    });
  });
});

app.put('/api/practice-sessions/:id', (req, res) => {
  const { current_phase, current_phase_start, phase_timer_seconds, total_elapsed_seconds, is_paused, notes } = req.body;
  
  const query = `
    UPDATE practice_sessions 
    SET current_phase = ?, current_phase_start = ?, phase_timer_seconds = ?, 
        total_elapsed_seconds = ?, is_paused = ?, notes = ?
    WHERE id = ?
  `;
  
  db.run(
    query, 
    [current_phase, current_phase_start, phase_timer_seconds, total_elapsed_seconds, is_paused, notes, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, changes: this.changes });
    }
  );
});

app.delete('/api/practice-sessions/:id', (req, res) => {
  db.run('UPDATE practice_sessions SET status = "completed", end_time = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, changes: this.changes });
  });
});

// Player notes endpoints
app.get('/api/player-notes/:sessionId/:playerId', (req, res) => {
  const query = 'SELECT * FROM player_notes WHERE session_id = ? AND player_id = ?';
  db.get(query, [req.params.sessionId, req.params.playerId], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(row || { notes: '' });
  });
});

app.post('/api/player-notes', (req, res) => {
  const { session_id, player_id, notes } = req.body;
  
  const query = `
    INSERT OR REPLACE INTO player_notes (session_id, player_id, notes, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
  `;
  
  db.run(query, [session_id, player_id, notes], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, id: this.lastID });
  });
});

app.get('/api/players/:id/notes', (req, res) => {
  const query = `
    SELECT pn.*, ps.practice_name, ps.start_time
    FROM player_notes pn
    JOIN practice_sessions ps ON pn.session_id = ps.id
    WHERE pn.player_id = ?
    ORDER BY ps.start_time DESC
  `;
  
  db.all(query, [req.params.id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Attendance management
app.post('/api/practice-attendance', (req, res) => {
  const attendanceData = req.body;
  
  if (!Array.isArray(attendanceData)) {
    return res.status(400).json({ error: 'Expected array of attendance records' });
  }

  const stmt = db.prepare(`
    INSERT OR REPLACE INTO practice_attendance (session_id, player_id, status, notes)
    VALUES (?, ?, ?, ?)
  `);

  const insertPromises = attendanceData.map(record => {
    return new Promise((resolve, reject) => {
      stmt.run([record.session_id, record.player_id, record.status, record.notes], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  });

  Promise.all(insertPromises)
    .then(ids => {
      stmt.finalize();
      res.json({ success: true, insertedIds: ids });
    })
    .catch(err => {
      stmt.finalize();
      res.status(500).json({ error: err.message });
    });
});

// Serve HTML pages
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/practice', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'practice.html'));
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

// Start server
app.listen(PORT, () => {
  console.log(`🏐 PracTrac Glass Demo Server running on http://localhost:${PORT}`);
  console.log(`📱 Black Glass UI Demo - Volleyball Practice Management`);
});