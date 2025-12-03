const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user stats
    const user = await db.getAsync(
      'SELECT id, username, email, total_xp, current_level, daily_streak FROM user WHERE id = ?',
      [userId]
    );

    // Get level info
    const level = await db.getAsync(
      'SELECT * FROM level WHERE level_number = ?',
      [user.current_level]
    );

    const nextLevel = await db.getAsync(
      'SELECT * FROM level WHERE level_number > ? ORDER BY level_number ASC LIMIT 1',
      [user.current_level]
    );

    // Get progress stats
    const progress = await db.allAsync(
      `SELECT up.*, q.question_text 
       FROM user_progress up 
       JOIN question q ON up.question_id = q.id 
       WHERE up.user_id = ? 
       ORDER BY up.answered_at DESC 
       LIMIT 10`,
      [userId]
    );

    const totalAnswered = await db.getAsync(
      'SELECT COUNT(*) as count FROM user_progress WHERE user_id = ?',
      [userId]
    );

    const correctCount = await db.getAsync(
      'SELECT COUNT(*) as count FROM user_progress WHERE user_id = ? AND answered_correctly = 1',
      [userId]
    );

    const accuracy = totalAnswered.count > 0 
      ? (correctCount.count / totalAnswered.count * 100).toFixed(1)
      : 0;

    res.json({
      user,
      stats: {
        total_xp: user.total_xp,
        questions_answered: totalAnswered.count,
        correct_answers: correctCount.count,
        accuracy: parseFloat(accuracy),
        current_level: user.current_level,
        daily_streak: user.daily_streak || 0,
        level_info: level,
        next_level: nextLevel,
        xp_to_next_level: nextLevel ? Math.max(0, nextLevel.xp_required - user.total_xp) : null
      },
      recent_progress: progress.map(p => ({
        id: p.id,
        question_text: p.question_text.substring(0, 50) + '...',
        answered_correctly: p.answered_correctly === 1,
        xp_earned: p.xp_earned,
        answered_at: p.answered_at
      }))
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

