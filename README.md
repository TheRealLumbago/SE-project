# Cyber Escape Room - Gamified Cybersecurity Learning System

A modern, interactive web application built with React frontend and Node.js/Express backend for gamified cybersecurity education. This platform combines escape-room style puzzles with AI-generated questions to create an engaging learning experience.

**Supervisor:** Ma'am Laraib Noor  
**Group Members:** Abdullah Ahtasham 2023033, Ali Ahmed Chaudhry 2023093, Isra Chaudry 2023264

## Table of Contents

1. [Introduction](#introduction)
2. [Features](#features)
3. [Project Structure](#project-structure)
4. [Setup Instructions](#setup-instructions)
5. [Functional Requirements](#functional-requirements)
6. [Non-Functional Requirements](#non-functional-requirements)
7. [API Endpoints](#api-endpoints)
8. [Technologies Used](#technologies-used)
9. [Development](#development)

## Introduction

### Purpose

Traditional cybersecurity training often relies on passive methods (e.g., lectures, slides) that yield very low retention. In contrast, this platform uses self-paced, game-like activities to actively engage learners. Experiential, gamified training has been shown to dramatically increase learning retention (from about 5% with passive methods to as high as 90% with active learning). By combining escape-room style puzzles with AI-generated questions, the platform makes learning both enjoyable and effective.

### Product Scope

The Cyber Escape Room platform provides:

- **Interactive Gameplay**: Core game experience where players solve cybersecurity puzzles, complete timed challenges, and progress through narrative-based levels
- **Cybersecurity Puzzles**: Realistic tasks that teach security concepts, including cipher decoding, phishing identification, password strength challenges, file analysis, and network configuration tasks
- **Story-Narrative Environment**: A fictional scenario where users are placed inside a compromised digital system and must solve challenges connected to the storyline
- **Gamification Elements**: Points, badges, streaks, levels, time limits, and a scoring system designed to increase motivation
- **Leaderboard**: A ranking board that displays user performance, completion times, and scores
- **Timed Challenges**: Countdown-based puzzles that simulate the pressure of real cyberattacks
- **Hint & Feedback System**: Real-time guidance and clue delivery to help users understand mistakes
- **Performance Tracking & Analytics**: Records accuracy, time taken, hints used, challenge completion, and overall learning progress
- **Solo Mode**: Standard single-player progression through cybersecurity levels

## Features

### Core Features

- ✅ **User Authentication** (FR-01): Secure registration, login, and account management with JWT tokens
- ✅ **Cybersecurity Puzzle Engine** (FR-02): Interactive puzzles covering various cybersecurity topics
- ✅ **Timer & Scoring System** (FR-03): Countdown timers and scoring based on speed and accuracy
- ✅ **Hint System** (FR-04): Hints available with score deduction (2 XP per hint)
- ✅ **Leaderboard System** (FR-05): Ranking board showing top users by XP
- ✅ **Daily Streak & Rewards** (FR-06): Tracks daily streaks and rewards consistent participation
- ✅ **Level Progression** (FR-07): Unlocks higher levels after completing previous ones (7 levels: Beginner, Novice, Intermediate, Advanced, Expert, Master, Grandmaster)
- ✅ **Admin Puzzle Management** (FR-08): Admin panel for adding, editing, and deleting puzzles
- ✅ **Performance Analytics Dashboard** (FR-09): Comprehensive tracking of user performance, accuracy, and progress

### Additional Features

- **AI-Generated Questions**: Generate questions dynamically using OpenAI API
- **CSV Question Upload**: Bulk upload questions via CSV files
- **Multiple Question Types**: Multiple choice and true/false questions
- **XP System**: Earn XP based on difficulty and level (scales with level progression)
  - Base XP: Easy (10), Medium (20), Hard (30), Very Hard (50)
  - XP scales with level to ensure ~10 questions unlock the next level
- **Level-Based Questions**: Questions organized by `level_required` to match user progression
- **Real-time Feedback**: Immediate feedback on answers with explanations
- **Responsive Design**: Cross-device compatibility for desktop and mobile browsers
- **Admin Privileges**: Admins have all levels unlocked, 10000 XP, and level 7 access

## Project Structure

```
cybersecurity-quiz-platform/
├── backend/              # Node.js/Express API
│   ├── config/          # Database configuration
│   ├── middleware/      # Auth middleware
│   ├── routes/          # API routes
│   │   ├── auth.js      # Authentication routes
│   │   ├── questions.js # Question management
│   │   ├── quiz.js      # Quiz gameplay
│   │   ├── leaderboard.js # Leaderboard
│   │   ├── stats.js     # User statistics
│   │   └── admin.js     # Admin panel routes
│   ├── services/        # Business logic (OpenAI)
│   └── server.js        # Express server
├── frontend/            # React application
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── pages/       # Page components
│   │   ├── context/     # React context (Auth)
│   │   └── App.js       # Main app component
│   └── public/          # Static files
└── sample_questions.csv  # Sample CSV file
```

## Setup Instructions

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API key (optional, for AI question generation)

### Backend Setup

1. Navigate to backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env` file in the backend directory:
```env
PORT=5000
JWT_SECRET=your-secret-key-change-in-production
OPENAI_API_KEY=your-openai-api-key-here
DATABASE_URL=./quiz.db
```

4. Start the server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

The backend API will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The React app will run on `http://localhost:3000`

### Creating Admin Account

To create an admin account, you can either:
1. Manually update the database: `UPDATE user SET role = 'admin', total_xp = 10000, current_level = 7 WHERE username = 'your_username';`
2. Use the admin API endpoint (if you have admin access): `PUT /api/admin/users/:id/role` with `{"role": "admin"}`

**Note:** Admin accounts automatically receive:
- 10000 XP
- Level 7 (Grandmaster) access
- All levels unlocked regardless of XP
- Access to all questions from any level

## Functional Requirements

### FR-01: User Authentication
- Users can register, login, and manage their accounts securely
- JWT-based authentication
- Password hashing with bcrypt

### FR-02: Cybersecurity Puzzle Engine
- Presents cybersecurity puzzles (phishing detection, cipher decoding, OSINT tasks, network logs analysis)
- Supports multiple question types: multiple choice and true/false
- Questions organized by category, difficulty, and level requirement
- Questions assigned to specific levels to ensure progressive difficulty

### FR-03: Timer & Scoring System
- Countdown timer for each question (default 5 minutes)
- Scoring based on speed and accuracy
- Time tracking for performance analytics

### FR-04: Hint System
- Hints available for questions (if provided)
- Score deduction: -2 XP per hint used
- Helps users learn without giving full answers

### FR-05: Leaderboard System
- Displays ranking of users by total XP
- Updates dynamically as users earn XP
- Shows top 50 users by default

### FR-06: Daily Streak & Rewards
- Tracks consecutive days of activity
- Streak increases when user completes a task
- Resets if a day is missed
- Displayed on dashboard

### FR-07: Level Progression
- 7 levels with increasing XP requirements:
  - Level 1: Beginner (0 XP) - Start your cybersecurity journey
  - Level 2: Novice (100 XP) - You are learning the basics
  - Level 3: Intermediate (250 XP) - Building your skills
  - Level 4: Advanced (500 XP) - Mastering cybersecurity
  - Level 5: Expert (1000 XP) - Cybersecurity professional
  - Level 6: Master (2000 XP) - Advanced cybersecurity expert
  - Level 7: Grandmaster (3500 XP) - Elite cybersecurity specialist
- Questions assigned to specific levels via `level_required` field
- XP system designed so that approximately 10 questions unlock the next level
- XP scales with level: higher levels award more XP per question
- Automatic level unlocking based on total XP
- Progress bar shows XP needed for next level
- Admin users automatically have all levels unlocked, 10000 XP, and level 7 access

### FR-08: Admin Puzzle Management
- Admin role required
- Add, edit, and delete puzzles
- Manage user roles (assign admin, instructor, or learner roles)
- View all users and questions
- Admin privileges:
  - All levels automatically unlocked
  - 10000 XP and level 7 access
  - Can access any level without XP requirements
  - Can answer questions from any level

### FR-09: Performance Analytics Dashboard
- Tracks user accuracy, completion time, hints used
- Shows total XP, correct answers, questions answered
- Displays recent activity history
- Level progress and XP to next level

## Non-Functional Requirements

### Performance
- AI-generated questions returned within 3-5 seconds under normal load
- Website pages load within 2 seconds
- User-uploaded questions processed within 2 seconds
- System supports 500+ concurrent users
- AI API calls queued/cached to avoid rate limits

### Reliability & Availability
- Website availability: 99.5% uptime annually
- System retries AI API calls up to 2 times before failing
- Graceful fallback if AI fails (allows manual question uploads)
- Application handles unexpected crashes gracefully

### Security
- All data in transit encrypted using TLS 1.2+
- User-uploaded content sanitized (XSS, SQL Injection prevention)
- Authentication required for uploading/generating questions
- Role-based access control (Admin, Instructor, Learner)
- All user actions logged for auditing
- AI API keys stored server-side, never exposed

### Scalability
- Supports horizontal and vertical scaling
- Architecture allows switching AI providers
- Question storage scales to 100,000+ records

### Usability
- UI simple, intuitive, follows WCAG 2.1 AA guidelines
- Users can upload questions in ≤ 3 clicks
- Clear and instructive error messages

### Maintainability
- Modular architecture (service-based)
- AI integration separated into service layer
- Code includes proper documentation
- High priority issues resolvable within 48 hours

### Portability
- Works on major browsers (Chrome, Firefox, Edge, Safari)
- Fully responsive (desktop, tablet, mobile)
- Deployment supports major cloud providers (AWS, Azure, GCP)

### Legal & Compliance
- User data complies with privacy standards (GDPR-like guidelines)
- Users can delete their data
- Audit logs stored up to 90 days maximum

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user (protected)

### Questions
- `POST /api/questions` - Create question (protected)
- `POST /api/questions/generate` - Generate AI question (protected)
- `POST /api/questions/upload-csv` - Upload CSV file (protected)

### Quiz
- `GET /api/quiz` - Get random question (protected)
  - Query params: `difficulty`, `category`, `level`
  - Returns questions matching user's current level or specified level
- `POST /api/quiz/submit` - Submit answer (protected)
  - Awards XP based on difficulty and question level
  - Deducts 2 XP per hint used
- `GET /api/quiz/hint/:questionId` - Get hint for question (protected)

### Leaderboard
- `GET /api/leaderboard` - Get leaderboard (public)

### Stats
- `GET /api/stats` - Get user statistics (protected)

### Admin
- `GET /api/admin/questions` - Get all questions (admin only)
- `PUT /api/admin/questions/:id` - Update question (admin only)
- `DELETE /api/admin/questions/:id` - Delete question (admin only)
- `GET /api/admin/users` - Get all users (admin only)
- `PUT /api/admin/users/:id/role` - Update user role (admin only)
  - Setting role to 'admin' automatically grants 10000 XP and level 7

## Technologies Used

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **SQLite3** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing
- **OpenAI API** - AI question generation
- **Multer** - File uploads
- **CSV parser** - CSV processing

### Frontend
- **React 18** - UI library
- **React Router** - Routing
- **Axios** - HTTP client
- **Bootstrap 5** - CSS framework
- **React Context API** - State management

## Development

### Running Both Servers

In separate terminals:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm start
```

### Production Build

Build React App:
```bash
cd frontend
npm run build
```

The built files will be in `frontend/build/`. You can serve them with a static file server or configure Express to serve them.

### Database Schema

**User Table:**
- id, username, email, password_hash, total_xp, role, current_level, daily_streak, last_activity_date, created_at

**Question Table:**
- id, question_text, question_type, options, correct_answer, category, difficulty, hint, level_required, time_limit, created_by, created_at
- `level_required`: Integer indicating which level the question belongs to (1-7)
- Questions are filtered by `level_required` to match user progression

**User Progress Table:**
- id, user_id, question_id, answered_correctly, xp_earned, time_taken, hints_used, answered_at

**Level Table:**
- id, level_number, name, xp_required, description

## Notes

- The database is automatically created on first run
- JWT tokens expire after 24 hours
- The frontend proxy is configured to forward API requests to the backend
- Make sure to set your OpenAI API key in the backend `.env` file for AI question generation
- Admin role can be set manually in the database or via admin API endpoint
- Timer defaults to 5 minutes (300 seconds) per question
- Hint penalty: 2 XP deducted per hint used
- XP System: Designed so that approximately 10 questions unlock the next level
  - XP scales with level (Level 1: 10 XP, Level 2: 15 XP, Level 3: 25 XP, etc.)
  - Higher levels award more XP per question to maintain progression balance
- Questions are organized by `level_required` to ensure users progress through appropriate difficulty levels
- Admin users bypass all level restrictions and have full system access

## License

This project is developed for educational purposes as part of a Software Engineering course.
