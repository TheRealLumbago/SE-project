const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const XP_VALUES = { easy: 10, medium: 20, hard: 30, very_hard: 50 };

// Calculate XP based on difficulty and level
// Designed so that 10 questions = 1 level up
function calculateXP(difficulty, level) {
  const baseXP = XP_VALUES[difficulty] || 10;
  
  // Level multipliers to ensure ~10 questions per level
  // Level 1: 10 XP (easy) → 100 XP total (10 questions)
  // Level 2: 15 XP (easy) → 150 XP total (10 questions)
  // Level 3: 25 XP (medium) → 250 XP total (10 questions)
  // Level 4: 50 XP (medium) → 500 XP total (10 questions)
  // Level 5: 100 XP (hard) → 1000 XP total (10 questions)
  // Level 6: 150 XP (very_hard) → 1500 XP total (10 questions)
  
  const levelMultipliers = {
    1: 1.0,   // 10 XP (easy)
    2: 1.5,   // 15 XP (easy)
    3: 1.25,  // 25 XP (medium)
    4: 2.5,   // 50 XP (medium)
    5: 3.33,  // 100 XP (hard)
    6: 3.0,   // 150 XP (very_hard)
    7: 3.0    // 150 XP (very_hard) - same as level 6
  };
  
  // Ensure level is a number and handle string conversion
  let levelNum = level;
  if (typeof level === 'string') {
    levelNum = parseInt(level, 10);
  }
  if (isNaN(levelNum) || levelNum < 1) {
    levelNum = 1;
  }
  
  const multiplier = levelMultipliers[levelNum] || levelMultipliers[1];
  const result = Math.round(baseXP * multiplier);
  
  return result;
}

