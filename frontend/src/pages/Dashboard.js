import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentProgress, setRecentProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/stats');
      setStats(response.data.stats);
      setRecentProgress(response.data.recent_progress);
      
      // Refresh user data to ensure XP is up to date
      await refreshUser();
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="main-content text-center">
          <div className="loading"></div>
          <p className="mt-3">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="main-content">
        <h2 className="mb-4"><i className="bi bi-speedometer2"></i> Welcome, {user.username}!</h2>
        
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="card-title"><i className="bi bi-star-fill text-warning"></i></h3>
                <h2 className="card-text">{stats?.total_xp || 0}</h2>
                <p className="text-muted">Total XP</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="card-title"><i className="bi bi-trophy text-success"></i></h3>
                <h2 className="card-text">{stats?.correct_answers || 0}</h2>
                <p className="text-muted">Correct Answers</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="card-title"><i className="bi bi-award text-primary"></i></h3>
                <h2 className="card-text">Level {stats?.current_level || 1}</h2>
                <p className="text-muted">{stats?.level_info?.name || 'Beginner'}</p>
                {stats?.xp_to_next_level !== null && stats.xp_to_next_level > 0 ? (
                  <>
                    <div className="progress mt-2 mb-2" style={{ height: '20px' }}>
                      <div 
                        className="progress-bar bg-primary" 
                        role="progressbar" 
                        style={{ 
                          width: `${Math.min(100, ((stats?.total_xp || 0) - (stats?.level_info?.xp_required || 0)) / (stats?.next_level?.xp_required - (stats?.level_info?.xp_required || 0)) * 100)}%` 
                        }}
                      >
                      </div>
                    </div>
                    <small className="text-primary fw-bold">
                      <i className="bi bi-star"></i> {stats.xp_to_next_level} XP needed for Level {stats.next_level?.level_number || stats.current_level + 1}
                    </small>
                  </>
                ) : stats?.xp_to_next_level === 0 ? (
                  <small className="text-success fw-bold">
                    <i className="bi bi-check-circle"></i> Max Level Reached!
                  </small>
                ) : (
                  <small className="text-muted">Level up by earning XP</small>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h3 className="card-title"><i className="bi bi-fire text-danger"></i></h3>
                <h2 className="card-text">{stats?.daily_streak || 0}</h2>
                <p className="text-muted">Day Streak</p>
              </div>
            </div>
          </div>
        </div>

        <div className="d-grid gap-2 mb-4">
          <Link to="/quiz" className="btn btn-primary btn-lg">
            <i className="bi bi-play-circle"></i> Start Quiz
          </Link>
        </div>

        <h4 className="mb-3">Recent Activity</h4>
        {recentProgress.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped">
              <thead>
                <tr>
                  <th>Question</th>
                  <th>Result</th>
                  <th>XP Earned</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentProgress.map((progress) => (
                  <tr key={progress.id}>
                    <td>{progress.question_text}</td>
                    <td>
                      {progress.answered_correctly ? (
                        <span className="badge bg-success">Correct</span>
                      ) : (
                        <span className="badge bg-danger">Incorrect</span>
                      )}
                    </td>
                    <td>{progress.xp_earned} XP</td>
                    <td>{new Date(progress.answered_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">No activity yet. Start taking quizzes to earn XP!</p>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

