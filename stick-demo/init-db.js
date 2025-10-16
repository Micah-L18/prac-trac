const Database = require('better-sqlite3');
const path = require('path');

// Create database connection
const dbPath = path.join(__dirname, 'practrac.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

console.log('🗄️  Initializing PracTrac SQLite Database...');

// Create tables
const createTables = () => {
  // Teams table
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      season TEXT NOT NULL,
      division TEXT NOT NULL,
      coach TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Players table
  db.exec(`
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

  // Player stats table
  db.exec(`
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

  // Drills table
  db.exec(`
    CREATE TABLE IF NOT EXISTS drills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      duration INTEGER NOT NULL,
      difficulty INTEGER NOT NULL CHECK(difficulty >= 1 AND difficulty <= 5),
      description TEXT,
      equipment TEXT, -- JSON string
      minPlayers INTEGER NOT NULL,
      maxPlayers INTEGER NOT NULL,
      focus TEXT, -- JSON string
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Practices table
  db.exec(`
    CREATE TABLE IF NOT EXISTS practices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      team_id INTEGER,
      objective TEXT,
      estimated_duration INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams (id)
    )
  `);

  // Practice phases table
  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_phases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      practice_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      duration INTEGER NOT NULL,
      objective TEXT,
      phase_order INTEGER NOT NULL,
      FOREIGN KEY (practice_id) REFERENCES practices (id)
    )
  `);

  // Practice phase drills junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS practice_phase_drills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phase_id INTEGER NOT NULL,
      drill_id INTEGER NOT NULL,
      FOREIGN KEY (phase_id) REFERENCES practice_phases (id),
      FOREIGN KEY (drill_id) REFERENCES drills (id)
    )
  `);

  // Videos table
  db.exec(`
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

  console.log('✅ Tables created successfully');
};

// Initialize database
try {
  createTables();
  console.log('🎉 Database initialization completed successfully!');
  console.log(`📍 Database location: ${dbPath}`);
  console.log('📝 Empty database ready for data entry');
} catch (error) {
  console.error('❌ Error initializing database:', error);
} finally {
  db.close();
}