// Get question for quiz
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { difficulty, category, level } = req.query;
    const userId = req.user.id;

    // Get user's current level, XP, and role
    const user = await db.getAsync('SELECT current_level, total_xp, role FROM user WHERE id = ?', [userId]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    const userLevel = user.current_level || 1;
    const isAdmin = user.role === 'admin';
    
    // Determine which level to use - if level param is provided, use it; otherwise use user's current level
    let targetLevel = userLevel;
    if (level) {
      const requestedLevel = parseInt(level);
      if (isNaN(requestedLevel) || requestedLevel < 1) {
        return res.status(400).json({ error: 'Invalid level parameter' });
      }
      
      // Check if user has unlocked this level (admins bypass this check)
      if (!isAdmin) {
        const levelInfo = await db.getAsync(
          'SELECT xp_required FROM level WHERE level_number = ?',
          [requestedLevel]
        );
        
        if (!levelInfo) {
          return res.status(404).json({ error: 'Level not found' });
        }
        
        if (user.total_xp < levelInfo.xp_required) {
          return res.status(403).json({ 
            error: `Level ${requestedLevel} is locked. You need ${levelInfo.xp_required} XP to unlock it.` 
          });
        }
      }
      
      targetLevel = requestedLevel;
    }

    // Get list of question IDs user has already answered
    const answeredQuestions = await db.allAsync(
      'SELECT DISTINCT question_id FROM user_progress WHERE user_id = ? AND question_id IS NOT NULL',
      [userId]
    );
    const answeredIds = answeredQuestions.map(q => q.question_id).filter(id => id != null);

    // Only fetch multiple_choice and true_false questions for the target level
    // If level param is provided, filter by that specific level; otherwise use <= userLevel
    let query = 'SELECT * FROM question WHERE question_type IN (?, ?)';
    const params = ['multiple_choice', 'true_false'];
    
    if (level) {
      // If specific level requested, show only questions for that level
      query += ' AND level_required = ?';
      params.push(targetLevel);
    } else {
      // Otherwise, show questions up to user's current level
      query += ' AND level_required <= ?';
      params.push(targetLevel);
    }

    // Exclude already answered questions if there are any
    if (answeredIds.length > 0) {
      const placeholders = answeredIds.map(() => '?').join(',');
      query += ` AND id NOT IN (${placeholders})`;
      params.push(...answeredIds);
    }

    // Only apply difficulty filter if not starting a specific level
    // When starting a level, show all difficulties for that level
    if (difficulty && !level) {
      query += ' AND difficulty = ?';
      params.push(difficulty);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    const questions = await db.allAsync(query, params);

    // If no unanswered questions, allow repeats but prefer unanswered
    if (questions.length === 0) {
      // Fallback: get all questions (allow repeats) but still filter by level
      let fallbackQuery = 'SELECT * FROM question WHERE question_type IN (?, ?)';
      const fallbackParams = ['multiple_choice', 'true_false'];
      
      if (level) {
        fallbackQuery += ' AND level_required = ?';
        fallbackParams.push(targetLevel);
      } else {
        fallbackQuery += ' AND level_required <= ?';
        fallbackParams.push(targetLevel);
      }

      // Only apply difficulty filter if not starting a specific level
      if (difficulty && !level) {
        fallbackQuery += ' AND difficulty = ?';
        fallbackParams.push(difficulty);
      }

      if (category) {
        fallbackQuery += ' AND category = ?';
        fallbackParams.push(category);
      }

      const allQuestions = await db.allAsync(fallbackQuery, fallbackParams);
      
      if (allQuestions.length === 0) {
        return res.status(404).json({ error: `No questions available for level ${targetLevel}` });
      }

      // Randomly select from all questions
      const randomQuestion = allQuestions[Math.floor(Math.random() * allQuestions.length)];
      
      // Parse options if present
      let options = null;
      if (randomQuestion.options) {
        try {
          options = JSON.parse(randomQuestion.options);
        } catch (e) {
          options = [randomQuestion.options];
        }
      }

      return res.json({
        question: {
          id: randomQuestion.id,
          question_text: randomQuestion.question_text,
          question_type: randomQuestion.question_type,
          options,
          category: randomQuestion.category,
          difficulty: randomQuestion.difficulty,
          hint: randomQuestion.hint || null,
          time_limit: Math.min(randomQuestion.time_limit || 30, 30),
          level_required: randomQuestion.level_required || 1
        },
        all_answered: answeredIds.length > 0
      });
    }

    // Randomly select from unanswered questions
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];

    // Parse options if present
    let options = null;
    if (randomQuestion.options) {
      try {
        options = JSON.parse(randomQuestion.options);
      } catch (e) {
        options = [randomQuestion.options];
      }
    }

    res.json({
      question: {
        id: randomQuestion.id,
        question_text: randomQuestion.question_text,
        question_type: randomQuestion.question_type,
        options,
        category: randomQuestion.category,
        difficulty: randomQuestion.difficulty,
        hint: randomQuestion.hint || null,
        time_limit: Math.min(randomQuestion.time_limit || 30, 30),
        level_required: randomQuestion.level_required || 1
      },
      remaining: questions.length
    });
  } catch (error) {
    console.error('Get question error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: 'Internal server error', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
});

