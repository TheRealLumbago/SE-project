const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;

    const users = await db.allAsync(
      'SELECT id, username, total_xp FROM user WHERE role != ? OR role IS NULL ORDER BY total_xp DESC LIMIT ?',
      ['admin', limit]
    );

    res.json({ users });
  } catch (error) {
    console.error('Leaderboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

