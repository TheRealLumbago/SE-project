const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

// Get all levels with user's unlock status
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user's current XP, level, and role
    const user = await db.getAsync(
      'SELECT total_xp, current_level, role FROM user WHERE id = ?',
      [userId]
    );
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isAdmin = user.role === 'admin';
    
    // Get all levels
    const levels = await db.allAsync(
      'SELECT * FROM level ORDER BY level_number ASC'
    );
    
    // Get question counts per level
    const levelStats = await Promise.all(
      levels.map(async (level) => {
        const questionCount = await db.getAsync(
          'SELECT COUNT(*) as count FROM question WHERE level_required <= ?',
          [level.level_number]
        );
        
        // Admins have all levels unlocked
        const isUnlocked = isAdmin || user.total_xp >= level.xp_required;
        const isCurrentLevel = user.current_level === level.level_number;
        
        return {
          ...level,
          question_count: questionCount.count,
          is_unlocked: isUnlocked,
          is_current_level: isCurrentLevel,
          xp_progress: isUnlocked ? 100 : Math.min(100, (user.total_xp / level.xp_required) * 100)
        };
      })
    );
    
    res.json({
      levels: levelStats,
      user_xp: user.total_xp,
      current_level: user.current_level
    });
  } catch (error) {
    console.error('Get levels error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

