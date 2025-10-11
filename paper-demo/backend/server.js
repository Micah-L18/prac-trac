const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

// Initialize database
const dbPath = path.join(__dirname, process.env.DB_PATH || '../database/practrac.db');
const db = new sqlite3.Database(dbPath);
db.run('PRAGMA foreign_keys = ON');

// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: { success: false, error: 'Too many requests, please try again later' }
});

const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX) || 5,
  message: { success: false, error: 'Too many authentication attempts, please try again later' }
});

app.use('/api/', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Initialize database tables
db.serialize(() => {
  // Coaches table (users)
  db.run(`
    CREATE TABLE IF NOT EXISTS coaches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      username TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_login DATETIME,
      is_active BOOLEAN DEFAULT 1
    )
  `);

  // Coach sessions for token management
  db.run(`
    CREATE TABLE IF NOT EXISTS coach_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL,
      token_hash TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
      user_agent TEXT,
      ip_address TEXT,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE
    )
  `);

  // Teams table
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      season TEXT NOT NULL,
      division TEXT,
      description TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE,
      UNIQUE(coach_id, name, season)
    )
  `);

  // Coach active teams
  db.run(`
    CREATE TABLE IF NOT EXISTS coach_active_teams (
      coach_id INTEGER PRIMARY KEY,
      team_id INTEGER NOT NULL,
      selected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
    )
  `);

  // Players table
  db.run(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      jersey_number INTEGER NOT NULL,
      position TEXT NOT NULL,
      skill_level INTEGER NOT NULL CHECK(skill_level >= 1 AND skill_level <= 5),
      height TEXT,
      year TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
      UNIQUE(team_id, jersey_number)
    )
  `);

  // Player stats table
  db.run(`
    CREATE TABLE IF NOT EXISTS player_stats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      player_id INTEGER NOT NULL,
      season TEXT NOT NULL,
      kills INTEGER DEFAULT 0,
      blocks INTEGER DEFAULT 0,
      aces INTEGER DEFAULT 0,
      digs INTEGER DEFAULT 0,
      assists INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
      UNIQUE(player_id, season)
    )
  `);

  // Drills table
  db.run(`
    CREATE TABLE IF NOT EXISTS drills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      duration INTEGER NOT NULL,
      difficulty INTEGER NOT NULL CHECK(difficulty >= 1 AND difficulty <= 5),
      description TEXT,
      equipment TEXT,
      min_players INTEGER NOT NULL,
      max_players INTEGER NOT NULL,
      focus TEXT,
      is_public BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE
    )
  `);

  // Practices table
  db.run(`
    CREATE TABLE IF NOT EXISTS practices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      duration INTEGER NOT NULL,
      objective TEXT,
      estimated_duration INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE
    )
  `);

  // Practice phases table
  db.run(`
    CREATE TABLE IF NOT EXISTS practice_phases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      practice_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      duration INTEGER NOT NULL,
      type TEXT NOT NULL,
      phase_order INTEGER NOT NULL,
      objective TEXT,
      FOREIGN KEY (practice_id) REFERENCES practices (id) ON DELETE CASCADE
    )
  `);

  // Practice phase drills table
  db.run(`
    CREATE TABLE IF NOT EXISTS practice_phase_drills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_id INTEGER NOT NULL,
      drill_id INTEGER NOT NULL,
      FOREIGN KEY (phase_id) REFERENCES practice_phases (id) ON DELETE CASCADE,
      FOREIGN KEY (drill_id) REFERENCES drills (id) ON DELETE CASCADE
    )
  `);

  // Practice sessions table
  db.run(`
    CREATE TABLE IF NOT EXISTS practice_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      practice_id INTEGER NOT NULL,
      started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'cancelled', 'paused')),
      actual_duration INTEGER,
      notes TEXT,
      timer_state TEXT,
      current_phase_id INTEGER,
      phase_elapsed_time INTEGER DEFAULT 0,
      total_elapsed_time INTEGER DEFAULT 0,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (practice_id) REFERENCES practices (id) ON DELETE CASCADE
    )
  `);

  // Practice attendance table
  db.run(`
    CREATE TABLE IF NOT EXISTS practice_attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      attended BOOLEAN NOT NULL DEFAULT 1,
      late_minutes INTEGER DEFAULT 0,
      notes TEXT,
      FOREIGN KEY (session_id) REFERENCES practice_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE,
      UNIQUE(session_id, player_id)
    )
  `);

  // Player notes table
  db.run(`
    CREATE TABLE IF NOT EXISTS player_notes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id INTEGER NOT NULL,
      player_id INTEGER NOT NULL,
      notes TEXT NOT NULL,
      note_type TEXT DEFAULT 'practice' CHECK(note_type IN ('practice', 'player')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES practice_sessions (id) ON DELETE CASCADE,
      FOREIGN KEY (player_id) REFERENCES players (id) ON DELETE CASCADE
    )
  `);

  // Videos table
  db.run(`
    CREATE TABLE IF NOT EXISTS videos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      duration TEXT NOT NULL,
      thumbnail TEXT,
      description TEXT,
      video_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT 1,
      FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE
    )
  `);

  // Add court_diagram column if it doesn't exist
  db.run(`
    ALTER TABLE drills ADD COLUMN court_diagram TEXT
  `, (err) => {
    if (err && !err.message.includes('duplicate column name')) {
      console.error('Error adding court_diagram column:', err);
    }
  });

  // Drill favorites table
  db.run(`
    CREATE TABLE IF NOT EXISTS drill_favorites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      coach_id INTEGER NOT NULL,
      drill_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (coach_id) REFERENCES coaches (id) ON DELETE CASCADE,
      FOREIGN KEY (drill_id) REFERENCES drills (id) ON DELETE CASCADE,
      UNIQUE(coach_id, drill_id)
    )
  `);

  console.log('✅ Database tables initialized');
});

// Utility functions
const generateToken = (coachId) => {
  return jwt.sign(
    { coachId },
    process.env.JWT_SECRET || 'fallback-secret-key',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

const hashPassword = async (password) => {
  const rounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, rounds);
};

const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key', (err, decoded) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
    
    req.coachId = decoded.coachId;
    next();
  });
};

