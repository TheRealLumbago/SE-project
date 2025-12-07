import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';

function Levels() {
  const { user } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();
  const [levels, setLevels] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    try {
      const response = await axios.get('/api/levels');
      setLevels(response.data.levels);
    } catch (err) {
      console.error('Error fetching levels:', err);
      error('Failed to load levels');
    } finally {
      setLoading(false);
    }
  };

  const handleLevelClick = (level) => {
    if (!level.is_unlocked) {
      error(`Level ${level.level_number} is locked. You need ${level.xp_required} XP to unlock it.`);
      return;
    }
    success(`Starting Level ${level.level_number}: ${level.name}`);
    navigate(`/quiz?level=${level.level_number}`);
  };

  const getDifficultyColor = (levelNumber) => {
    if (levelNumber <= 2) return 'success';
    if (levelNumber <= 4) return 'warning';
    if (levelNumber <= 6) return 'danger';
    return 'primary';
  };

  if (loading) {
    return (
      <div className="container">
        <div className="main-content text-center">
          <div className="loading"></div>
          <p className="mt-3">Loading levels...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="main-content">
        <h2 className="mb-4">
          <i className="bi bi-layers"></i> Level Selection
        </h2>
        <p className="text-muted mb-4">
          Select a level to start your cybersecurity challenge. Unlock new levels by earning XP!
        </p>

        <div className="row g-4">
          {levels.map((level) => (
            <div key={level.id} className="col-md-6 col-lg-4">
              <div
                className={`card level-card ${!level.is_unlocked ? 'level-locked' : ''} ${
                  level.is_current_level ? 'level-current' : ''
                }`}
                onClick={() => handleLevelClick(level)}
                style={{ cursor: level.is_unlocked ? 'pointer' : 'not-allowed' }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h4 className="card-title mb-1">
                        Level {level.level_number}
                        {level.is_current_level && (
                          <span className="badge bg-primary ms-2">Current</span>
                        )}
                      </h4>
                      <h5 className="text-muted">{level.name}</h5>
                    </div>
                    {!level.is_unlocked && (
                      <i className="bi bi-lock-fill" style={{ fontSize: '2rem', color: '#6c757d' }}></i>
                    )}
                    {level.is_unlocked && (
                      <i className="bi bi-unlock-fill" style={{ fontSize: '2rem', color: '#28a745' }}></i>
                    )}
                  </div>

                  <p className="card-text mb-3">{level.description}</p>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between mb-1">
                      <small className="text-muted">XP Required</small>
                      <small className="text-muted">{level.xp_required} XP</small>
                    </div>
                    {!level.is_unlocked && (
                      <div className="progress" style={{ height: '8px' }}>
                        <div
                          className={`progress-bar bg-${getDifficultyColor(level.level_number)}`}
                          role="progressbar"
                          style={{ width: `${level.xp_progress}%` }}
                        ></div>
                      </div>
                    )}
                  </div>

                  <div className="d-flex justify-content-between align-items-center">
                    <span className="badge bg-info">
                      <i className="bi bi-question-circle"></i> {level.question_count} Questions
                    </span>
                    {level.is_unlocked ? (
                      <button className="btn btn-primary btn-sm">
                        Start Level <i className="bi bi-arrow-right"></i>
                      </button>
                    ) : (
                      <span className="text-muted">
                        {level.xp_required - (user?.total_xp || 0)} XP needed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Levels;

