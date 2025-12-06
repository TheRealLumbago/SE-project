const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = process.env.DATABASE_URL || path.join(__dirname, '../quiz.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

function initializeDatabase() {
  db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS user (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      total_xp INTEGER DEFAULT 0,
      role TEXT DEFAULT 'learner',
      current_level INTEGER DEFAULT 1,
      daily_streak INTEGER DEFAULT 0,
      last_activity_date DATE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Questions table
    db.run(`CREATE TABLE IF NOT EXISTS question (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      question_text TEXT NOT NULL,
      question_type TEXT NOT NULL,
      options TEXT,
      correct_answer TEXT NOT NULL,
      category TEXT NOT NULL,
      difficulty TEXT NOT NULL,
      hint TEXT,
      level_required INTEGER DEFAULT 1,
      time_limit INTEGER DEFAULT 30,
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES user(id)
    )`);

    // User Progress table
    db.run(`CREATE TABLE IF NOT EXISTS user_progress (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      question_id INTEGER NOT NULL,
      answered_correctly INTEGER NOT NULL,
      xp_earned INTEGER DEFAULT 0,
      time_taken INTEGER,
      hints_used INTEGER DEFAULT 0,
      answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES user(id),
      FOREIGN KEY (question_id) REFERENCES question(id)
    )`);

    // Levels table
    db.run(`CREATE TABLE IF NOT EXISTS level (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      level_number INTEGER UNIQUE NOT NULL,
      name TEXT NOT NULL,
      xp_required INTEGER NOT NULL,
      description TEXT
    )`);

    // Initialize default levels with increasing XP requirements
    db.run(`INSERT OR IGNORE INTO level (level_number, name, xp_required, description) VALUES
      (1, 'Beginner', 0, 'Start your cybersecurity journey'),
      (2, 'Novice', 100, 'You are learning the basics'),
      (3, 'Intermediate', 250, 'Building your skills'),
      (4, 'Advanced', 500, 'Mastering cybersecurity'),
      (5, 'Expert', 1000, 'Cybersecurity professional'),
      (6, 'Master', 2000, 'Advanced cybersecurity expert'),
      (7, 'Grandmaster', 3500, 'Elite cybersecurity specialist')
    `, () => {
      // Run migrations after all tables are created
      migrateDatabase();
    });
  });
}

// Migration function to add new columns to existing tables
function migrateDatabase() {
  db.serialize(() => {
    // Check and add missing columns to user table
    db.all("PRAGMA table_info(user)", (err, columns) => {
      if (err) {
        console.error('Error checking user table columns:', err);
        return;
      }
      
      const columnNames = columns.map(col => col.name);
      
      // Add role column if it doesn't exist
      if (!columnNames.includes('role')) {
        db.run("ALTER TABLE user ADD COLUMN role TEXT DEFAULT 'learner'", (err) => {
          if (err) console.error('Error adding role column:', err);
          else console.log('Added role column to user table');
        });
      }
      
      // Add current_level column if it doesn't exist
      if (!columnNames.includes('current_level')) {
        db.run("ALTER TABLE user ADD COLUMN current_level INTEGER DEFAULT 1", (err) => {
          if (err) console.error('Error adding current_level column:', err);
          else console.log('Added current_level column to user table');
        });
      }
      
      // Add daily_streak column if it doesn't exist
      if (!columnNames.includes('daily_streak')) {
        db.run("ALTER TABLE user ADD COLUMN daily_streak INTEGER DEFAULT 0", (err) => {
          if (err) console.error('Error adding daily_streak column:', err);
          else console.log('Added daily_streak column to user table');
        });
      }
      
      // Add last_activity_date column if it doesn't exist
      if (!columnNames.includes('last_activity_date')) {
        db.run("ALTER TABLE user ADD COLUMN last_activity_date DATE", (err) => {
          if (err) console.error('Error adding last_activity_date column:', err);
          else console.log('Added last_activity_date column to user table');
        });
      }
    });
    
    // Check and add missing columns to question table
    db.all("PRAGMA table_info(question)", (err, columns) => {
      if (err) {
        console.error('Error checking question table columns:', err);
        return;
      }
      
      const columnNames = columns.map(col => col.name);
      
      // Add hint column if it doesn't exist
      if (!columnNames.includes('hint')) {
        db.run("ALTER TABLE question ADD COLUMN hint TEXT", (err) => {
          if (err) console.error('Error adding hint column:', err);
          else console.log('Added hint column to question table');
        });
      }
      
      // Add level_required column if it doesn't exist
      if (!columnNames.includes('level_required')) {
        db.run("ALTER TABLE question ADD COLUMN level_required INTEGER DEFAULT 1", (err) => {
          if (err) console.error('Error adding level_required column:', err);
          else console.log('Added level_required column to question table');
        });
      }
      
      // Add time_limit column if it doesn't exist
      if (!columnNames.includes('time_limit')) {
        db.run("ALTER TABLE question ADD COLUMN time_limit INTEGER DEFAULT 30", (err) => {
          if (err) console.error('Error adding time_limit column:', err);
          else console.log('Added time_limit column to question table');
        });
      }
    });
    
    // Check and add missing columns to user_progress table
    db.all("PRAGMA table_info(user_progress)", (err, columns) => {
      if (err) {
        console.error('Error checking user_progress table columns:', err);
        return;
      }
      
      const columnNames = columns.map(col => col.name);
      
      // Add time_taken column if it doesn't exist
      if (!columnNames.includes('time_taken')) {
        db.run("ALTER TABLE user_progress ADD COLUMN time_taken INTEGER", (err) => {
          if (err) console.error('Error adding time_taken column:', err);
          else console.log('Added time_taken column to user_progress table');
        });
      }
      
      // Add hints_used column if it doesn't exist
      if (!columnNames.includes('hints_used')) {
        db.run("ALTER TABLE user_progress ADD COLUMN hints_used INTEGER DEFAULT 0", (err) => {
          if (err) console.error('Error adding hints_used column:', err);
          else console.log('Added hints_used column to user_progress table');
        });
      }
    });
  });
}

// Promisify database methods
db.runAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

db.getAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

db.allAsync = function(sql, params = []) {
  return new Promise((resolve, reject) => {
    this.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

module.exports = db;

