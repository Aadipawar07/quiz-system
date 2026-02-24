import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminLogin.css';

const MAX_RETRIES = 3;
const RETRY_DELAY = 20; // seconds between retries

function sleep(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

function AdminLogin() {
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [status, setStatus]     = useState('');   // warm-up status message
  const [countdown, setCountdown] = useState(null);
  const countdownRef = useRef(null);

  const startCountdown = (seconds) =>
    new Promise((resolve) => {
      setCountdown(seconds);
      countdownRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownRef.current);
            setCountdown(null);
            resolve();
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setStatus('');

    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password.');
      return;
    }

    setLoading(true);

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        setStatus(attempt === 1 ? 'Connecting...' : `Retrying... (attempt ${attempt}/${MAX_RETRIES})`);
        const response = await api.post('/admin/login', { username, password });
        localStorage.setItem('adminToken', response.data.token);
        navigate('/admin', { replace: true });
        return; // success — exit
      } catch (err) {
        if (err.response) {
          // Server responded with an error (wrong credentials, 500, etc.) — don't retry
          setError(err.response.data?.message || 'Login failed. Please try again.');
          break;
        }
        // Network error (server sleeping / timeout)
        if (attempt < MAX_RETRIES) {
          setStatus(`Server is waking up... retrying in`);
          await startCountdown(RETRY_DELAY);
        } else {
          setError('Server is not responding. Please try again in a minute.');
        }
      }
    }

    setLoading(false);
    setStatus('');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🔐</div>
        <h1 className="login-title">Admin Login</h1>
        <p className="login-subtitle">Quiz Management System</p>

        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <div className="login-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              placeholder="Enter admin username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="login-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
            />
          </div>

          {error && <div className="login-error">⚠️ {error}</div>}

          {loading && status && (
            <div className="login-status">
              <span className="login-spinner">⏳</span>
              {status}
              {countdown !== null && <strong> {countdown}s</strong>}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? 'Please wait...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
