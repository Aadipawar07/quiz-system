import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './QuizPage.css';

const MAX_VIOLATIONS = 3;
const VIOLATION_COOLDOWN_MS = 1000; // 1-second cooldown to prevent double-counting co-firing events

function formatTime(seconds) {
  if (seconds === null) return '--:--';
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${m}:${s}`;
}

function QuizPage() {
  const navigate = useNavigate();

  const [questions, setQuestions]             = useState([]);
  const [currentIndex, setCurrentIndex]       = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [roundName, setRoundName]             = useState('');
  const [timeLeft, setTimeLeft]               = useState(null);  // null until backend responds
  const [loading, setLoading]                 = useState(true);
  const [submitting, setSubmitting]           = useState(false);
  const [fetchError, setFetchError]           = useState('');
  const [violationCount, setViolationCount]   = useState(0);

  // â”€â”€ Refs (usable in event callbacks without stale closures) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const hasSubmitted        = useRef(false);
  const intervalRef         = useRef(null);
  const violationCountRef   = useRef(0);   // mirrors violationCount state
  const selectedAnswersRef  = useRef({});  // mirrors selectedAnswers state
  const lastViolationTime   = useRef(0);   // for debouncing rapid events

  // Keep refs in sync with state
  useEffect(() => { violationCountRef.current  = violationCount;  }, [violationCount]);
  useEffect(() => { selectedAnswersRef.current = selectedAnswers; }, [selectedAnswers]);

  // â”€â”€ Guard: redirect if no session â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!localStorage.getItem('attemptId')) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // â”€â”€ Fetch questions â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await api.get('/quiz/questions');
        setQuestions(response.data.questions);
        setRoundName(response.data.roundName || '');
        setTimeLeft(response.data.duration * 60);
      } catch (err) {
        setFetchError(err.response?.data?.message || 'Failed to load questions. Please refresh.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, []);

  // â”€â”€ Core submit (stable â€” only navigate in deps) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const submitQuiz = useCallback(async ({ isTerminated = false } = {}) => {
    if (hasSubmitted.current) return;
    hasSubmitted.current = true;

    clearInterval(intervalRef.current);
    setSubmitting(true);

    // Exit fullscreen cleanly before alert
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    const name    = localStorage.getItem('studentName') || '';
    const rollNo  = localStorage.getItem('rollNo')      || '';
    const answers = Object.entries(selectedAnswersRef.current).map(
      ([questionId, selectedOption]) => ({ questionId, selectedOption })
    );

    try {
      const response = await api.post('/quiz/submit', {
        name,
        rollNo,
        answers,
        terminated:     isTerminated,
        violationCount: violationCountRef.current
      });

      // Clear session keys — result page handles the redirect
      localStorage.removeItem('attemptId');
      localStorage.removeItem('studentName');
      localStorage.removeItem('rollNo');

      navigate('/result', {
        replace: true,
        state: {
          roundName:      response.data.roundName,
          score:          response.data.score,
          correct:        response.data.correct,
          attempted:      response.data.attempted,
          totalQuestions: response.data.totalQuestions,
          percentage:     response.data.percentage,
          timeTaken:      response.data.timeTaken,
          terminated:     response.data.terminated,
        },
      });
    } catch (err) {
      const message = err.response?.data?.message || 'Submission failed. Please try again.';
      alert(`Error: ${message}`);
      // Allow retry
      hasSubmitted.current = false;
      setSubmitting(false);
    }
  }, [navigate]);

  // ── Centralized violation handler (stable ref via useCallback) ──────────────
  // Called by all three anti-cheat listeners; single source of truth for
  // violation counting, warning alerts, and auto-termination.
  const handleViolation = useCallback(() => {
    if (hasSubmitted.current) return;

    // 1-second cooldown: blur + visibilitychange can fire simultaneously
    const now = Date.now();
    if (now - lastViolationTime.current < VIOLATION_COOLDOWN_MS) return;
    lastViolationTime.current = now;

    const newCount = violationCountRef.current + 1;
    violationCountRef.current = newCount;
    setViolationCount(newCount);

    if (newCount >= MAX_VIOLATIONS) {
      alert(
        '🚫 Quiz Terminated!\n\n' +
        'You switched tabs, minimized the window, or exited fullscreen too many times.'
      );
      submitQuiz({ isTerminated: true });
      return;
    }

    const remaining = MAX_VIOLATIONS - newCount;
    alert(
      `⚠️ Violation ${newCount} of ${MAX_VIOLATIONS - 1} detected!\n\n` +
      `Do not switch tabs, minimize the window, or exit fullscreen.\n\n` +
      `${remaining} more violation(s) will automatically terminate your quiz.`
    );
  }, [submitQuiz]);

  // ── Request fullscreen when questions load ──────────────────────────────────
  useEffect(() => {
    if (loading || questions.length === 0) return;

    document.documentElement.requestFullscreen().catch(() => {
      alert('Please allow fullscreen to continue the quiz.');
    });
  }, [loading, questions.length]);

  // â”€â”€ Anti-cheat event listeners â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (loading || questions.length === 0) return;

    // window blur   → Alt+Tab / minimize / click another app / switch desktop
    const onBlur             = () =>                                      handleViolation();
    // visibilitychange → browser tab switching
    const onVisibilityChange = () => { if (document.hidden)              handleViolation(); };
    // fullscreenchange → Esc or any other fullscreen-exit action
    const onFullscreenChange = () => { if (!document.fullscreenElement) handleViolation(); };

    window.addEventListener('blur',               onBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);
    document.addEventListener('fullscreenchange', onFullscreenChange);

    return () => {
      window.removeEventListener('blur',               onBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, [loading, questions.length, handleViolation]);

  // â”€â”€ Countdown timer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (loading || questions.length === 0) return;

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(intervalRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [loading, questions.length]);

  // â”€â”€ Auto-submit when timer hits 0 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (timeLeft !== null && timeLeft === 0 && !hasSubmitted.current) {
      submitQuiz();
    }
  }, [timeLeft, submitQuiz]);

  // â”€â”€ Handlers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleOptionSelect = (questionId, optionIndex) => {
    if (submitting) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const handlePrev = () => setCurrentIndex((i) => Math.max(i - 1, 0));
  const handleNext = () => setCurrentIndex((i) => Math.min(i + 1, questions.length - 1));

  // â”€â”€ Derived values â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const currentQuestion = questions[currentIndex];
  const totalQuestions  = questions.length;
  const answeredCount   = Object.keys(selectedAnswers).length;
  const isFirst         = currentIndex === 0;
  const isLast          = currentIndex === totalQuestions - 1;
  const isTimeLow       = timeLeft !== null && timeLeft <= 60;

  // â”€â”€ Render: Loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (loading) {
    return (
      <div className="quiz-centered">
        <div className="quiz-loader">
          <div className="loader-spinner" />
          <p>Loading questions...</p>
        </div>
      </div>
    );
  }

  // â”€â”€ Render: Fetch error â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (fetchError) {
    return (
      <div className="quiz-centered">
        <div className="quiz-error-card">
          <p>{fetchError}</p>
          <button onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  // â”€â”€ Render: Quiz â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  return (
    <div className="quiz-page">

      {/* â”€â”€ Top bar â”€â”€ */}
      <header className="quiz-header">
        <div className="quiz-header-left">
          <span className="quiz-title">🎯 {roundName || 'Quiz'}</span>
          <span className="quiz-progress">
            {answeredCount} / {totalQuestions} answered
          </span>
        </div>

        <div className={`quiz-timer ${isTimeLow ? 'timer-low' : ''}`}>
          {formatTime(timeLeft)}
        </div>

        {/* Violation badge — shown as soon as first violation occurs */}
        {violationCount > 0 && (
          <div className="violation-badge">
            ⚠️ Violation {violationCount}/{MAX_VIOLATIONS - 1} — {MAX_VIOLATIONS - violationCount - 1} warning(s) left
          </div>
        )}
      </header>

      {/* â”€â”€ Main content â”€â”€ */}
      <main className="quiz-main">

        {/* Question card */}
        <div className="question-card">
          <p className="question-counter">
            Question {currentIndex + 1} of {totalQuestions}
          </p>
          <h2 className="question-text">{currentQuestion.questionText}</h2>

          <div className="options-list" role="radiogroup">
            {currentQuestion.options.map((option, idx) => {
              const isSelected = selectedAnswers[currentQuestion._id] === idx;
              return (
                <label
                  key={idx}
                  className={`option-label ${isSelected ? 'option-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={`question-${currentQuestion._id}`}
                    value={idx}
                    checked={isSelected}
                    onChange={() => handleOptionSelect(currentQuestion._id, idx)}
                    disabled={submitting}
                  />
                  <span className="option-marker">{['A', 'B', 'C', 'D'][idx]}</span>
                  <span className="option-text">{option}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Navigation */}
        <div className="quiz-nav">
          <button className="nav-btn" onClick={handlePrev} disabled={isFirst || submitting}>
            Previous
          </button>

          <div className="question-palette">
            {questions.map((q, idx) => (
              <button
                key={q._id}
                className={`palette-dot
                  ${idx === currentIndex ? 'dot-active' : ''}
                  ${selectedAnswers[q._id] !== undefined ? 'dot-answered' : ''}
                `}
                onClick={() => setCurrentIndex(idx)}
                disabled={submitting}
                title={`Question ${idx + 1}`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          <button className="nav-btn" onClick={handleNext} disabled={isLast || submitting}>
            Next 
          </button>
        </div>

        {/* Submit */}
        <div className="quiz-submit-row">
          <button className="submit-btn" onClick={() => submitQuiz()} disabled={submitting}>
            {submitting ? (
              <span className="btn-loading">
                <span className="spinner" /> Submitting...
              </span>
            ) : (
              `Submit Quiz (${answeredCount}/${totalQuestions} answered)`
            )}
          </button>
        </div>

      </main>
    </div>
  );
}

export default QuizPage;
