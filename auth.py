from werkzeug.security import generate_password_hash, check_password_hash
from flask import session
from models import User, db

def register_user(username, email, password):
    """Register a new user"""
    # Check if username or email already exists
    if User.query.filter_by(username=username).first():
        return False, "Username already exists"
    if User.query.filter_by(email=email).first():
        return False, "Email already exists"
    
    # Create new user
    password_hash = generate_password_hash(password)
    user = User(username=username, email=email, password_hash=password_hash)
    
    try:
        db.session.add(user)
        db.session.commit()
        return True, "User registered successfully"
    except Exception as e:
        db.session.rollback()
        return False, f"Error registering user: {str(e)}"

def login_user(username, password):
    """Authenticate and login a user"""
    user = User.query.filter_by(username=username).first()
    
    if user and check_password_hash(user.password_hash, password):
        session['user_id'] = user.id
        session['username'] = user.username
        return True, user
    return False, "Invalid username or password"

def logout_user():
    """Logout current user"""
    session.pop('user_id', None)
    session.pop('username', None)

def get_current_user():
    """Get current logged in user"""
    if 'user_id' in session:
        return User.query.get(session['user_id'])
    return None

def require_login(f):
    """Decorator to require login for routes"""
    from functools import wraps
    from flask import redirect, url_for, flash
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            flash('Please login to access this page.', 'warning')
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