// Submit answer
router.post('/submit', authenticateToken, async (req, res) => {
  try {
    const { question_id, answer, time_taken, hints_used } = req.body;

    if (!question_id || answer === undefined) {
      return res.status(400).json({ error: 'Question ID and answer are required' });
    }

    // Get question (only multiple_choice and true_false)
    const question = await db.getAsync(
      'SELECT * FROM question WHERE id = ? AND question_type IN (?, ?)', 
      [question_id, 'multiple_choice', 'true_false']
    );

    if (!question) {
      return res.status(404).json({ error: 'Question not found or unsupported question type' });
    }

    // Check user level (admins bypass this check)
    const user = await db.getAsync('SELECT current_level, role FROM user WHERE id = ?', [req.user.id]);
    const isAdmin = user.role === 'admin';
    if (!isAdmin && user.current_level < (question.level_required || 1)) {
      return res.status(403).json({ error: 'You need to reach level ' + (question.level_required || 1) + ' to access this question' });
    }

    // Check answer (only multiple_choice and true_false supported)
    const correctAnswer = question.correct_answer.toLowerCase().trim();
    const userAnswer = answer.toString().toLowerCase().trim();

    let isCorrect = false;
    // Only support multiple_choice and true_false
    if (question.question_type === 'multiple_choice' || question.question_type === 'true_false') {
      isCorrect = correctAnswer === userAnswer;
    } else {
      return res.status(400).json({ error: 'Unsupported question type. Only multiple choice and true/false questions are available.' });
    }

    // Calculate XP (deduct for hints used)
    let xpEarned = 0;
    if (isCorrect) {
      // Ensure level is a number (database might return it as string)
      const level = parseInt(question.level_required) || 1;
      const baseXP = calculateXP(question.difficulty, level);
      const hintPenalty = (hints_used || 0) * 2; // Deduct 2 XP per hint
      xpEarned = Math.max(0, baseXP - hintPenalty);
      
      // Debug: Log XP calculation
      console.log(`[XP] Q${question_id}: diff=${question.difficulty}, lvl=${level}, base=${baseXP}, penalty=${hintPenalty}, final=${xpEarned}`);
    }

    // Update user XP if correct
    if (isCorrect && xpEarned > 0) {
      await db.runAsync(
        'UPDATE user SET total_xp = total_xp + ? WHERE id = ?',
        [xpEarned, req.user.id]
      );
    }

    // Update daily streak
    const today = new Date().toISOString().split('T')[0];
    const userData = await db.getAsync('SELECT last_activity_date, daily_streak FROM user WHERE id = ?', [req.user.id]);
    
    if (userData.last_activity_date !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      
      let newStreak = 1;
      if (userData.last_activity_date === yesterdayStr) {
        newStreak = (userData.daily_streak || 0) + 1;
      }
      
      await db.runAsync(
        'UPDATE user SET daily_streak = ?, last_activity_date = ? WHERE id = ?',
        [newStreak, today, req.user.id]
      );
    }

    // Check and update level
    const updatedUser = await db.getAsync('SELECT total_xp, current_level FROM user WHERE id = ?', [req.user.id]);
    const level = await db.getAsync(
      'SELECT * FROM level WHERE xp_required <= ? ORDER BY level_number DESC LIMIT 1',
      [updatedUser.total_xp]
    );
    
    if (level && level.level_number > updatedUser.current_level) {
      await db.runAsync(
        'UPDATE user SET current_level = ? WHERE id = ?',
        [level.level_number, req.user.id]
      );
    }

    // Record progress
    await db.runAsync(
      `INSERT INTO user_progress (user_id, question_id, answered_correctly, xp_earned, time_taken, hints_used)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, question_id, isCorrect ? 1 : 0, xpEarned, time_taken || null, hints_used || 0]
    );

    // Get final user data
    const finalUser = await db.getAsync('SELECT total_xp, current_level, daily_streak FROM user WHERE id = ?', [req.user.id]);

    res.json({
      is_correct: isCorrect,
      xp_earned: xpEarned,
      correct_answer: question.correct_answer,
      total_xp: finalUser.total_xp,
      current_level: finalUser.current_level,
      daily_streak: finalUser.daily_streak,
      level_up: level && level.level_number > updatedUser.current_level
    });
  } catch (error) {
    console.error('Submit answer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get hint for question
router.get('/hint/:questionId', authenticateToken, async (req, res) => {
  try {
    const question = await db.getAsync(
      'SELECT hint FROM question WHERE id = ? AND question_type IN (?, ?)', 
      [req.params.questionId, 'multiple_choice', 'true_false']
    );
    
    if (!question) {
      return res.status(404).json({ error: 'Question not found or unsupported question type' });
    }

    if (!question.hint) {
      return res.status(404).json({ error: 'No hint available for this question' });
    }

    res.json({ hint: question.hint });
  } catch (error) {
    console.error('Get hint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

