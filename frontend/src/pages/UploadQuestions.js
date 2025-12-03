import React, { useState } from 'react';
import axios from 'axios';

function UploadQuestions() {
  const [activeTab, setActiveTab] = useState('manual');
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: '',
    correct_answer: '',
    category: '',
    difficulty: '',
    options: ''
  });
  const [file, setFile] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const questionData = {
        ...formData,
        options: formData.options ? formData.options.split(',').map(opt => opt.trim()) : null
      };

      await axios.post('/api/questions', questionData);
      setMessage({ type: 'success', text: 'Question added successfully!' });
      setFormData({
        question_text: '',
        question_type: '',
        correct_answer: '',
        category: '',
        difficulty: '',
        options: ''
      });
    } catch (error) {
      setMessage({ type: 'danger', text: error.response?.data?.error || 'Failed to add question' });
    }
  };

  const handleFileSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!file) {
      setMessage({ type: 'danger', text: 'Please select a file' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/questions/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setMessage({ type: 'success', text: response.data.message });
      setFile(null);
    } catch (error) {
      setMessage({ type: 'danger', text: error.response?.data?.error || 'Failed to upload file' });
    }
  };

  return (
    <div className="container">
      <div className="main-content">
        <h2 className="mb-4"><i className="bi bi-cloud-upload"></i> Upload Questions</h2>
        
        {message.text && (
          <div className={`alert alert-${message.type}`}>{message.text}</div>
        )}

        <ul className="nav nav-tabs mb-4">
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              <i className="bi bi-pencil"></i> Manual Entry
            </button>
          </li>
          <li className="nav-item">
            <button
              className={`nav-link ${activeTab === 'csv' ? 'active' : ''}`}
              onClick={() => setActiveTab('csv')}
            >
              <i className="bi bi-file-earmark-spreadsheet"></i> CSV Upload
            </button>
          </li>
        </ul>

        {activeTab === 'manual' ? (
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-4">Add Question Manually</h5>
              <form onSubmit={handleManualSubmit}>
                <div className="mb-3">
                  <label className="form-label">Question Text *</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    required
                  />
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Question Type *</label>
                    <select
                      className="form-select"
                      value={formData.question_type}
                      onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                      required
                    >
                      <option value="">Select type...</option>
                      <option value="multiple_choice">Multiple Choice</option>
                      <option value="true_false">True/False</option>
                    </select>
                  </div>
                  
                  <div className="col-md-6 mb-3">
                    <label className="form-label">Difficulty *</label>
                    <select
                      className="form-select"
                      value={formData.difficulty}
                      onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                      required
                    >
                      <option value="">Select difficulty...</option>
                      <option value="easy">Easy (10 XP)</option>
                      <option value="medium">Medium (20 XP)</option>
                      <option value="hard">Hard (30 XP)</option>
                    </select>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Category *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., phishing, malware, social engineering"
                    required
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Options (for multiple choice, comma-separated)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.options}
                    onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                    placeholder="e.g., Option A, Option B, Option C, Option D"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Correct Answer *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formData.correct_answer}
                    onChange={(e) => setFormData({ ...formData, correct_answer: e.target.value })}
                    required
                  />
                </div>
                
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-plus-circle"></i> Add Question
                </button>
              </form>
            </div>
          </div>
        ) : (
          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-4">Upload Questions via CSV</h5>
              <form onSubmit={handleFileSubmit}>
                <div className="mb-3">
                  <label className="form-label">CSV File</label>
                  <input
                    type="file"
                    className="form-control"
                    accept=".csv"
                    onChange={(e) => setFile(e.target.files[0])}
                    required
                  />
                </div>
                
                <div className="alert alert-info">
                  <h6><i className="bi bi-info-circle"></i> CSV Format Requirements:</h6>
                  <p className="mb-0">Your CSV file must contain: question_text, question_type, correct_answer, category, difficulty, options</p>
                </div>
                
                <button type="submit" className="btn btn-primary">
                  <i className="bi bi-upload"></i> Upload CSV
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default UploadQuestions;

