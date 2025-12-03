const express = require('express');
const multer = require('multer');
const csv = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const { generateCybersecurityQuestion } = require('../services/openaiService');

const upload = multer({ dest: 'uploads/' });

const XP_VALUES = { easy: 10, medium: 20, hard: 30 };

// Create question
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { question_text, question_type, correct_answer, category, difficulty, options, hint, level_required, time_limit } = req.body;

    if (!question_text || !question_type || !correct_answer || !category || !difficulty) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Only support multiple_choice and true_false
    if (question_type !== 'multiple_choice' && question_type !== 'true_false') {
      return res.status(400).json({ error: 'Only multiple choice and true/false questions are supported' });
    }

    const optionsJson = options ? JSON.stringify(options) : null;

    const result = await db.runAsync(
      `INSERT INTO question (question_text, question_type, options, correct_answer, category, difficulty, hint, level_required, time_limit, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [question_text, question_type, optionsJson, correct_answer, category, difficulty, hint || null, level_required || 1, time_limit || 300, req.user.id]
    );

    res.status(201).json({
      message: 'Question created successfully',
      question: {
        id: result.lastID,
        question_text,
        question_type,
        options,
        correct_answer,
        category,
        difficulty,
        hint: hint || null,
        level_required: level_required || 1,
        time_limit: time_limit || 300
      }
    });
  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate AI question
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { topic, difficulty = 'medium', question_type } = req.body;

    const questionData = await generateCybersecurityQuestion(topic, question_type, difficulty);

    if (!questionData) {
      return res.status(500).json({ error: 'Failed to generate question' });
    }

    const optionsJson = questionData.options ? JSON.stringify(questionData.options) : null;

    const result = await db.runAsync(
      `INSERT INTO question (question_text, question_type, options, correct_answer, category, difficulty, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        questionData.question_text,
        questionData.question_type,
        optionsJson,
        questionData.correct_answer,
        questionData.category,
        questionData.difficulty,
        req.user.id
      ]
    );

    res.json({
      message: 'Question generated successfully',
      question: {
        id: result.lastID,
        ...questionData
      }
    });
  } catch (error) {
    console.error('Generate question error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload CSV
router.post('/upload-csv', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    const records = csv.parse(fileContent, { columns: true, skip_empty_lines: true });

    let created = 0;
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      try {
        // Validate question type - only allow multiple_choice and true_false
        if (row.question_type !== 'multiple_choice' && row.question_type !== 'true_false') {
          errors.push(`Row ${i + 2}: Unsupported question type "${row.question_type}". Only multiple_choice and true_false are allowed.`);
          continue;
        }

        const options = row.options ? row.options.split(',').map(opt => opt.trim()) : null;

        await db.runAsync(
          `INSERT INTO question (question_text, question_type, options, correct_answer, category, difficulty, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            row.question_text,
            row.question_type,
            options ? JSON.stringify(options) : null,
            row.correct_answer,
            row.category,
            row.difficulty,
            req.user.id
          ]
        );
        created++;
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error.message}`);
      }
    }

    // Delete uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      message: `Successfully uploaded ${created} question(s)`,
      created,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    console.error('CSV upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

