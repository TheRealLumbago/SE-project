# Quick Start Guide

## Setup Instructions

1. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

2. **Configure Environment Variables**
   
   Create a `.env` file in the project root with:
   ```
   SECRET_KEY=your-secret-key-change-in-production
   OPENAI_API_KEY=sk-your-openai-api-key-here
   DATABASE_URL=sqlite:///quiz.db
   ```
   
   **Note**: Get your OpenAI API key from https://platform.openai.com/api-keys

3. **Run the Application**
   ```bash
   python app.py
   ```

4. **Access the Application**
   - Open your browser to `http://localhost:5000`
   - Register a new account
   - Start taking quizzes!

## Features Overview

### 1. User Registration & Login
- Register with username, email, and password
- Secure password hashing
- Session management

### 2. Take Quiz
- Answer cybersecurity questions
- Choose difficulty (Easy/Medium/Hard)
- Filter by category
- Generate new questions using OpenAI API

### 3. Upload Questions

**Manual Entry:**
- Fill out form with question details
- Supports multiple choice, true/false, and short answer

**CSV Upload:**
- Use the provided `sample_questions.csv` as a template
- Required columns: question_text, question_type, correct_answer, category, difficulty
- Optional: options (for multiple choice)

### 4. Leaderboard
- View top users by XP
- See your rank and progress
- Earn badges based on total XP

### 5. XP System
- Easy questions: 10 XP
- Medium questions: 20 XP
- Hard questions: 30 XP
- XP is awarded only for correct answers

## Sample CSV Format

See `sample_questions.csv` for an example of the CSV format.

## Troubleshooting

**OpenAI API Errors:**
- Ensure your API key is correctly set in `.env`
- Check that you have credits in your OpenAI account
- The app will still work without OpenAI - you just won't be able to generate AI questions

**Database Issues:**
- Delete `quiz.db` to reset the database
- The database will be created automatically on first run

**Port Already in Use:**
- Change the port in `app.py`: `app.run(debug=True, port=5001)`

