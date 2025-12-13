import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

function Quiz() {
  const [question, setQuestion] = useState(null);
  const [answer, setAnswer] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);
  const [hint, setHint] = useState(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser, user } = useAuth();
  const { success, error, warning } = useToast();
  const [questionNumber, setQuestionNumber] = useState(1);

  useEffect(() => {
    setQuestionNumber(1); // Reset question number when params change
    fetchQuestion();
  }, [searchParams]);

  useEffect(() => {
    if (question && question.time_limit && !result) {
      // Cap timer at 30 seconds maximum
      const timeLimit = Math.min(question.time_limit || 30, 30);
      setTimeLeft(timeLimit);
      setStartTime(Date.now());
      setHintsUsed(0);
      setHint(null);
      
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [question, result]);

  useEffect(() => {
    if (startTime && !result) {
      const interval = setInterval(() => {
        setTimeTaken(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, result]);

  const fetchQuestion = async () => {
    setLoading(true);
    try {
      const level = searchParams.get('level');
      // Only use difficulty if not starting a specific level
      const difficulty = level ? null : (searchParams.get('difficulty') || 'medium');
      const category = searchParams.get('category');
      const useOpenai = searchParams.get('use_openai') === 'true';

      if (useOpenai) {
        // Generate AI question
        await axios.post('/api/questions/generate', { difficulty: difficulty || 'medium', topic: category });
      }

      // Build params object, only include difficulty if not null
      const params = { category, level };
      if (difficulty) {
        params.difficulty = difficulty;
      }

      const response = await axios.get('/api/quiz', { params });
      
      // Double check question type - reject short_answer or any unsupported types
      if (response.data.question) {
        const qType = response.data.question.question_type;
        if (qType !== 'multiple_choice' && qType !== 'true_false') {
          console.warn('Unsupported question type detected:', qType);
          // Try fetching another question
          setTimeout(() => fetchQuestion(), 1000);
          return;
        }
        setQuestion(response.data.question);
      setQuestionNumber(prev => prev + 1);
      } else {
        throw new Error('No question received');
      }
      setAnswer('');
      setResult(null);
      setHint(null);
      setHintsUsed(0);
    } catch (error) {
      console.error('Error fetching question:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to load question';
      
      if (error.response?.status === 404 && errorMessage.includes('No questions available')) {
        setQuestion(null);
        setResult({ noQuestions: true, message: errorMessage });
      } else {
        alert(errorMessage);
        // Try to fetch another question if this one failed
        if (question) {
          setTimeout(() => fetchQuestion(), 2000);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e, timeUp = false) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      const finalTimeTaken = timeTaken || Math.floor((Date.now() - startTime) / 1000);
      
      const response = await axios.post('/api/quiz/submit', {
        question_id: question.id,
        answer: answer || '',
        time_taken: finalTimeTaken,
        hints_used: hintsUsed
      });

      setResult(response.data);
      
      // Show feedback messages
      if (response.data.is_correct) {
        success(`Correct! You earned ${response.data.xp_earned} XP!`);
        if (response.data.level_up) {
          success(`🎉 Level Up! You've reached Level ${response.data.current_level}!`, 5000);
        }
      } else {
        error(`Incorrect! The correct answer was: ${response.data.correct_answer}`);
      }
      
      // Refresh user data to update XP in navbar
      if (response.data.total_xp !== undefined) {
        await refreshUser();
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      alert(error.response?.data?.error || 'Failed to submit answer');
    } finally {
      setLoading(false);
    }
  };

  const handleTimeUp = async () => {
    if (!answer && question) {
      warning('Time is up! Submitting empty answer...');
      await handleSubmit(null, true);
    }
  };

  const handleGetHint = async () => {
    if (!question || hint) return;
    
    try {
      const response = await axios.get(`/api/quiz/hint/${question.id}`);
      setHint(response.data.hint);
      setHintsUsed(prev => prev + 1);
      warning('Hint used! -2 XP will be deducted from your score.', 3000);
    } catch (err) {
      error(err.response?.data?.error || 'Failed to get hint');
    }
  };

  if (loading && !question) {
    return (
      <div className="container">
        <div className="main-content text-center">
          <div className="loading"></div>
          <p className="mt-3">Loading question...</p>
        </div>
      </div>
    );
  }

  if (result) {
    // Check if no questions available
    if (result.noQuestions) {
      return (
        <div className="container">
          <div className="main-content">
            <div className="card">
              <div className="card-body text-center">
                <i className="bi bi-inbox" style={{ fontSize: '5rem', color: '#6c757d' }}></i>
                <h2 className="mt-3 text-muted">No Questions Available</h2>
                <p className="text-muted mb-4">
                  {result.message || 'There are no questions available at the moment. Please try again later or upload some questions.'}
                </p>
                <div className="d-grid gap-2 d-md-block">
                  <button onClick={() => navigate('/upload')} className="btn btn-primary btn-lg me-2">
                    <i className="bi bi-upload"></i> Upload Questions
                  </button>
                  <button onClick={() => navigate('/dashboard')} className="btn btn-outline-secondary btn-lg">
                    <i className="bi bi-house"></i> Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="container">
        <div className="main-content">
          <div className="card">
            <div className="card-body text-center">
              {result.is_correct ? (
                <>
                  <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '5rem' }}></i>
                  <h2 className="text-success mt-3">Correct!</h2>
                  {result.level_up && (
                    <div className="alert alert-info">
                      <h4><i className="bi bi-trophy-fill"></i> Level Up! You've reached a new level!</h4>
                    </div>
                  )}
                  <div className="alert alert-success">
                    <h4><i className="bi bi-star-fill"></i> You earned {result.xp_earned} XP!</h4>
                    <p>Total XP: {result.total_xp}</p>
                    {result.daily_streak > 0 && (
                      <p><i className="bi bi-fire"></i> Daily Streak: {result.daily_streak} days</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <i className="bi bi-x-circle-fill text-danger" style={{ fontSize: '5rem' }}></i>
                  <h2 className="text-danger mt-3">Incorrect</h2>
                  <div className="alert alert-danger">
                    <p><strong>Your answer:</strong> {answer}</p>
                    <p><strong>Correct answer:</strong> {result.correct_answer}</p>
                  </div>
                </>
              )}
              <div className="mt-4">
                <button onClick={() => { setResult(null); fetchQuestion(); }} className="btn btn-primary btn-lg me-2">
                  Next Question
                </button>
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline-secondary btn-lg">
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Safety check: reject short_answer questions
  if (question && question.question_type !== 'multiple_choice' && question.question_type !== 'true_false') {
    return (
      <div className="container">
        <div className="main-content">
          <div className="alert alert-warning">
            <h4><i className="bi bi-exclamation-triangle"></i> Unsupported Question Type</h4>
            <p>This question type is not supported. Please try another question.</p>
            <button onClick={fetchQuestion} className="btn btn-primary">
              <i className="bi bi-arrow-clockwise"></i> Get New Question
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!question && !loading) {
    return (
      <div className="container">
        <div className="main-content">
          <div className="card">
            <div className="card-body text-center">
              <i className="bi bi-inbox" style={{ fontSize: '5rem', color: '#6c757d' }}></i>
              <h2 className="mt-3 text-muted">No Questions Available</h2>
              <p className="text-muted mb-4">
                There are no questions available at the moment. Please try again later or upload some questions.
              </p>
              <div className="d-grid gap-2 d-md-block">
                <button onClick={() => navigate('/upload')} className="btn btn-primary btn-lg me-2">
                  <i className="bi bi-upload"></i> Upload Questions
                </button>
                <button onClick={() => navigate('/dashboard')} className="btn btn-outline-secondary btn-lg">
                  <i className="bi bi-house"></i> Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="main-content">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="mb-0"><i className="bi bi-question-circle"></i> CyberEscapeRoom</h2>
          <div className="d-flex align-items-center gap-3">
            <div className="text-end">
              <div className="text-muted small">Question</div>
              <div className="fw-bold">#{questionNumber}</div>
            </div>
            {user && (
              <div className="text-end">
                <div className="text-muted small">Your Level</div>
                <div className="fw-bold">Level {user.current_level || 1}</div>
              </div>
            )}
          </div>
        </div>
        
        <div className="card mb-3">
          <div className="card-header">
            <div className="row align-items-center">
              <div className="col-md-6">
                <span className="badge bg-info me-2">{question.category}</span>
                <span className={`badge bg-${question.difficulty === 'easy' ? 'success' : question.difficulty === 'medium' ? 'warning' : 'danger'} me-2`}>
                  {question.difficulty}
                </span>
                {question.level_required > 1 && (
                  <span className="badge bg-secondary">Level {question.level_required}+</span>
                )}
              </div>
              <div className="col-md-6 text-end">
                {timeLeft !== null && (
                  <span className={`badge ${timeLeft <= 30 ? 'bg-danger' : timeLeft <= 60 ? 'bg-warning' : 'bg-info'} me-2`} style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                    <i className="bi bi-clock"></i> {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </span>
                )}
                <span className="badge bg-primary" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>
                  {question.difficulty === 'easy' ? '10' : question.difficulty === 'medium' ? '20' : '30'} XP
                </span>
              </div>
            </div>
          </div>
          <div className="card-body">
            <div className="puzzle-display-area mb-4 p-4" style={{ 
              background: 'rgba(102, 126, 234, 0.1)', 
              borderRadius: '12px',
              border: '1px solid rgba(102, 126, 234, 0.3)',
              minHeight: '100px'
            }}>
              <h5 className="card-title mb-0">{question.question_text}</h5>
            </div>
            
            {hint && (
              <div className="alert alert-info mb-3">
                <i className="bi bi-lightbulb"></i> <strong>Hint:</strong> {hint}
                <small className="d-block mt-1 text-muted">(-{hintsUsed * 2} XP penalty)</small>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              {question.question_type === 'multiple_choice' && question.options ? (
                question.options.map((option, index) => (
                  <div key={index} className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="answer"
                      id={`option${index}`}
                      value={option}
                      checked={answer === option}
                      onChange={(e) => setAnswer(e.target.value)}
                      required
                    />
                    <label className="form-check-label" htmlFor={`option${index}`}>
                      {option}
                    </label>
                  </div>
                ))
              ) : question.question_type === 'true_false' ? (
                <>
                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="answer"
                      id="true"
                      value="True"
                      checked={answer === 'True'}
                      onChange={(e) => setAnswer(e.target.value)}
                      required
                    />
                    <label className="form-check-label" htmlFor="true">True</label>
                  </div>
                  <div className="form-check mb-3">
                    <input
                      className="form-check-input"
                      type="radio"
                      name="answer"
                      id="false"
                      value="False"
                      checked={answer === 'False'}
                      onChange={(e) => setAnswer(e.target.value)}
                      required
                    />
                    <label className="form-check-label" htmlFor="false">False</label>
                  </div>
                </>
              ) : (
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle"></i> Unsupported question type. Please select a different question.
                </div>
              )}
              
              <div className="d-grid gap-2">
                {question.hint && !hint && (
                  <button type="button" onClick={handleGetHint} className="btn btn-outline-warning mb-2">
                    <i className="bi bi-lightbulb"></i> Get Hint (-2 XP)
                  </button>
                )}
                <button type="submit" className="btn btn-primary btn-lg" disabled={loading || (timeLeft !== null && timeLeft === 0)}>
                  {loading ? 'Submitting...' : timeLeft === 0 ? 'Time Up!' : 'Submit Answer'}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div className="text-center">
          <button onClick={fetchQuestion} className="btn btn-outline-secondary me-2">
            <i className="bi bi-arrow-clockwise"></i> Get New Question
          </button>
          <button onClick={() => navigate('/quiz?use_openai=true')} className="btn btn-outline-primary">
            <i className="bi bi-magic"></i> Generate with AI
          </button>
        </div>
      </div>
    </div>
  );
}

export default Quiz;

