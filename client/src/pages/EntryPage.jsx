import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './EntryPage.css';

function EntryPage() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [tokenNo, setTokenNo] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!name.trim()) {
      setError('Please enter your name.');
      return false;
    }
    if (!tokenNo.trim()) {
      setError('Please enter your token number.');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!validate()) return;

    setLoading(true);
    try {
      const response = await api.post('/quiz/start', {
        name: name.trim(),
        tokenNo: tokenNo.trim()
      });

      const { attemptId } = response.data;
      localStorage.setItem('attemptId', attemptId);
      localStorage.setItem('studentName', name.trim());
      localStorage.setItem('tokenNo', tokenNo.trim());

      navigate('/quiz');
    } catch (err) {
      const message =
        err.response?.data?.message || 'Something went wrong. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="entry-page">
      <div className="entry-card">
        <div className="entry-header">
          <h1>🎯 Quiz System</h1>
          <p>Enter your details to begin the quiz</p>
        </div>

        <form className="entry-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="tokenNo">Token Number</label>
            <input
              id="tokenNo"
              type="text"
              placeholder="Enter your token number"
              value={tokenNo}
              onChange={(e) => setTokenNo(e.target.value)}
              disabled={loading}
              autoComplete="off"
            />
          </div>

          {error && (
            <div className="error-message" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? (
              <span className="btn-loading">
                <span className="spinner" />
                Starting...
              </span>
            ) : (
              'Start Quiz'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default EntryPage;
