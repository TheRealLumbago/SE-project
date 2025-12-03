from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
import os
import json
from werkzeug.utils import secure_filename
from config import Config
from models import db, User, Question, UserProgress
from auth import register_user, login_user, logout_user, get_current_user, require_login
from question_service import (
    create_question, process_csv_upload, get_questions_for_quiz,
    check_answer, get_leaderboard
)
from openai_service import generate_cybersecurity_question, generate_multiple_questions

app = Flask(__name__)
app.config.from_object(Config)

# Make get_current_user available to all templates
@app.context_processor
def inject_user():
    return dict(get_current_user=get_current_user)

# Initialize database
db.init_app(app)

# Create upload directory
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

# Initialize database tables
with app.app_context():
    db.create_all()

ALLOWED_EXTENSIONS = {'csv'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    """Home/Dashboard"""
    user = get_current_user()
    if user:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/dashboard')
@require_login
def dashboard():
    """User dashboard"""
    user = get_current_user()
    recent_progress = UserProgress.query.filter_by(user_id=user.id).order_by(UserProgress.answered_at.desc()).limit(5).all()
    return render_template('dashboard.html', user=user, recent_progress=recent_progress)

@app.route('/register', methods=['GET', 'POST'])
def register():
    """User registration"""
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if not username or not email or not password:
            flash('All fields are required.', 'danger')
            return render_template('register.html')
        
        if password != confirm_password:
            flash('Passwords do not match.', 'danger')
            return render_template('register.html')
        
        success, message = register_user(username, email, password)
        if success:
            flash(message, 'success')
            return redirect(url_for('login'))
        else:
            flash(message, 'danger')
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """User login"""
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if not username or not password:
            flash('Username and password are required.', 'danger')
            return render_template('login.html')
        
        success, result = login_user(username, password)
        if success:
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash(result, 'danger')
    
    return render_template('login.html')

@app.route('/logout')
@require_login
def logout():
    """User logout"""
    logout_user()
    flash('You have been logged out.', 'info')
    return redirect(url_for('login'))

@app.route('/quiz', methods=['GET', 'POST'])
@require_login
def quiz():
    """Take a quiz"""
    user = get_current_user()
    
    if request.method == 'POST':
        # Handle quiz submission
        question_id = request.form.get('question_id')
        user_answer = request.form.get('answer')
        
        if question_id and user_answer:
            is_correct, xp_earned, correct_answer = check_answer(int(question_id), user_answer, user.id)
            return render_template('results.html', 
                                 is_correct=is_correct, 
                                 xp_earned=xp_earned,
                                 correct_answer=correct_answer,
                                 user_answer=user_answer)
    
    # Generate or get questions
    difficulty = request.args.get('difficulty', 'medium')
    category = request.args.get('category', None)
    use_openai = request.args.get('use_openai', 'false') == 'true'
    
    if use_openai:
        # Generate question using OpenAI
        question_data = generate_cybersecurity_question(topic=category, difficulty=difficulty)
        if question_data:
            success, question = create_question(question_data, user.id)
            if success:
                # Parse options for display
                options = None
                if question.options:
                    try:
                        options = json.loads(question.options)
                    except:
                        options = [question.options]
                
                return render_template('quiz.html', 
                                     question=question, 
                                     options=options,
                                     difficulty=difficulty,
                                     category=category)
            else:
                flash('Error creating question.', 'danger')
        else:
            flash('Error generating question. Please check OpenAI API configuration.', 'danger')
    
    # Get existing question from database
    questions = get_questions_for_quiz(count=1, difficulty=difficulty, category=category)
    if not questions:
        flash('No questions available. Please upload some questions first.', 'warning')
        return redirect(url_for('upload_questions'))
    
    question = questions[0]
    options = None
    if question.options:
        try:
            options = json.loads(question.options)
        except:
            options = [question.options]
    
    return render_template('quiz.html', 
                         question=question, 
                         options=options,
                         difficulty=difficulty,
                         category=category)

@app.route('/leaderboard')
def leaderboard():
    """Display leaderboard"""
    users = get_leaderboard(limit=50)
    return render_template('leaderboard.html', users=users)

@app.route('/upload_questions', methods=['GET', 'POST'])
@require_login
def upload_questions():
    """Upload questions page"""
    user = get_current_user()
    
    if request.method == 'POST':
        # Handle manual question entry
        question_text = request.form.get('question_text')
        question_type = request.form.get('question_type')
        correct_answer = request.form.get('correct_answer')
        category = request.form.get('category')
        difficulty = request.form.get('difficulty')
        options = request.form.get('options')
        
        if not all([question_text, question_type, correct_answer, category, difficulty]):
            flash('All fields are required.', 'danger')
            return render_template('upload_questions.html')
        
        # Parse options
        options_list = None
        if options:
            options_list = [opt.strip() for opt in options.split(',')]
        
        question_data = {
            'question_text': question_text,
            'question_type': question_type,
            'correct_answer': correct_answer,
            'category': category,
            'difficulty': difficulty,
            'options': options_list
        }
        
        success, result = create_question(question_data, user.id)
        if success:
            flash('Question added successfully!', 'success')
        else:
            flash(f'Error adding question: {result}', 'danger')
    
    return render_template('upload_questions.html')

@app.route('/upload_csv', methods=['POST'])
@require_login
def upload_csv():
    """Handle CSV file upload"""
    user = get_current_user()
    
    if 'file' not in request.files:
        flash('No file selected.', 'danger')
        return redirect(url_for('upload_questions'))
    
    file = request.files['file']
    
    if file.filename == '':
        flash('No file selected.', 'danger')
        return redirect(url_for('upload_questions'))
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        filepath = os.path.join(Config.UPLOAD_FOLDER, filename)
        file.save(filepath)
        
        questions_created, errors = process_csv_upload(filepath, user.id)
        
        # Clean up uploaded file
        os.remove(filepath)
        
        if questions_created > 0:
            flash(f'Successfully uploaded {questions_created} question(s)!', 'success')
        if errors:
            for error in errors[:5]:  # Show first 5 errors
                flash(error, 'warning')
        
        return redirect(url_for('upload_questions'))
    else:
        flash('Invalid file type. Please upload a CSV file.', 'danger')
        return redirect(url_for('upload_questions'))

@app.route('/add_question', methods=['POST'])
@require_login
def add_question():
    """API endpoint to add a single question"""
    user = get_current_user()
    data = request.get_json()
    
    if not data:
        return jsonify({'success': False, 'message': 'No data provided'}), 400
    
    success, result = create_question(data, user.id)
    
    if success:
        return jsonify({'success': True, 'message': 'Question added successfully'}), 200
    else:
        return jsonify({'success': False, 'message': str(result)}), 400

@app.route('/generate_question', methods=['POST'])
@require_login
def generate_question():
    """Generate a question using OpenAI API"""
    user = get_current_user()
    data = request.get_json() or {}
    
    topic = data.get('topic')
    difficulty = data.get('difficulty', 'medium')
    question_type = data.get('question_type')
    
    question_data = generate_cybersecurity_question(topic=topic, question_type=question_type, difficulty=difficulty)
    
    if question_data:
        success, question = create_question(question_data, user.id)
        if success:
            return jsonify({'success': True, 'question': {
                'id': question.id,
                'question_text': question.question_text,
                'question_type': question.question_type,
                'options': json.loads(question.options) if question.options else None,
                'correct_answer': question.correct_answer,
                'category': question.category,
                'difficulty': question.difficulty
            }}), 200
        else:
            return jsonify({'success': False, 'message': str(question)}), 400
    else:
        return jsonify({'success': False, 'message': 'Failed to generate question. Check OpenAI API configuration.'}), 500

if __name__ == '__main__':
    app.run(debug=True)