// Validation schemas
const registerSchema = Joi.object({
  first_name: Joi.string().min(1).max(50).required(),
  last_name: Joi.string().min(1).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-zA-Z])(?=.*\d)/).required()
    .messages({
      'string.pattern.base': 'Password must contain at least one letter and one number'
    })
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// API Routes

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { first_name, last_name, email, password } = value;
    
    // Check if email already exists
    db.get('SELECT id FROM coaches WHERE email = ?', [email], async (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
      
      if (row) {
        return res.status(409).json({
          success: false,
          error: 'Email already registered'
        });
      }

      // Hash password and create coach
      try {
        const passwordHash = await hashPassword(password);
        
        db.run(
          `INSERT INTO coaches (first_name, last_name, email, password_hash) VALUES (?, ?, ?, ?)`,
          [first_name, last_name, email, passwordHash],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({
                success: false,
                error: 'Failed to create account'
              });
            }
            
            const coachId = this.lastID;
            const token = generateToken(coachId);
            
            res.status(201).json({
              success: true,
              data: {
                coach: {
                  id: coachId,
                  first_name,
                  last_name,
                  email,
                  username: null
                },
                token
              }
            });
          }
        );
      } catch (hashError) {
        console.error('Password hashing error:', hashError);
        return res.status(500).json({
          success: false,
          error: 'Failed to create account'
        });
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        error: error.details[0].message
      });
    }

    const { email, password } = value;
    
    db.get(
      'SELECT id, first_name, last_name, email, username, password_hash FROM coaches WHERE email = ? AND is_active = 1',
      [email],
      async (err, coach) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
        
        if (!coach) {
          return res.status(401).json({
            success: false,
            error: 'Invalid email or password'
          });
        }
        
        try {
          const isPasswordValid = await comparePassword(password, coach.password_hash);
          
          if (!isPasswordValid) {
            return res.status(401).json({
              success: false,
              error: 'Invalid email or password'
            });
          }
          
          // Update last login
          db.run('UPDATE coaches SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [coach.id]);
          
          const token = generateToken(coach.id);
          
          res.json({
            success: true,
            data: {
              coach: {
                id: coach.id,
                firstName: coach.first_name,
                lastName: coach.last_name,
                email: coach.email,
                username: coach.username
              },
              token
            }
          });
        } catch (compareError) {
          console.error('Password comparison error:', compareError);
          return res.status(500).json({
            success: false,
            error: 'Authentication failed'
          });
        }
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get(
    'SELECT id, first_name, last_name, email, username, created_at FROM coaches WHERE id = ? AND is_active = 1',
    [req.coachId],
    (err, coach) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
      
      if (!coach) {
        return res.status(404).json({
          success: false,
          error: 'Coach not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: coach.id,
          firstName: coach.first_name,
          lastName: coach.last_name,
          email: coach.email,
          username: coach.username,
          createdAt: coach.created_at
        }
      });
    }
  );
});

// Update coach profile
app.put('/api/auth/profile', authenticateToken, (req, res) => {
  const { error, value } = Joi.object({
    first_name: Joi.string().min(1).max(50).required(),
    last_name: Joi.string().min(1).max(50).required(),
    email: Joi.string().email().required(),
    username: Joi.string().min(3).max(30).optional().allow('')
  }).validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { first_name, last_name, email, username } = value;

  // Check if email is already taken by another coach
  db.get(
    'SELECT id FROM coaches WHERE email = ? AND id != ? AND is_active = 1',
    [email, req.coachId],
    (err, existingCoach) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }

      if (existingCoach) {
        return res.status(409).json({
          success: false,
          error: 'Email is already in use'
        });
      }

      // Check if username is already taken (if provided)
      if (username) {
        db.get(
          'SELECT id FROM coaches WHERE username = ? AND id != ? AND is_active = 1',
          [username, req.coachId],
          (err, existingUsername) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({
                success: false,
                error: 'Internal server error'
              });
            }

            if (existingUsername) {
              return res.status(409).json({
                success: false,
                error: 'Username is already taken'
              });
            }

            updateProfile();
          }
        );
      } else {
        updateProfile();
      }

      function updateProfile() {
        db.run(
          'UPDATE coaches SET first_name = ?, last_name = ?, email = ?, username = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [first_name, last_name, email, username || null, req.coachId],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({
                success: false,
                error: 'Failed to update profile'
              });
            }

            res.json({
              success: true,
              message: 'Profile updated successfully',
              data: {
                first_name,
                last_name,
                email,
                username
              }
            });
          }
        );
      }
    }
  );
});

// Change password endpoint
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  const { error, value } = Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).required()
  }).validate(req.body);

  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { currentPassword, newPassword } = value;

  try {
    // Get current user
    db.get(
      'SELECT password FROM coaches WHERE id = ? AND is_active = 1',
      [req.coachId],
      async (err, user) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }

        if (!user) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        // Verify current password
        const validPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validPassword) {
          return res.status(400).json({
            success: false,
            error: 'Current password is incorrect'
          });
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        db.run(
          'UPDATE coaches SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [hashedNewPassword, req.coachId],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({
                success: false,
                error: 'Failed to update password'
              });
            }

            res.json({
              success: true,
              message: 'Password changed successfully'
            });
          }
        );
      }
    );
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Team management routes
app.get('/api/teams', authenticateToken, (req, res) => {
  db.all(
    'SELECT id, name, season, division, description, created_at, updated_at, is_active FROM teams WHERE coach_id = ? AND is_active = 1 ORDER BY created_at DESC',
    [req.coachId],
    (err, teams) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
      
      res.json({
        success: true,
        data: teams.map(team => ({
          id: team.id,
          name: team.name,
          season: team.season,
          division: team.division,
          description: team.description,
          isActive: Boolean(team.is_active),
          createdAt: team.created_at,
          updatedAt: team.updated_at
        }))
      });
    }
  );
});

const teamSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  season: Joi.string().min(1).max(50).required(),
  division: Joi.string().max(50).optional(),
  description: Joi.string().max(500).optional()
});

app.post('/api/teams', authenticateToken, (req, res) => {
  const { error, value } = teamSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { name, season, division, description } = value;
  
  db.run(
    'INSERT INTO teams (coach_id, name, season, division, description) VALUES (?, ?, ?, ?, ?)',
    [req.coachId, name, season, division || null, description || null],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({
            success: false,
            error: 'A team with this name already exists for this season'
          });
        }
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to create team'
        });
      }
      
      const teamId = this.lastID;
      
      // Get the created team
      db.get(
        'SELECT id, name, season, division, description, created_at FROM teams WHERE id = ?',
        [teamId],
        (err, team) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              error: 'Team created but failed to retrieve details'
            });
          }
          
          res.status(201).json({
            success: true,
            data: {
              id: team.id,
              name: team.name,
              season: team.season,
              division: team.division,
              description: team.description,
              isActive: true,
              createdAt: team.created_at
            }
          });
        }
      );
    }
  );
});

app.put('/api/teams/:id', authenticateToken, (req, res) => {
  const { error, value } = teamSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { name, season, division, description } = value;
  const teamId = req.params.id;
  
  db.run(
    'UPDATE teams SET name = ?, season = ?, division = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND coach_id = ?',
    [name, season, division || null, description || null, teamId, req.coachId],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({
            success: false,
            error: 'A team with this name already exists for this season'
          });
        }
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to update team'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Team not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Team updated successfully'
      });
    }
  );
});

app.delete('/api/teams/:id', authenticateToken, (req, res) => {
  const teamId = req.params.id;
  
  db.run(
    'UPDATE teams SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND coach_id = ?',
    [teamId, req.coachId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete team'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Team not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Team deleted successfully'
      });
    }
  );
});

app.post('/api/teams/:id/select', authenticateToken, (req, res) => {
  const teamId = req.params.id;
  
  // First verify the team belongs to this coach
  db.get(
    'SELECT id, name, season FROM teams WHERE id = ? AND coach_id = ? AND is_active = 1',
    [teamId, req.coachId],
    (err, team) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
      
      if (!team) {
        return res.status(404).json({
          success: false,
          error: 'Team not found'
        });
      }
      
      // Update or insert active team selection
      db.run(
        'INSERT OR REPLACE INTO coach_active_teams (coach_id, team_id, selected_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
        [req.coachId, teamId],
        (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              error: 'Failed to select team'
            });
          }
          
          res.json({
            success: true,
            data: {
              activeTeam: {
                id: team.id,
                name: team.name,
                season: team.season
              }
            }
          });
        }
      );
    }
  );
});

