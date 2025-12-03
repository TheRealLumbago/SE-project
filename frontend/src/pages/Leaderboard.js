import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function Leaderboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      const response = await axios.get('/api/leaderboard');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBadge = (xp) => {
    if (xp >= 1000) return { text: 'Master', class: 'bg-danger' };
    if (xp >= 500) return { text: 'Expert', class: 'bg-warning' };
    if (xp >= 200) return { text: 'Advanced', class: 'bg-info' };
    if (xp >= 50) return { text: 'Intermediate', class: 'bg-success' };
    return { text: 'Beginner', class: 'bg-secondary' };
  };

  if (loading) {
    return (
      <div className="container">
        <div className="main-content text-center">
          <div className="loading"></div>
          <p className="mt-3">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="main-content">
        <h2 className="mb-4"><i className="bi bi-trophy"></i> Leaderboard</h2>
        
        {users.length > 0 ? (
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Username</th>
                  <th>Total XP</th>
                  <th>Badge</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, index) => {
                  const badge = getBadge(u.total_xp);
                  const isCurrentUser = user && u.id === user.id;
                  return (
                    <tr key={u.id} className={isCurrentUser ? 'table-primary' : ''}>
                      <td>
                        {index === 0 && <i className="bi bi-trophy-fill text-warning"></i>}
                        {index === 1 && <i className="bi bi-trophy-fill text-secondary"></i>}
                        {index === 2 && <i className="bi bi-trophy-fill text-danger"></i>}
                        {' '}{index + 1}
                      </td>
                      <td>
                        {isCurrentUser ? <strong>{u.username} (You)</strong> : u.username}
                      </td>
                      <td><span className="badge bg-primary">{u.total_xp} XP</span></td>
                      <td><span className={`badge ${badge.class}`}>{badge.text}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted">No users found. Be the first to take a quiz!</p>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;

