const Database = require('better-sqlite3');
const path = require('path');

// Connect to existing database
const dbPath = path.join(__dirname, 'practrac.db');
const db = new Database(dbPath);

console.log('🔄 Running database migration...');

try {
  // Add new columns to practices table
  db.exec(`ALTER TABLE practices ADD COLUMN objective TEXT`);
  db.exec(`ALTER TABLE practices ADD COLUMN estimated_duration INTEGER`);
  
  // Update any existing practices to have estimated_duration based on duration
  db.exec(`UPDATE practices SET estimated_duration = duration WHERE estimated_duration IS NULL`);
  
  // Add new column to practice_phases table
  db.exec(`ALTER TABLE practice_phases ADD COLUMN objective TEXT`);
  
  // Remove old columns that are no longer needed
  // SQLite doesn't support DROP COLUMN directly, so we'll work with what we have
  
  console.log('✅ Migration completed successfully!');
} catch (error) {
  if (error.message.includes('duplicate column name')) {
    console.log('✅ Columns already exist, migration not needed');
  } else {
    console.error('❌ Migration failed:', error.message);
    throw error;
  }
}

db.close();