app.get('/api/teams/active', authenticateToken, (req, res) => {
  db.get(
    `SELECT t.id, t.name, t.season, t.division, t.description, cat.selected_at 
     FROM teams t 
     JOIN coach_active_teams cat ON t.id = cat.team_id 
     WHERE cat.coach_id = ? AND t.is_active = 1`,
    [req.coachId],
    (err, team) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
      
      if (!team) {
        return res.json({
          success: true,
          data: null
        });
      }
      
      res.json({
        success: true,
        data: {
          id: team.id,
          name: team.name,
          season: team.season,
          division: team.division,
          description: team.description,
          selectedAt: team.selected_at
        }
      });
    }
  );
});

// Middleware to verify active team exists
const requireActiveTeam = (req, res, next) => {
  db.get(
    `SELECT t.id, t.name FROM teams t 
     JOIN coach_active_teams cat ON t.id = cat.team_id 
     WHERE cat.coach_id = ? AND t.is_active = 1`,
    [req.coachId],
    (err, team) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
      
      if (!team) {
        return res.status(400).json({
          success: false,
          error: 'No active team selected. Please select a team first.'
        });
      }
      
      req.activeTeamId = team.id;
      req.activeTeamName = team.name;
      next();
    }
  );
};

// Player Management Routes
const playerSchema = Joi.object({
  firstName: Joi.string().min(1).max(50).required(),
  lastName: Joi.string().min(1).max(50).required(),
  jerseyNumber: Joi.number().integer().min(0).max(99).required(),
  position: Joi.string().valid('Setter', 'Outside Hitter', 'Middle Blocker', 'Opposite', 'Libero', 'Defensive Specialist').required(),
  skillLevel: Joi.number().integer().min(1).max(5).required(),
  height: Joi.string().max(10).optional(),
  year: Joi.string().max(20).optional()
});

app.get('/api/players', authenticateToken, requireActiveTeam, (req, res) => {
  const query = `
    SELECT p.*, ps.kills, ps.blocks, ps.aces, ps.digs, ps.assists, ps.season as stats_season
    FROM players p
    LEFT JOIN player_stats ps ON p.id = ps.player_id
    WHERE p.team_id = ? AND p.is_active = 1
    ORDER BY p.jersey_number
  `;
  
  db.all(query, [req.activeTeamId], (err, players) => {
    if (err) {
      console.error('Error fetching players:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch players'
      });
    }
    
    const processedPlayers = players.map(player => ({
      id: player.id,
      firstName: player.first_name,
      lastName: player.last_name,
      jerseyNumber: player.jersey_number,
      position: player.position,
      skillLevel: player.skill_level,
      height: player.height,
      year: player.year,
      stats: {
        kills: player.kills || 0,
        blocks: player.blocks || 0,
        aces: player.aces || 0,
        digs: player.digs || 0,
        assists: player.assists || 0,
        season: player.stats_season
      },
      createdAt: player.created_at
    }));
    
    res.json({
      success: true,
      data: processedPlayers
    });
  });
});

app.post('/api/players', authenticateToken, requireActiveTeam, (req, res) => {
  const { error, value } = playerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { firstName, lastName, jerseyNumber, position, skillLevel, height, year } = value;
  
  db.run(
    'INSERT INTO players (team_id, first_name, last_name, jersey_number, position, skill_level, height, year) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [req.activeTeamId, firstName, lastName, jerseyNumber, position, skillLevel, height || null, year || null],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({
            success: false,
            error: 'Jersey number already exists for this team'
          });
        }
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to create player'
        });
      }
      
      const playerId = this.lastID;
      
      res.status(201).json({
        success: true,
        data: {
          id: playerId,
          firstName,
          lastName,
          jerseyNumber,
          position,
          skillLevel,
          height,
          year
        }
      });
    }
  );
});

app.get('/api/players/:id', authenticateToken, requireActiveTeam, (req, res) => {
  const playerId = req.params.id;
  
  const query = `
    SELECT p.*, ps.kills, ps.blocks, ps.aces, ps.digs, ps.assists, ps.season as stats_season
    FROM players p
    LEFT JOIN player_stats ps ON p.id = ps.player_id
    WHERE p.id = ? AND p.team_id = ? AND p.is_active = 1
  `;
  
  db.get(query, [playerId, req.activeTeamId], (err, player) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
    
    if (!player) {
      return res.status(404).json({
        success: false,
        error: 'Player not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: player.id,
        firstName: player.first_name,
        lastName: player.last_name,
        jerseyNumber: player.jersey_number,
        position: player.position,
        skillLevel: player.skill_level,
        height: player.height,
        year: player.year,
        stats: {
          kills: player.kills || 0,
          blocks: player.blocks || 0,
          aces: player.aces || 0,
          digs: player.digs || 0,
          assists: player.assists || 0,
          season: player.stats_season
        },
        createdAt: player.created_at
      }
    });
  });
});

app.put('/api/players/:id', authenticateToken, requireActiveTeam, (req, res) => {
  const { error, value } = playerSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { firstName, lastName, jerseyNumber, position, skillLevel, height, year } = value;
  const playerId = req.params.id;
  
  db.run(
    'UPDATE players SET first_name = ?, last_name = ?, jersey_number = ?, position = ?, skill_level = ?, height = ?, year = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND team_id = ?',
    [firstName, lastName, jerseyNumber, position, skillLevel, height || null, year || null, playerId, req.activeTeamId],
    function(err) {
      if (err) {
        if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
          return res.status(409).json({
            success: false,
            error: 'Jersey number already exists for this team'
          });
        }
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to update player'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Player not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Player updated successfully'
      });
    }
  );
});

app.delete('/api/players/:id', authenticateToken, requireActiveTeam, (req, res) => {
  const playerId = req.params.id;
  
  db.run(
    'UPDATE players SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND team_id = ?',
    [playerId, req.activeTeamId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete player'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Player not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Player deleted successfully'
      });
    }
  );
});

// Drill Management Routes
const drillSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  category: Joi.string().valid('Warm-up', 'Serving', 'Passing', 'Setting', 'Attacking', 'Blocking', 'Defense', 'Conditioning', 'Cool-down').required(),
  duration: Joi.number().integer().min(1).max(120).required(),
  difficulty: Joi.number().integer().min(1).max(5).required(),
  description: Joi.string().max(1000).optional(),
  equipment: Joi.array().items(Joi.string()).optional(),
  minPlayers: Joi.number().integer().min(1).max(50).required(),
  maxPlayers: Joi.number().integer().min(1).max(50).required(),
  focus: Joi.array().items(Joi.string()).optional(),
  isPublic: Joi.boolean().optional(),
  courtDiagram: Joi.string().allow(null).optional()
});

