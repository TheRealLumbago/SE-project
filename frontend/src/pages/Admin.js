import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

function Admin() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('questions');
  const [editingQuestion, setEditingQuestion] = useState(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchData();
    }
  }, [user, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'questions') {
        const response = await axios.get('/api/admin/questions');
        setQuestions(response.data.questions);
      } else {
        const response = await axios.get('/api/admin/users');
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      alert(error.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;

    try {
      await axios.delete(`/api/admin/questions/${id}`);
      fetchData();
      alert('Question deleted successfully');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete question');
    }
  };

  const handleUpdateUserRole = async (userId, newRole) => {
    try {
      await axios.put(`/api/admin/users/${userId}/role`, { role: newRole });
      fetchData();
      alert('User role updated successfully');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to delete user "${username}"? This will also delete all their progress and questions. This action cannot be undone!`)) {
      return;
    }

    try {
      await axios.delete(`/api/admin/users/${userId}`);
      fetchData();
      alert('User deleted successfully');
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to delete user');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="container">
        <div className="main-content">
          <div className="alert alert-danger">
            <h4>Access Denied</h4>
            <p>You need admin privileges to access this page.</p>
          </div>
        </div>
      </div>
    );
  }

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
          <h2 className="mb-4"><i className="bi bi-shield-lock"></i> Admin Panel</h2>
          
          <div className="alert alert-info mb-4">
            <i className="bi bi-info-circle"></i> <strong>Admin Controls:</strong> Manage questions and user accounts. 
            Deleting a user will also remove all their progress and questions. You cannot delete your own account.
          </div>

          <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'questions' ? 'active' : ''}`}
              onClick={() => setActiveTab('questions')}
            >
              Questions Management
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              User Management
            </button>
          </li>
        </ul>

        {activeTab === 'questions' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>All Questions ({questions.length})</h4>
              <button className="btn btn-sm btn-secondary" onClick={fetchData} title="Refresh">
                <i className="bi bi-arrow-clockwise"></i> Refresh
              </button>
            </div>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Question</th>
                    <th>Category</th>
                    <th>Difficulty</th>
                    <th>Level Req.</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {questions.map((q) => (
                    <tr key={q.id}>
                      <td>{q.id}</td>
                      <td>{q.question_text.substring(0, 50)}...</td>
                      <td><span className="badge bg-info">{q.category}</span></td>
                      <td>
                        <span className={`badge bg-${q.difficulty === 'easy' ? 'success' : q.difficulty === 'medium' ? 'warning' : 'danger'}`}>
                          {q.difficulty}
                        </span>
                      </td>
                      <td>{q.level_required || 1}</td>
                      <td>{q.question_type}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDeleteQuestion(q.id)}
                          title="Delete Question"
                        >
                          <i className="bi bi-trash"></i> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>All Users ({users.length})</h4>
              <button className="btn btn-sm btn-secondary" onClick={fetchData} title="Refresh">
                <i className="bi bi-arrow-clockwise"></i> Refresh
              </button>
            </div>
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Total XP</th>
                    <th>Level</th>
                    <th>Streak</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>{u.id}</td>
                      <td>{u.username}</td>
                      <td>{u.email}</td>
                      <td>{u.total_xp}</td>
                      <td>{u.current_level || 1}</td>
                      <td>{u.daily_streak || 0}</td>
                      <td>
                        <span className={`badge bg-${u.role === 'admin' ? 'danger' : u.role === 'instructor' ? 'warning' : 'primary'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <div className="d-flex gap-2 align-items-center">
                          <select
                            className="form-select form-select-sm"
                            style={{ width: '120px' }}
                            value={u.role}
                            onChange={(e) => handleUpdateUserRole(u.id, e.target.value)}
                          >
                            <option value="learner">Learner</option>
                            <option value="instructor">Instructor</option>
                            <option value="admin">Admin</option>
                          </select>
                          {u.id !== user.id && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                              title="Delete User"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          )}
                          {u.id === user.id && (
                            <span className="badge bg-secondary" title="Cannot delete your own account">
                              You
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Admin;

