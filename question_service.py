import json
import csv
import os
from models import Question, UserProgress, User, db
from openai_service import generate_cybersecurity_question

# XP values based on difficulty
XP_VALUES = {
    'easy': 10,
    'medium': 20,
    'hard': 30
}

def parse_options(options_str):
    """Parse options string (JSON or comma-separated) into list"""
    if not options_str:
        return None
    
    # Try JSON first
    try:
        if isinstance(options_str, str):
            return json.loads(options_str)
        return options_str
    except json.JSONDecodeError:
        # Try comma-separated
        if ',' in options_str:
            return [opt.strip() for opt in options_str.split(',')]
        return [options_str]

def create_question(question_data, user_id=None):
    """Create a question in the database"""
    options = question_data.get('options')
    if options:
        options = json.dumps(options) if isinstance(options, list) else options
    
    question = Question(
        question_text=question_data['question_text'],
        question_type=question_data['question_type'],
        options=options,
        correct_answer=str(question_data['correct_answer']),
        category=question_data.get('category', 'general'),
        difficulty=question_data.get('difficulty', 'medium'),
        created_by=user_id
    )
    
    try:
        db.session.add(question)
        db.session.commit()
        return True, question
    except Exception as e:
        db.session.rollback()
        return False, str(e)

def process_csv_upload(file_path, user_id=None):
    """Process CSV file and create questions"""
    questions_created = 0
    errors = []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            
            required_columns = ['question_text', 'question_type', 'correct_answer', 'category', 'difficulty']
            
            # Check if all required columns exist
            if not all(col in reader.fieldnames for col in required_columns):
                return 0, ["CSV must contain columns: question_text, question_type, correct_answer, category, difficulty"]
            
            for row_num, row in enumerate(reader, start=2):  # Start at 2 (row 1 is header)
                try:
                    # Parse options if present
                    options = None
                    if 'options' in row and row['options']:
                        options = parse_options(row['options'])
                    
                    question_data = {
                        'question_text': row['question_text'].strip(),
                        'question_type': row['question_type'].strip().lower(),
                        'correct_answer': row['correct_answer'].strip(),
                        'category': row['category'].strip(),
                        'difficulty': row['difficulty'].strip().lower(),
                        'options': options
                    }
                    
                    # Validate question type
                    valid_types = ['multiple_choice', 'true_false', 'short_answer']
                    if question_data['question_type'] not in valid_types:
                        errors.append(f"Row {row_num}: Invalid question_type. Must be one of {valid_types}")
                        continue
                    
                    # Validate difficulty
                    valid_difficulties = ['easy', 'medium', 'hard']
                    if question_data['difficulty'] not in valid_difficulties:
                        errors.append(f"Row {row_num}: Invalid difficulty. Must be one of {valid_difficulties}")
                        continue
                    
                    success, result = create_question(question_data, user_id)
                    if success:
                        questions_created += 1
                    else:
                        errors.append(f"Row {row_num}: {result}")
                        
                except Exception as e:
                    errors.append(f"Row {row_num}: {str(e)}")
        
        return questions_created, errors
        
    except Exception as e:
        return 0, [f"Error reading CSV file: {str(e)}"]

def get_questions_for_quiz(count=5, difficulty=None, category=None):
    """Get questions for a quiz"""
    import random
    
    query = Question.query
    
    if difficulty:
        query = query.filter_by(difficulty=difficulty)
    if category:
        query = query.filter_by(category=category)
    
    all_questions = query.all()
    if not all_questions:
        return []
    
    # Randomly select questions
    selected_count = min(count, len(all_questions))
    questions = random.sample(all_questions, selected_count)
    return questions

def check_answer(question_id, user_answer, user_id):
    """Check if answer is correct and award XP"""
    question = Question.query.get_or_404(question_id)
    user = User.query.get_or_404(user_id)
    
    # Normalize answers for comparison
    correct_answer = str(question.correct_answer).strip().lower()
    user_answer_normalized = str(user_answer).strip().lower()
    
    # For multiple choice and true/false, exact match
    # For short answer, check if user answer contains key words (simple check)
    if question.question_type == 'short_answer':
        # Simple keyword matching for short answers
        is_correct = correct_answer.lower() in user_answer_normalized or user_answer_normalized in correct_answer.lower()
    else:
        is_correct = correct_answer == user_answer_normalized
    
    # Calculate XP
    xp_earned = 0
    if is_correct:
        xp_earned = XP_VALUES.get(question.difficulty, 10)
        user.total_xp += xp_earned
    
    # Record progress
    progress = UserProgress(
        user_id=user_id,
        question_id=question_id,
        answered_correctly=is_correct,
        xp_earned=xp_earned
    )
    
    try:
        db.session.add(progress)
        db.session.commit()
        return is_correct, xp_earned, question.correct_answer
    except Exception as e:
        db.session.rollback()
        return False, 0, None

def get_leaderboard(limit=50):
    """Get leaderboard of top users by XP"""
    users = User.query.order_by(User.total_xp.desc()).limit(limit).all()
    return users