app.get('/api/drills', authenticateToken, (req, res) => {
  const { public_only } = req.query;
  
  let query = `
    SELECT d.*, c.first_name, c.last_name,
           CASE WHEN df.drill_id IS NOT NULL THEN 1 ELSE 0 END as is_favorited
    FROM drills d 
    LEFT JOIN coaches c ON d.coach_id = c.id
    LEFT JOIN drill_favorites df ON d.id = df.drill_id AND df.coach_id = ?
    WHERE d.is_active = 1
  `;
  let params = [req.coachId];
  
  if (public_only === 'true') {
    query += ' AND d.is_public = 1';
  } else {
    query += ' AND (d.coach_id = ? OR d.is_public = 1)';
    params.push(req.coachId);
  }
  
  query += ' ORDER BY d.category, d.name';
  
  db.all(query, params, (err, drills) => {
    if (err) {
      console.error('Error fetching drills:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch drills'
      });
    }
    
    const processedDrills = drills.map(drill => ({
      id: drill.id,
      name: drill.name,
      category: drill.category,
      duration: drill.duration,
      difficulty: drill.difficulty,
      description: drill.description,
      equipment: JSON.parse(drill.equipment || '[]'),
      minPlayers: drill.min_players,
      maxPlayers: drill.max_players,
      focus: JSON.parse(drill.focus || '[]'),
      isPublic: drill.is_public === 1,
      courtDiagram: drill.court_diagram,
      coachName: drill.first_name && drill.last_name ? `${drill.first_name} ${drill.last_name}` : null,
      isOwner: drill.coach_id === req.coachId,
      isFavorited: drill.is_favorited === 1,
      createdAt: drill.created_at
    }));
    
    res.json({
      success: true,
      data: processedDrills
    });
  });
});

app.post('/api/drills', authenticateToken, (req, res) => {
  const { error, value } = drillSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { name, category, duration, difficulty, description, equipment, minPlayers, maxPlayers, focus, isPublic, courtDiagram } = value;
  
  db.run(
    'INSERT INTO drills (coach_id, name, category, duration, difficulty, description, equipment, min_players, max_players, focus, is_public, court_diagram) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [req.coachId, name, category, duration, difficulty, description || null, JSON.stringify(equipment || []), minPlayers, maxPlayers, JSON.stringify(focus || []), isPublic ? 1 : 0, courtDiagram || null],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to create drill'
        });
      }
      
      const drillId = this.lastID;
      
      res.status(201).json({
        success: true,
        data: {
          id: drillId,
          name,
          category,
          duration,
          difficulty,
          description,
          equipment: equipment || [],
          minPlayers,
          maxPlayers,
          focus: focus || []
        }
      });
    }
  );
});

app.get('/api/drills/:id', authenticateToken, (req, res) => {
  const drillId = req.params.id;
  
  db.get(
    'SELECT * FROM drills WHERE id = ? AND coach_id = ? AND is_active = 1',
    [drillId, req.coachId],
    (err, drill) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
      
      if (!drill) {
        return res.status(404).json({
          success: false,
          error: 'Drill not found'
        });
      }
      
      res.json({
        success: true,
        data: {
          id: drill.id,
          name: drill.name,
          category: drill.category,
          duration: drill.duration,
          difficulty: drill.difficulty,
          description: drill.description,
          equipment: JSON.parse(drill.equipment || '[]'),
          minPlayers: drill.min_players,
          maxPlayers: drill.max_players,
          focus: JSON.parse(drill.focus || '[]'),
          createdAt: drill.created_at
        }
      });
    }
  );
});

app.put('/api/drills/:id', authenticateToken, (req, res) => {
  const { error, value } = drillSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { name, category, duration, difficulty, description, equipment, minPlayers, maxPlayers, focus, isPublic, courtDiagram } = value;
  const drillId = req.params.id;
  
  db.run(
    'UPDATE drills SET name = ?, category = ?, duration = ?, difficulty = ?, description = ?, equipment = ?, min_players = ?, max_players = ?, focus = ?, is_public = ?, court_diagram = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND coach_id = ?',
    [name, category, duration, difficulty, description || null, JSON.stringify(equipment || []), minPlayers, maxPlayers, JSON.stringify(focus || []), isPublic ? 1 : 0, courtDiagram || null, drillId, req.coachId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to update drill'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Drill not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Drill updated successfully'
      });
    }
  );
});

app.delete('/api/drills/:id', authenticateToken, (req, res) => {
  const drillId = req.params.id;
  
  db.run(
    'UPDATE drills SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND coach_id = ?',
    [drillId, req.coachId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete drill'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Drill not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Drill deleted successfully'
      });
    }
  );
});

// Drill Favorites Routes

// Add drill to favorites
app.post('/api/drills/:id/favorite', authenticateToken, (req, res) => {
  const drillId = parseInt(req.params.id);
  const coachId = req.coachId;

  if (!drillId) {
    return res.status(400).json({
      success: false,
      error: 'Valid drill ID is required'
    });
  }

  // First check if drill exists
  db.get('SELECT id FROM drills WHERE id = ?', [drillId], (err, drill) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to check drill'
      });
    }

    if (!drill) {
      return res.status(404).json({
        success: false,
        error: 'Drill not found'
      });
    }

    // Insert favorite (ignore if already exists due to UNIQUE constraint)
    db.run(
      'INSERT OR IGNORE INTO drill_favorites (coach_id, drill_id) VALUES (?, ?)',
      [coachId, drillId],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to add favorite'
          });
        }

        res.json({
          success: true,
          message: 'Drill added to favorites',
          isFavorited: true
        });
      }
    );
  });
});

// Remove drill from favorites
app.delete('/api/drills/:id/favorite', authenticateToken, (req, res) => {
  const drillId = parseInt(req.params.id);
  const coachId = req.coachId;

  if (!drillId) {
    return res.status(400).json({
      success: false,
      error: 'Valid drill ID is required'
    });
  }

  db.run(
    'DELETE FROM drill_favorites WHERE coach_id = ? AND drill_id = ?',
    [coachId, drillId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to remove favorite'
        });
      }

      res.json({
        success: true,
        message: 'Drill removed from favorites',
        isFavorited: false
      });
    }
  );
});

// Get user's favorite drills
app.get('/api/drills/favorites', authenticateToken, (req, res) => {
  const coachId = req.coachId;

  const query = `
    SELECT d.*, c.first_name || ' ' || c.last_name as coach_name,
           1 as is_favorited
    FROM drills d
    INNER JOIN drill_favorites df ON d.id = df.drill_id
    INNER JOIN coaches c ON d.coach_id = c.id
    WHERE df.coach_id = ? AND d.is_active = 1
    ORDER BY df.created_at DESC
  `;

  db.all(query, [coachId], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch favorite drills'
      });
    }

    const drills = rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      duration: row.duration,
      difficulty: row.difficulty,
      description: row.description,
      equipment: row.equipment,
      minPlayers: row.min_players,
      maxPlayers: row.max_players,
      focus: row.focus,
      isPublic: Boolean(row.is_public),
      coachName: row.coach_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      courtDiagram: row.court_diagram ? JSON.parse(row.court_diagram) : null,
      isFavorited: Boolean(row.is_favorited)
    }));

    res.json({
      success: true,
      drills
    });
  });
});

// Practice Management Routes
const practiceSchema = Joi.object({
  name: Joi.string().min(1).max(100).required(),
  date: Joi.string().required(),
  duration: Joi.number().integer().min(1).max(480).required(),
  objective: Joi.string().max(500).optional(),
  phases: Joi.array().items(
    Joi.object({
      name: Joi.string().min(1).max(100).required(),
      duration: Joi.number().integer().min(1).max(120).required(),
      type: Joi.string().valid('warm-up', 'skill-development', 'drills', 'scrimmage', 'conditioning', 'cool-down').required(),
      objective: Joi.string().max(500).optional(),
      drills: Joi.array().items(Joi.number().integer()).optional()
    })
  ).optional()
});

