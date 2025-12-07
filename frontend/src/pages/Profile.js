import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

function Profile() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentProgress, setRecentProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/stats');
      setStats(response.data.stats);
      setRecentProgress(response.data.recent_progress);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadge = (xp) => {
    if (xp >= 3500) return { name: 'Grandmaster', icon: '👑', color: 'danger' };
    if (xp >= 2000) return { name: 'Master', icon: '🏆', color: 'warning' };
    if (xp >= 1000) return { name: 'Expert', icon: '⭐', color: 'info' };
    if (xp >= 500) return { name: 'Advanced', icon: '🎯', color: 'success' };
    if (xp >= 250) return { name: 'Intermediate', icon: '📚', color: 'primary' };
    if (xp >= 100) return { name: 'Novice', icon: '🌱', color: 'secondary' };
    return { name: 'Beginner', icon: '🌱', color: 'secondary' };
  };

  const getStreakBadge = (streak) => {
    if (streak >= 30) return { name: 'Fire Master', icon: '🔥🔥🔥', color: 'danger' };
    if (streak >= 14) return { name: 'Consistent', icon: '🔥🔥', color: 'warning' };
    if (streak >= 7) return { name: 'Week Warrior', icon: '🔥', color: 'info' };
    if (streak >= 3) return { name: 'Getting Started', icon: '✨', color: 'success' };
    return null;
  };

  if (loading) {
    return (
      <div className="container">
        <div className="main-content text-center">
          <div className="loading"></div>
          <p className="mt-3">Loading profile...</p>
        </div>
      </div>
    );
  }

  const badge = getBadge(user?.total_xp || 0);
  const streakBadge = getStreakBadge(stats?.daily_streak || 0);

  return (
    <div className="container">
      <div className="main-content">
        <h2 className="mb-4">
          <i className="bi bi-person-circle"></i> Profile
        </h2>

        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card text-center">
              <div className="card-body">
                <div className="mb-3" style={{ fontSize: '3rem', lineHeight: '1', minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {badge.icon}
                </div>
                <h3 className="card-title">{user?.username}</h3>
                <p className="text-muted">{user?.email}</p>
                <span className={`badge bg-${badge.color} fs-6`} style={{ padding: '0.5rem 1rem' }}>
                  {badge.name}
                </span>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            <div className="card">
              <div className="card-body">
                <h4 className="card-title mb-3">Statistics</h4>
                <div className="row">
                  <div className="col-6 mb-3">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-star-fill text-warning me-2" style={{ fontSize: '1.5rem' }}></i>
                      <div>
                        <div className="fw-bold">{stats?.total_xp || 0}</div>
                        <small className="text-muted">Total XP</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-trophy-fill text-success me-2" style={{ fontSize: '1.5rem' }}></i>
                      <div>
                        <div className="fw-bold">{stats?.correct_answers || 0}</div>
                        <small className="text-muted">Correct Answers</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-check-circle-fill text-primary me-2" style={{ fontSize: '1.5rem' }}></i>
                      <div>
                        <div className="fw-bold">{stats?.accuracy || 0}%</div>
                        <small className="text-muted">Accuracy</small>
                      </div>
                    </div>
                  </div>
                  <div className="col-6 mb-3">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-fire text-danger me-2" style={{ fontSize: '1.5rem' }}></i>
                      <div>
                        <div className="fw-bold">{stats?.daily_streak || 0}</div>
                        <small className="text-muted">Day Streak</small>
                      </div>
                    </div>
                  </div>
                </div>

                {streakBadge && (
                  <div className="mt-3">
                    <span className={`badge bg-${streakBadge.color} fs-6`}>
                      {streakBadge.icon} {streakBadge.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Level Progress</h5>
                <div className="mb-2">
                  <div className="d-flex justify-content-between">
                    <span>Current Level</span>
                    <strong>Level {stats?.current_level || 1}</strong>
                  </div>
                  <div className="progress mt-2" style={{ height: '20px' }}>
                    <div
                      className="progress-bar bg-primary"
                      role="progressbar"
                      style={{
                        width: `${Math.min(
                          100,
                          ((stats?.total_xp || 0) - (stats?.level_info?.xp_required || 0)) /
                            ((stats?.next_level?.xp_required || 1) - (stats?.level_info?.xp_required || 0)) *
                            100
                        )}%`
                      }}
                    >
                      {stats?.xp_to_next_level > 0 && (
                        <small>{stats.xp_to_next_level} XP to next level</small>
                      )}
                    </div>
                  </div>
                </div>
                {stats?.next_level && (
                  <small className="text-muted">
                    Next: Level {stats.next_level.level_number} - {stats.next_level.name} ({stats.next_level.xp_required} XP)
                  </small>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Quick Actions</h5>
                <div className="d-grid gap-2">
                  <Link to="/quiz" className="btn btn-primary">
                    <i className="bi bi-play-circle"></i> Start Quiz
                  </Link>
                  <Link to="/levels" className="btn btn-outline-primary">
                    <i className="bi bi-layers"></i> View Levels
                  </Link>
                  <Link to="/leaderboard" className="btn btn-outline-secondary">
                    <i className="bi bi-trophy"></i> Leaderboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-body">
            <h5 className="card-title mb-3">Recent Activity</h5>
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
              <p className="text-muted">No activity yet. Start taking quizzes to see your progress!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;

