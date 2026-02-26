import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ResultPage.css';

function ResultPage() {
  const { state } = useLocation();
  const navigate  = useNavigate();

  // Guard: no data → back to home
  useEffect(() => {
    if (!state) {
      navigate('/', { replace: true });
    }
  }, [state, navigate]);

  if (!state) return null;

  const {
    roundName,
    score,
    correct,
    attempted,
    totalQuestions,
    percentage,
    timeTaken,
    terminated,
  } = state;

  const handleGoHome = () => {
    localStorage.removeItem('attemptId');
    localStorage.removeItem('studentName');
    localStorage.removeItem('tokenNo');
    navigate('/', { replace: true });
  };

  const formatTime = (secs) => {
    if (secs == null) return '—';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div className="result-page">
      <div className="result-card">

        {terminated && (
          <div className="result-terminated">
            ⚠️ Quiz Terminated Due to Violations
          </div>
        )}

        <h1 className="result-heading">
          {terminated ? '❌ Quiz Ended' : '✅ Quiz Submitted'}
        </h1>

        {roundName && (
          <p className="result-round">{roundName}</p>
        )}

        <div className="result-grid">
          <div className="result-stat">
            <span className="stat-label">Score</span>
            <span className="stat-value">{score}</span>
          </div>
          <div className="result-stat">
            <span className="stat-label">Correct</span>
            <span className="stat-value">{correct}</span>
          </div>
          <div className="result-stat">
            <span className="stat-label">Attempted</span>
            <span className="stat-value">{attempted} / {totalQuestions}</span>
          </div>
          <div className="result-stat">
            <span className="stat-label">Percentage</span>
            <span className="stat-value">{percentage}%</span>
          </div>
          <div className="result-stat">
            <span className="stat-label">Time Taken</span>
            <span className="stat-value">{formatTime(timeTaken)}</span>
          </div>
        </div>

        <button className="result-home-btn" onClick={handleGoHome}>
          🏠 Go to Home
        </button>
      </div>
    </div>
  );
}

export default ResultPage;