app.get('/api/practices', authenticateToken, requireActiveTeam, (req, res) => {
  const query = `
    SELECT p.*, pp.id as phase_id, pp.name as phase_name, pp.duration as phase_duration, 
           pp.objective as phase_objective, pp.phase_order, pp.type as phase_type,
           GROUP_CONCAT(ppd.drill_id) as drill_ids,
           ps.status as session_status,
           CASE WHEN ps.status = 'completed' THEN 1 ELSE 0 END as has_completed_session
    FROM practices p
    LEFT JOIN practice_phases pp ON p.id = pp.practice_id
    LEFT JOIN practice_phase_drills ppd ON pp.id = ppd.phase_id
    LEFT JOIN practice_sessions ps ON p.id = ps.practice_id
    WHERE p.team_id = ? AND p.is_active = 1
    GROUP BY p.id, pp.id
    ORDER BY p.id DESC, pp.phase_order
  `;
  
  db.all(query, [req.activeTeamId], (err, rows) => {
    if (err) {
      console.error('Error fetching practices:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch practices'
      });
    }
    
    const practicesMap = new Map();
    
    rows.forEach(row => {
      if (!practicesMap.has(row.id)) {
        practicesMap.set(row.id, {
          id: row.id,
          name: row.name,
          date: row.date,
          duration: row.duration,
          objective: row.objective,
          estimatedDuration: row.estimated_duration,
          createdAt: row.created_at,
          hasCompletedSession: row.has_completed_session === 1,
          sessionStatus: row.session_status,
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
          type: row.phase_type,
          objective: row.phase_objective,
          phaseOrder: row.phase_order,
          drills: drillIds
        });
      }
    });
    
    res.json({
      success: true,
      data: Array.from(practicesMap.values())
    });
  });
});

app.post('/api/practices', authenticateToken, requireActiveTeam, (req, res) => {
  const { error, value } = practiceSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { name, date, duration, objective, phases } = value;
  
  // Calculate estimated duration from phases
  const estimatedDuration = phases ? phases.reduce((total, phase) => total + phase.duration, 0) : duration;
  
  db.run(
    'INSERT INTO practices (team_id, name, date, duration, objective, estimated_duration) VALUES (?, ?, ?, ?, ?, ?)',
    [req.activeTeamId, name, date, duration, objective || null, estimatedDuration],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to create practice'
        });
      }
      
      const practiceId = this.lastID;
      
      // Add phases if provided
      if (phases && phases.length > 0) {
        const phasePromises = phases.map((phase, index) => {
          return new Promise((resolve, reject) => {
            db.run(
              'INSERT INTO practice_phases (practice_id, name, duration, type, phase_order, objective) VALUES (?, ?, ?, ?, ?, ?)',
              [practiceId, phase.name, phase.duration, phase.type, index + 1, phase.objective || null],
              function(err) {
                if (err) {
                  reject(err);
                  return;
                }
                
                const phaseId = this.lastID;
                
                // Add drills to phase if provided
                if (phase.drills && phase.drills.length > 0) {
                  const drillPromises = phase.drills.map(drillId => {
                    return new Promise((drillResolve, drillReject) => {
                      db.run(
                        'INSERT INTO practice_phase_drills (phase_id, drill_id) VALUES (?, ?)',
                        [phaseId, drillId],
                        (err) => {
                          if (err) drillReject(err);
                          else drillResolve();
                        }
                      );
                    });
                  });
                  
                  Promise.all(drillPromises)
                    .then(() => resolve(phaseId))
                    .catch(reject);
                } else {
                  resolve(phaseId);
                }
              }
            );
          });
        });
        
        Promise.all(phasePromises)
          .then(() => {
            res.status(201).json({
              success: true,
              data: {
                id: practiceId,
                name,
                date,
                duration,
                objective,
                estimatedDuration,
                phasesAdded: phases.length
              }
            });
          })
          .catch((err) => {
            console.error('Error adding phases:', err);
            res.status(500).json({
              success: false,
              error: 'Practice created but failed to add some phases'
            });
          });
      } else {
        res.status(201).json({
          success: true,
          data: {
            id: practiceId,
            name,
            date,
            duration,
            objective,
            estimatedDuration
          }
        });
      }
    }
  );
});

app.get('/api/practices/:id', authenticateToken, requireActiveTeam, (req, res) => {
  const practiceId = req.params.id;
  
  const query = `
    SELECT p.*, pp.id as phase_id, pp.name as phase_name, pp.duration as phase_duration, 
           pp.objective as phase_objective, pp.phase_order, pp.type as phase_type,
           GROUP_CONCAT(ppd.drill_id) as drill_ids
    FROM practices p
    LEFT JOIN practice_phases pp ON p.id = pp.practice_id
    LEFT JOIN practice_phase_drills ppd ON pp.id = ppd.phase_id
    WHERE p.id = ? AND p.team_id = ? AND p.is_active = 1
    GROUP BY p.id, pp.id
    ORDER BY pp.phase_order
  `;
  
  db.all(query, [practiceId, req.activeTeamId], (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
    
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Practice not found'
      });
    }
    
    const practice = {
      id: rows[0].id,
      name: rows[0].name,
      date: rows[0].date,
      duration: rows[0].duration,
      objective: rows[0].objective,
      estimatedDuration: rows[0].estimated_duration,
      createdAt: rows[0].created_at,
      phases: []
    };
    
    rows.forEach(row => {
      if (row.phase_id) {
        const drillIds = row.drill_ids ? row.drill_ids.split(',').map(Number) : [];
        
        practice.phases.push({
          id: row.phase_id,
          name: row.phase_name,
          duration: row.phase_duration,
          type: row.phase_type,
          objective: row.phase_objective,
          phaseOrder: row.phase_order,
          drills: drillIds
        });
      }
    });
    
    res.json({
      success: true,
      data: practice
    });
  });
});

