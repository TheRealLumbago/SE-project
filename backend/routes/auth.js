const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();
const db = require('../config/database');
const { generateToken, authenticateToken } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Check if user exists
    const existingUser = await db.getAsync(
      'SELECT * FROM user WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUser) {
      return res.status(400).json({ error: 'Username or email already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const result = await db.runAsync(
      'INSERT INTO user (username, email, password_hash) VALUES (?, ?, ?)',
      [username, email, passwordHash]
    );

    const token = generateToken({ id: result.lastID, username });

    const newUser = await db.getAsync(
      'SELECT id, username, email, total_xp, role, current_level, daily_streak FROM user WHERE id = ?',
      [result.lastID]
    );

    if (!newUser) {
      return res.status(500).json({ error: 'Failed to retrieve created user' });
    }

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        total_xp: newUser.total_xp || 0,
        role: newUser.role || 'learner',
        current_level: newUser.current_level || 1,
        daily_streak: newUser.daily_streak || 0
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user
    const user = await db.getAsync(
      'SELECT * FROM user WHERE username = ?',
      [username]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = generateToken({ id: user.id, username: user.username });

    // Ensure user has default values for new fields (for old users)
    if (user.role === null || user.role === undefined) {
      await db.runAsync('UPDATE user SET role = ? WHERE id = ?', ['learner', user.id]);
      user.role = 'learner';
    }
    if (user.current_level === null || user.current_level === undefined) {
      await db.runAsync('UPDATE user SET current_level = ? WHERE id = ?', [1, user.id]);
      user.current_level = 1;
    }
    if (user.daily_streak === null || user.daily_streak === undefined) {
      await db.runAsync('UPDATE user SET daily_streak = ? WHERE id = ?', [0, user.id]);
      user.daily_streak = 0;
    }
    
    // Ensure admins have 10000 XP and level 7
    if (user.role === 'admin') {
      if (user.total_xp < 10000 || user.current_level < 7) {
        await db.runAsync(
          'UPDATE user SET total_xp = 10000, current_level = 7 WHERE id = ?',
          [user.id]
        );
        user.total_xp = 10000;
        user.current_level = 7;
      }
    }

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        total_xp: user.total_xp || 0,
        role: user.role || 'learner',
        current_level: user.current_level || 1,
        daily_streak: user.daily_streak || 0
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? error.message : undefined 
    });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await db.getAsync(
      'SELECT id, username, email, total_xp, role, current_level, daily_streak FROM user WHERE id = ?',
      [req.user.id]
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Ensure admins have 10000 XP and level 7
    if (user.role === 'admin') {
      if (user.total_xp < 10000 || user.current_level < 7) {
        await db.runAsync(
          'UPDATE user SET total_xp = 10000, current_level = 7 WHERE id = ?',
          [user.id]
        );
        user.total_xp = 10000;
        user.current_level = 7;
      }
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

