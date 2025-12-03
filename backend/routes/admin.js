const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Middleware to check admin role
const requireAdmin = async (req, res, next) => {
  try {
    const user = await db.getAsync('SELECT role FROM user WHERE id = ?', [req.user.id]);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get all questions (admin) - filter out short_answer
router.get('/questions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const questions = await db.allAsync(
      'SELECT * FROM question WHERE question_type IN (?, ?) ORDER BY created_at DESC',
      ['multiple_choice', 'true_false']
    );
    res.json({ questions });
  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update question (admin)
router.put('/questions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { question_text, question_type, correct_answer, category, difficulty, hint, level_required, time_limit, options } = req.body;
    
    const optionsJson = options ? JSON.stringify(options) : null;
    
    await db.runAsync(
      `UPDATE question 
       SET question_text = ?, question_type = ?, correct_answer = ?, category = ?, 
           difficulty = ?, hint = ?, level_required = ?, time_limit = ?, options = ?
       WHERE id = ?`,
      [question_text, question_type, correct_answer, category, difficulty, hint || null, level_required || 1, time_limit || 300, optionsJson, req.params.id]
    );

    res.json({ message: 'Question updated successfully' });
  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete question (admin)
router.delete('/questions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await db.runAsync('DELETE FROM question WHERE id = ?', [req.params.id]);
    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (admin)
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await db.allAsync(
      'SELECT id, username, email, total_xp, role, current_level, daily_streak, created_at FROM user ORDER BY total_xp DESC'
    );
    res.json({ users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user role (admin)
router.put('/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['learner', 'instructor', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    await db.runAsync('UPDATE user SET role = ? WHERE id = ?', [role, req.params.id]);
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