// Update practice
app.put('/api/practices/:id', authenticateToken, requireActiveTeam, (req, res) => {
  const practiceId = parseInt(req.params.id);
  
  console.log('PUT /api/practices/:id - Request body:', JSON.stringify(req.body, null, 2));
  
  const { error, value } = practiceSchema.validate(req.body);
  
  if (error) {
    console.log('Validation error:', error.details[0].message);
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { name, date, duration, objective, phases } = value;
  
  // First, verify the practice exists and belongs to the user's team
  db.get(
    'SELECT id FROM practices WHERE id = ? AND team_id = ? AND is_active = 1',
    [practiceId, req.activeTeamId],
    function(err, practice) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to update practice'
        });
      }
      
      if (!practice) {
        return res.status(404).json({
          success: false,
          error: 'Practice not found'
        });
      }
      
      // Calculate estimated duration from phases
      const estimatedDuration = phases ? phases.reduce((total, phase) => total + phase.duration, 0) : duration;
      
      // Update the practice
      db.run(
        'UPDATE practices SET name = ?, date = ?, duration = ?, objective = ?, estimated_duration = ? WHERE id = ?',
        [name, date, duration, objective || null, estimatedDuration, practiceId],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              error: 'Failed to update practice'
            });
          }
          
          // Delete existing phases and their drill assignments
          db.run(
            'DELETE FROM practice_phase_drills WHERE phase_id IN (SELECT id FROM practice_phases WHERE practice_id = ?)',
            [practiceId],
            function(err) {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                  success: false,
                  error: 'Failed to update practice phases'
                });
              }
              
              // Delete existing phases
              db.run(
                'DELETE FROM practice_phases WHERE practice_id = ?',
                [practiceId],
                function(err) {
                  if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({
                      success: false,
                      error: 'Failed to update practice phases'
                    });
                  }
                  
                  // Add new phases if provided
                  if (phases && phases.length > 0) {
                    let phasesCompleted = 0;
                    const totalPhases = phases.length;
                    
                    phases.forEach((phase, index) => {
                      db.run(
                        'INSERT INTO practice_phases (practice_id, name, duration, type, phase_order, objective) VALUES (?, ?, ?, ?, ?, ?)',
                        [practiceId, phase.name, phase.duration, phase.type, index + 1, phase.objective || null],
                        function(err) {
                          if (err) {
                            console.error('Database error:', err);
                            return res.status(500).json({
                              success: false,
                              error: 'Failed to create practice phase'
                            });
                          }
                          
                          const phaseId = this.lastID;
                          
                          // Add drills to phase if provided
                          if (phase.drills && phase.drills.length > 0) {
                            let drillsCompleted = 0;
                            const totalDrills = phase.drills.length;
                            
                            phase.drills.forEach(drillId => {
                              db.run(
                                'INSERT INTO practice_phase_drills (phase_id, drill_id) VALUES (?, ?)',
                                [phaseId, drillId],
                                function(err) {
                                  if (err) {
                                    console.error('Database error:', err);
                                    return res.status(500).json({
                                      success: false,
                                      error: 'Failed to assign drill to phase'
                                    });
                                  }
                                  
                                  drillsCompleted++;
                                  if (drillsCompleted === totalDrills) {
                                    checkPhaseCompletion();
                                  }
                                }
                              );
                            });
                          } else {
                            checkPhaseCompletion();
                          }
                          
                          function checkPhaseCompletion() {
                            phasesCompleted++;
                            if (phasesCompleted === totalPhases) {
                              res.json({
                                success: true,
                                message: 'Practice updated successfully'
                              });
                            }
                          }
                        }
                      );
                    });
                  } else {
                    res.json({
                      success: true,
                      message: 'Practice updated successfully'
                    });
                  }
                }
              );
            }
          );
        }
      );
    }
  );
});

// Delete practice
app.delete('/api/practices/:id', authenticateToken, requireActiveTeam, (req, res) => {
  const practiceId = parseInt(req.params.id);
  
  // First, verify the practice exists and belongs to the user's team
  db.get(
    'SELECT id FROM practices WHERE id = ? AND team_id = ? AND is_active = 1',
    [practiceId, req.activeTeamId],
    function(err, practice) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete practice'
        });
      }
      
      if (!practice) {
        return res.status(404).json({
          success: false,
          error: 'Practice not found'
        });
      }
      
      // Delete related data in correct order (foreign key constraints)
      // 1. Delete practice attendance
      db.run(
        'DELETE FROM practice_attendance WHERE session_id IN (SELECT id FROM practice_sessions WHERE practice_id = ?)',
        [practiceId],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              error: 'Failed to delete practice attendance'
            });
          }
          
          // 2. Delete practice sessions
          db.run(
            'DELETE FROM practice_sessions WHERE practice_id = ?',
            [practiceId],
            function(err) {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                  success: false,
                  error: 'Failed to delete practice sessions'
                });
              }
              
              // 3. Delete phase drills
              db.run(
                'DELETE FROM practice_phase_drills WHERE phase_id IN (SELECT id FROM practice_phases WHERE practice_id = ?)',
                [practiceId],
                function(err) {
                  if (err) {
                    console.error('Database error:', err);
                    return res.status(500).json({
                      success: false,
                      error: 'Failed to delete phase drills'
                    });
                  }
                  
                  // 4. Delete practice phases
                  db.run(
                    'DELETE FROM practice_phases WHERE practice_id = ?',
                    [practiceId],
                    function(err) {
                      if (err) {
                        console.error('Database error:', err);
                        return res.status(500).json({
                          success: false,
                          error: 'Failed to delete practice phases'
                        });
                      }
                      
                      // 5. Finally, soft delete the practice (set is_active = 0)
                      db.run(
                        'UPDATE practices SET is_active = 0 WHERE id = ?',
                        [practiceId],
                        function(err) {
                          if (err) {
                            console.error('Database error:', err);
                            return res.status(500).json({
                              success: false,
                              error: 'Failed to delete practice'
                            });
                          }
                          
                          res.json({
                            success: true,
                            message: 'Practice deleted successfully'
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

// Practice Session Management
app.get('/api/practice-sessions', authenticateToken, requireActiveTeam, (req, res) => {
  const query = `
    SELECT ps.*, p.name as practice_name, p.date as practice_date
    FROM practice_sessions ps
    JOIN practices p ON ps.practice_id = p.id
    WHERE p.team_id = ?
    ORDER BY ps.started_at DESC
  `;
  
  db.all(query, [req.activeTeamId], (err, sessions) => {
    if (err) {
      console.error('Error fetching practice sessions:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch practice sessions'
      });
    }
    
    res.json({
      success: true,
      data: sessions.map(session => ({
        id: session.id,
        practiceId: session.practice_id,
        practiceName: session.practice_name,
        practiceDate: session.practice_date,
        startedAt: session.started_at,
        completedAt: session.completed_at,
        status: session.status,
        actualDuration: session.actual_duration,
        notes: session.notes,
        currentPhaseId: session.current_phase_id,
        phaseElapsedTime: session.phase_elapsed_time,
        totalElapsedTime: session.total_elapsed_time,
        lastActivity: session.last_activity
      }))
    });
  });
});

app.get('/api/practice-sessions/active', authenticateToken, requireActiveTeam, (req, res) => {
  const query = `
    SELECT ps.*, p.name as practice_name, p.date as practice_date
    FROM practice_sessions ps
    JOIN practices p ON ps.practice_id = p.id
    WHERE p.team_id = ? AND ps.status IN ('in_progress', 'paused')
    ORDER BY ps.started_at DESC
    LIMIT 1
  `;
  
  db.get(query, [req.activeTeamId], (err, session) => {
    if (err) {
      console.error('Error fetching active session:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch active session'
      });
    }
    
    if (!session) {
      return res.json({
        success: true,
        data: null
      });
    }
    
    res.json({
      success: true,
      data: {
        id: session.id,
        practiceId: session.practice_id,
        practiceName: session.practice_name,
        practiceDate: session.practice_date,
        startedAt: session.started_at,
        status: session.status,
        notes: session.notes,
        currentPhaseId: session.current_phase_id,
        phaseElapsedTime: session.phase_elapsed_time,
        totalElapsedTime: session.total_elapsed_time,
        lastActivity: session.last_activity,
        timerState: session.timer_state ? JSON.parse(session.timer_state) : null
      }
    });
  });
});

const sessionSchema = Joi.object({
  practiceId: Joi.number().integer().required(),
  attendance: Joi.array().items(
    Joi.object({
      playerId: Joi.number().integer().required(),
      attended: Joi.boolean().required(),
      lateMinutes: Joi.number().integer().min(0).optional(),
      notes: Joi.string().max(500).optional()
    })
  ).optional()
});

app.post('/api/practice-sessions', authenticateToken, requireActiveTeam, (req, res) => {
  const { error, value } = sessionSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { practiceId, attendance } = value;
  
  // Verify practice belongs to active team
  db.get(
    'SELECT id FROM practices WHERE id = ? AND team_id = ? AND is_active = 1',
    [practiceId, req.activeTeamId],
    (err, practice) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Internal server error'
        });
      }
      
      if (!practice) {
        return res.status(404).json({
          success: false,
          error: 'Practice not found'
        });
      }
      
      // Create practice session
      db.run(
        'INSERT INTO practice_sessions (practice_id, status) VALUES (?, ?)',
        [practiceId, 'in_progress'],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({
              success: false,
              error: 'Failed to create practice session'
            });
          }
          
          const sessionId = this.lastID;
          
          // Add attendance if provided
          if (attendance && attendance.length > 0) {
            const attendancePromises = attendance.map(record => {
              return new Promise((resolve, reject) => {
                db.run(
                  'INSERT INTO practice_attendance (session_id, player_id, attended, late_minutes, notes) VALUES (?, ?, ?, ?, ?)',
                  [sessionId, record.playerId, record.attended, record.lateMinutes || 0, record.notes || null],
                  (err) => {
                    if (err) reject(err);
                    else resolve();
                  }
                );
              });
            });
            
            Promise.all(attendancePromises)
              .then(() => {
                res.status(201).json({
                  success: true,
                  data: {
                    id: sessionId,
                    practiceId,
                    status: 'in_progress',
                    attendanceRecorded: attendance.length
                  }
                });
              })
              .catch((err) => {
                console.error('Error recording attendance:', err);
                res.status(500).json({
                  success: false,
                  error: 'Session created but failed to record some attendance'
                });
              });
          } else {
            res.status(201).json({
              success: true,
              data: {
                id: sessionId,
                practiceId,
                status: 'in_progress'
              }
            });
          }
        }
      );
    }
  );
});

