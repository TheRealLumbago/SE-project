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
      time_limit INTEGER DEFAULT 300,
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
    `);
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

