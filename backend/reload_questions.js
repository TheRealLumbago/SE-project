const db = require('./config/database');
const csv = require('csv-parse/sync');
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'sample_questions.csv');

async function loadQuestions() {
  try {
    console.log('Reading CSV file...');
    const fileContent = fs.readFileSync(csvPath, 'utf-8');
    const records = csv.parse(fileContent, { columns: true, skip_empty_lines: true });
    
    // Filter valid questions
    const validRecords = records.filter(row => {
      return row.question_text && 
             !row.question_text.startsWith('question_text') &&
             (row.question_type === 'multiple_choice' || row.question_type === 'true_false');
    });
    
    console.log(`Found ${validRecords.length} valid questions in CSV`);
    
    // Clear existing questions
    console.log('Clearing existing questions and user progress...');
    await db.runAsync('DELETE FROM user_progress');
    console.log('Cleared user progress');
    
    await db.runAsync('DELETE FROM question');
    console.log('Cleared existing questions');
    
    // Insert new questions
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < validRecords.length; i++) {
      const row = validRecords[i];
      try {
        const options = row.options ? JSON.stringify(row.options.split(',').map(opt => opt.trim())) : null;
        const level_required = row.level_required ? parseInt(row.level_required) : 1;
        
        await db.runAsync(
          `INSERT INTO question (question_text, question_type, options, correct_answer, category, difficulty, level_required)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            row.question_text,
            row.question_type,
            options,
            row.correct_answer,
            row.category,
            row.difficulty,
            level_required
          ]
        );
        inserted++;
        
        if ((i + 1) % 50 === 0) {
          console.log(`Processed ${i + 1}/${validRecords.length} questions...`);
        }
      } catch (error) {
        console.error(`Error inserting row ${i + 2}:`, error.message);
        errors++;
      }
    }
    
    console.log(`\nCompleted!`);
    console.log(`Successfully inserted: ${inserted} questions`);
    console.log(`Errors: ${errors}`);
    
    // Get final count
    const count = await db.getAsync('SELECT COUNT(*) as count FROM question');
    console.log(`\nTotal questions in database: ${count.count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error loading questions:', error);
    process.exit(1);
  }
}

// Wait a bit for database to initialize, then load questions
setTimeout(() => {
  loadQuestions();
}, 1000);