// Update practice session
const updateSessionSchema = Joi.object({
  status: Joi.string().valid('in_progress', 'paused', 'completed').optional(),
  actualDuration: Joi.number().integer().min(0).optional(),
  notes: Joi.string().max(1000).allow('').optional(),
  currentPhaseId: Joi.number().integer().optional(),
  phaseElapsedTime: Joi.number().integer().min(0).optional(),
  totalElapsedTime: Joi.number().integer().min(0).optional(),
  timerState: Joi.object().optional()
});

app.put('/api/practice-sessions/:id', authenticateToken, requireActiveTeam, (req, res) => {
  console.log('PUT /api/practice-sessions/:id - Request body:', req.body);
  
  const { error, value } = updateSessionSchema.validate(req.body);
  if (error) {
    console.log('Validation error:', error.details[0].message);
    console.log('Failed validation for data:', req.body);
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const sessionId = req.params.id;
  const updates = value;
  
  // Verify session belongs to active team
  const verifyQuery = `
    SELECT ps.id FROM practice_sessions ps
    JOIN practices p ON ps.practice_id = p.id
    WHERE ps.id = ? AND p.team_id = ?
  `;
  
  db.get(verifyQuery, [sessionId, req.activeTeamId], (err, session) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Practice session not found'
      });
    }
    
    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];
    
    if (updates.status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(updates.status);
      
      if (updates.status === 'completed') {
        updateFields.push('completed_at = CURRENT_TIMESTAMP');
      }
    }
    
    if (updates.actualDuration !== undefined) {
      updateFields.push('actual_duration = ?');
      updateValues.push(updates.actualDuration);
    }
    
    if (updates.notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(updates.notes);
    }
    
    if (updates.currentPhaseId !== undefined) {
      updateFields.push('current_phase_id = ?');
      updateValues.push(updates.currentPhaseId);
    }
    
    if (updates.phaseElapsedTime !== undefined) {
      updateFields.push('phase_elapsed_time = ?');
      updateValues.push(updates.phaseElapsedTime);
    }
    
    if (updates.totalElapsedTime !== undefined) {
      updateFields.push('total_elapsed_time = ?');
      updateValues.push(updates.totalElapsedTime);
    }
    
    if (updates.timerState !== undefined) {
      updateFields.push('timer_state = ?');
      updateValues.push(JSON.stringify(updates.timerState));
    }
    
    updateFields.push('last_activity = CURRENT_TIMESTAMP');
    updateValues.push(sessionId);
    
    const updateQuery = `UPDATE practice_sessions SET ${updateFields.join(', ')} WHERE id = ?`;
    
    db.run(updateQuery, updateValues, function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to update practice session'
        });
      }
      
      res.json({
        success: true,
        message: 'Practice session updated successfully'
      });
    });
  });
});

// Player Notes Management
const noteSchema = Joi.object({
  playerId: Joi.number().integer().required(),
  notes: Joi.string().min(1).max(1000).required(),
  noteType: Joi.string().valid('practice', 'player').default('practice')
});

app.post('/api/practice-sessions/:id/notes', authenticateToken, requireActiveTeam, (req, res) => {
  const { error, value } = noteSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const sessionId = req.params.id;
  const { playerId, notes, noteType } = value;
  
  // Verify session belongs to active team
  const verifyQuery = `
    SELECT ps.id FROM practice_sessions ps
    JOIN practices p ON ps.practice_id = p.id
    WHERE ps.id = ? AND p.team_id = ?
  `;
  
  db.get(verifyQuery, [sessionId, req.activeTeamId], (err, session) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
    
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Practice session not found'
      });
    }
    
    // Verify player belongs to active team
    db.get(
      'SELECT id FROM players WHERE id = ? AND team_id = ? AND is_active = 1',
      [playerId, req.activeTeamId],
      (err, player) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({
            success: false,
            error: 'Internal server error'
          });
        }
        
        if (!player) {
          return res.status(404).json({
            success: false,
            error: 'Player not found'
          });
        }
        
        // Add note
        db.run(
          'INSERT INTO player_notes (session_id, player_id, notes, note_type) VALUES (?, ?, ?, ?)',
          [sessionId, playerId, notes, noteType],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({
                success: false,
                error: 'Failed to add note'
              });
            }
            
            res.status(201).json({
              success: true,
              data: {
                id: this.lastID,
                sessionId,
                playerId,
                notes,
                noteType,
                createdAt: new Date().toISOString()
              }
            });
          }
        );
      }
    );
  });
});

app.get('/api/practice-sessions/:id/notes', authenticateToken, requireActiveTeam, (req, res) => {
  const sessionId = req.params.id;
  
  const query = `
    SELECT pn.*, pl.first_name, pl.last_name, pl.jersey_number
    FROM player_notes pn
    JOIN players pl ON pn.player_id = pl.id
    JOIN practice_sessions ps ON pn.session_id = ps.id
    JOIN practices p ON ps.practice_id = p.id
    WHERE pn.session_id = ? AND p.team_id = ?
    ORDER BY pn.created_at DESC
  `;
  
  db.all(query, [sessionId, req.activeTeamId], (err, notes) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch notes'
      });
    }
    
    res.json({
      success: true,
      data: notes.map(note => ({
        id: note.id,
        sessionId: note.session_id,
        playerId: note.player_id,
        playerName: `${note.first_name} ${note.last_name}`,
        jerseyNumber: note.jersey_number,
        notes: note.notes,
        noteType: note.note_type,
        createdAt: note.created_at,
        updatedAt: note.updated_at
      }))
    });
  });
});

