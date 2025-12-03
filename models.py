from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

db = SQLAlchemy()

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    total_xp = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    questions = db.relationship('Question', backref='creator', lazy=True)
    progress = db.relationship('UserProgress', backref='user', lazy=True)
    
    def __repr__(self):
        return f'<User {self.username}>'

class Question(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    question_text = db.Column(db.Text, nullable=False)
    question_type = db.Column(db.String(50), nullable=False)  # multiple_choice, true_false, short_answer
    options = db.Column(db.Text)  # JSON string for multiple choice options
    correct_answer = db.Column(db.Text, nullable=False)
    category = db.Column(db.String(100), nullable=False)  # phishing, malware, etc.
    difficulty = db.Column(db.String(20), nullable=False)  # easy, medium, hard
    created_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    progress = db.relationship('UserProgress', backref='question', lazy=True)
    
    def __repr__(self):
        return f'<Question {self.id}>'

class UserProgress(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey('question.id'), nullable=False)
    answered_correctly = db.Column(db.Boolean, nullable=False)
    xp_earned = db.Column(db.Integer, default=0)
    answered_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f'<UserProgress {self.id}>'

