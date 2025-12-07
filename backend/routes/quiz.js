const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const XP_VALUES = { easy: 10, medium: 20, hard: 30 };

// Get question for quiz
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { difficulty, category } = req.query;
    const userId = req.user.id;

    // Get list of question IDs user has already answered
    const answeredQuestions = await db.allAsync(
      'SELECT DISTINCT question_id FROM user_progress WHERE user_id = ? AND question_id IS NOT NULL',
      [userId]
    );
    const answeredIds = answeredQuestions.map(q => q.question_id).filter(id => id != null);

    // Only fetch multiple_choice and true_false questions that user hasn't answered
    let query = 'SELECT * FROM question WHERE question_type IN (?, ?)';
    const params = ['multiple_choice', 'true_false'];

    // Exclude already answered questions if there are any
    if (answeredIds.length > 0) {
      const placeholders = answeredIds.map(() => '?').join(',');
      query += ` AND id NOT IN (${placeholders})`;
      params.push(...answeredIds);
    }

    if (difficulty) {
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
      // Fallback: get all questions (allow repeats)
      let fallbackQuery = 'SELECT * FROM question WHERE question_type IN (?, ?)';
      const fallbackParams = ['multiple_choice', 'true_false'];

      if (difficulty) {
        fallbackQuery += ' AND difficulty = ?';
        fallbackParams.push(difficulty);
      }

      if (category) {
        fallbackQuery += ' AND category = ?';
        fallbackParams.push(category);
      }

      const allQuestions = await db.allAsync(fallbackQuery, fallbackParams);
      
      if (allQuestions.length === 0) {
        return res.status(404).json({ error: 'No questions available' });
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

    // Check user level
    const user = await db.getAsync('SELECT current_level FROM user WHERE id = ?', [req.user.id]);
    if (user.current_level < (question.level_required || 1)) {
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
      const baseXP = XP_VALUES[question.difficulty] || 10;
      const hintPenalty = (hints_used || 0) * 2; // Deduct 2 XP per hint
      xpEarned = Math.max(0, baseXP - hintPenalty);
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