app.get('/api/players/:id/attendance', authenticateToken, requireActiveTeam, (req, res) => {
  const playerId = req.params.id;
  
  const query = `
    SELECT pa.*, ps.started_at, p.name as practice_name, p.date as practice_date
    FROM practice_attendance pa
    JOIN practice_sessions ps ON pa.session_id = ps.id
    JOIN practices p ON ps.practice_id = p.id
    WHERE pa.player_id = ? AND p.team_id = ?
    ORDER BY ps.started_at DESC
  `;
  
  db.all(query, [playerId, req.activeTeamId], (err, attendance) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch attendance'
      });
    }
    
    res.json({
      success: true,
      data: attendance.map(record => ({
        id: record.id,
        sessionId: record.session_id,
        attended: Boolean(record.attended),
        lateMinutes: record.late_minutes,
        notes: record.notes,
        practiceDate: record.practice_date,
        practiceName: record.practice_name,
        sessionDate: record.started_at
      }))
    });
  });
});

// Video Management Routes
const videoSchema = Joi.object({
  title: Joi.string().min(1).max(100).required(),
  category: Joi.string().valid('Serving', 'Passing', 'Setting', 'Attacking', 'Blocking', 'Defense', 'Strategy', 'Conditioning', 'Technique').required(),
  duration: Joi.string().required(),
  description: Joi.string().max(1000).optional(),
  thumbnail: Joi.string().uri().optional(),
  videoUrl: Joi.string().uri().optional()
});

app.get('/api/videos', authenticateToken, (req, res) => {
  db.all(
    'SELECT * FROM videos WHERE coach_id = ? AND is_active = 1 ORDER BY category, title',
    [req.coachId],
    (err, videos) => {
      if (err) {
        console.error('Error fetching videos:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to fetch videos'
        });
      }
      
      res.json({
        success: true,
        data: videos.map(video => ({
          id: video.id,
          title: video.title,
          category: video.category,
          duration: video.duration,
          description: video.description,
          thumbnail: video.thumbnail,
          videoUrl: video.video_url,
          createdAt: video.created_at
        }))
      });
    }
  );
});

app.post('/api/videos', authenticateToken, (req, res) => {
  const { error, value } = videoSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { title, category, duration, description, thumbnail, videoUrl } = value;
  
  db.run(
    'INSERT INTO videos (coach_id, title, category, duration, description, thumbnail, video_url) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [req.coachId, title, category, duration, description || null, thumbnail || null, videoUrl || null],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to create video'
        });
      }
      
      res.status(201).json({
        success: true,
        data: {
          id: this.lastID,
          title,
          category,
          duration,
          description,
          thumbnail,
          videoUrl
        }
      });
    }
  );
});

app.put('/api/videos/:id', authenticateToken, (req, res) => {
  const { error, value } = videoSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      error: error.details[0].message
    });
  }

  const { title, category, duration, description, thumbnail, videoUrl } = value;
  const videoId = req.params.id;
  
  db.run(
    'UPDATE videos SET title = ?, category = ?, duration = ?, description = ?, thumbnail = ?, video_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND coach_id = ?',
    [title, category, duration, description || null, thumbnail || null, videoUrl || null, videoId, req.coachId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to update video'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Video updated successfully'
      });
    }
  );
});

app.delete('/api/videos/:id', authenticateToken, (req, res) => {
  const videoId = req.params.id;
  
  db.run(
    'UPDATE videos SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND coach_id = ?',
    [videoId, req.coachId],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to delete video'
        });
      }
      
      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          error: 'Video not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Video deleted successfully'
      });
    }
  );
});

// Analytics and Statistics
app.get('/api/team/stats', authenticateToken, requireActiveTeam, (req, res) => {
  // Get total number of players
  db.get('SELECT COUNT(*) as count FROM players WHERE team_id = ? AND is_active = 1', [req.activeTeamId], (err, totalPlayersResult) => {
    if (err) {
      console.error('Error getting total players:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to get team statistics'
      });
    }
    
    const totalPlayers = totalPlayersResult.count;
    
    // Calculate average skill level
    db.get('SELECT AVG(skill_level) as avgSkill FROM players WHERE team_id = ? AND is_active = 1', [req.activeTeamId], (err, avgSkillResult) => {
      if (err) {
        console.error('Error getting average skill level:', err);
        return res.status(500).json({
          success: false,
          error: 'Failed to get team statistics'
        });
      }
      
      const avgSkillLevel = avgSkillResult.avgSkill ? parseFloat(avgSkillResult.avgSkill).toFixed(1) : 0;
      
      // Get position breakdown
      db.all('SELECT position, COUNT(*) as count FROM players WHERE team_id = ? AND is_active = 1 GROUP BY position', [req.activeTeamId], (err, positionResults) => {
        if (err) {
          console.error('Error getting position breakdown:', err);
          return res.status(500).json({
            success: false,
            error: 'Failed to get team statistics'
          });
        }
        
        const positionBreakdown = {};
        positionResults.forEach(pos => {
          positionBreakdown[pos.position] = pos.count;
        });
        
        // Get practice count
        db.get('SELECT COUNT(*) as count FROM practices WHERE team_id = ? AND is_active = 1', [req.activeTeamId], (err, practiceResult) => {
          if (err) {
            console.error('Error getting practice count:', err);
            return res.status(500).json({
              success: false,
              error: 'Failed to get team statistics'
            });
          }
          
          // Get average attendance
          const attendanceQuery = `
            SELECT AVG(CAST(attended as FLOAT)) as avgAttendance
            FROM practice_attendance pa
            JOIN practice_sessions ps ON pa.session_id = ps.id
            JOIN practices p ON ps.practice_id = p.id
            WHERE p.team_id = ?
          `;
          
          db.get(attendanceQuery, [req.activeTeamId], (err, attendanceResult) => {
            if (err) {
              console.error('Error getting attendance:', err);
              return res.status(500).json({
                success: false,
                error: 'Failed to get team statistics'
              });
            }
            
            const avgAttendance = attendanceResult.avgAttendance ? parseFloat(attendanceResult.avgAttendance).toFixed(2) : 0;
            
            res.json({
              success: true,
              data: {
                totalPlayers,
                averageSkillLevel: parseFloat(avgSkillLevel),
                totalPractices: practiceResult.count,
                averageAttendance: parseFloat(avgAttendance),
                positionBreakdown
              }
            });
          });
        });
      });
    });
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    }
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🔄 Shutting down gracefully...');
  db.close();
  process.exit(0);
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`🏐 PracTrac Enhanced Backend running on http://${HOST}:${PORT}`);
  console.log(`📊 Multi-Coach Volleyball Practice Management with Authentication`);
  console.log(`🗄️  Database: ${dbPath}`);
  console.log(`🔐 JWT Authentication enabled`);
  
  if (HOST === '0.0.0.0') {
    console.log(`📱 Mobile access: Use your computer's IP address instead of localhost`);
    console.log(`   Example: http://192.168.1.100:${PORT}`);
  }
});