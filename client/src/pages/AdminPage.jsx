import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AdminPage.css';

const EMPTY_QUESTION_FORM = {
  roundId: '',
  questionText: '',
  option0: '', option1: '', option2: '', option3: '',
  correctAnswer: '',
  marks: 1
};

const EMPTY_ROUND_FORM = { name: '', duration: '', totalQuestions: '' };

// ─── placeholder so old code below gets replaced ──────────────────────────────
const EMPTY_FORM = {
  questionText: '',
  option0: '',
  option1: '',
  option2: '',
  option3: '',
  correctAnswer: '',
  marks: 1
};

function AdminPage() {
  const navigate = useNavigate();

  // ── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!localStorage.getItem('adminToken')) {
      navigate('/admin-login', { replace: true });
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin-login', { replace: true });
  };

  // ── Round state ─────────────────────────────────────────────────────────────
  const [rounds, setRounds]                     = useState([]);
  const [roundsLoading, setRoundsLoading]       = useState(true);
  const [roundsError, setRoundsError]           = useState('');
  const [roundForm, setRoundForm]               = useState(EMPTY_ROUND_FORM);
  const [roundFormError, setRoundFormError]     = useState('');
  const [roundFormSuccess, setRoundFormSuccess] = useState('');
  const [roundSubmitting, setRoundSubmitting]   = useState(false);
  const [publishingId, setPublishingId]         = useState(null);
  // importState: { [roundId]: { file, uploading, success, error } }
  const [importState, setImportState]           = useState({});
  // leaderboardState: { [roundId]: { data, loading, error, visible } }
  const [leaderboardState, setLeaderboardState] = useState({});
  // participantState: { [roundId]: { data, loading, error, visible } }
  const [participantState, setParticipantState] = useState({});
  // questionsState: { [roundId]: { data, loading, error, visible, deletingId } }
  const [questionsState, setQuestionsState]     = useState({});
  const [deletingRoundId, setDeletingRoundId]   = useState(null);
  // liveStats: { roundName, totalParticipants, completed, inProgress, terminated } | null
  const [liveStats, setLiveStats]               = useState(null);

  // ── Question state ──────────────────────────────────────────────────────────
  const [form, setForm]               = useState(EMPTY_QUESTION_FORM);
  const [formError, setFormError]     = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [submitting, setSubmitting]   = useState(false);

  // ── Results state ───────────────────────────────────────────────────────────
  const [results, setResults]                 = useState([]);
  const [resultsLoading, setResultsLoading]   = useState(true);
  const [resultsError, setResultsError]       = useState('');

  // ── Live stats ──────────────────────────────────────────────────────────────
  const fetchLiveStats = async () => {
    try {
      const res = await api.get('/admin/live-stats');
      setLiveStats(res.data);
    } catch {
      // silently ignore — stats are best-effort
    }
  };

  // ── Fetch on mount ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetchRounds();
    fetchResults();
    fetchLiveStats();
    const interval = setInterval(fetchLiveStats, 5000);
    return () => clearInterval(interval);
  }, []);

  // ── Round handlers ──────────────────────────────────────────────────────────
  const fetchRounds = async () => {
    setRoundsLoading(true);
    setRoundsError('');
    try {
      const res = await api.get('/admin/rounds');
      setRounds(res.data);
    } catch (err) {
      setRoundsError(err.response?.data?.message || 'Failed to load rounds.');
    } finally {
      setRoundsLoading(false);
    }
  };

  const handleRoundChange = (e) => {
    const { name, value } = e.target;
    setRoundForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRoundSubmit = async (e) => {
    e.preventDefault();
    setRoundFormError('');
    setRoundFormSuccess('');
    if (!roundForm.name.trim())             return setRoundFormError('Round name is required.');
    if (!roundForm.duration || Number(roundForm.duration) < 1)
      return setRoundFormError('Duration must be at least 1 minute.');
    if (!roundForm.totalQuestions || Number(roundForm.totalQuestions) < 1)
      return setRoundFormError('Total questions must be at least 1.');

    setRoundSubmitting(true);
    try {
      const res = await api.post('/admin/create-round', {
        name:           roundForm.name.trim(),
        duration:       Number(roundForm.duration),
        totalQuestions: Number(roundForm.totalQuestions)
      });
      setRoundFormSuccess(`✅ Round "${res.data.round.name}" created!`);
      setRoundForm(EMPTY_ROUND_FORM);
      fetchRounds();
    } catch (err) {
      setRoundFormError(err.response?.data?.message || 'Failed to create round.');
    } finally {
      setRoundSubmitting(false);
    }
  };

  const handlePublish = async (roundId) => {
    setPublishingId(roundId);
    try {
      const res = await api.post(`/admin/publish-round/${roundId}`);
      alert(`✅ ${res.data.message}`);
      fetchRounds();
    } catch (err) {
      alert(`❌ ${err.response?.data?.message || 'Failed to publish round.'}`);
    } finally {
      setPublishingId(null);
    }
  };

  // ── Import handlers ────────────────────────────────────────────────────────
  const handleImportFileChange = (roundId, file) => {
    setImportState((prev) => ({
      ...prev,
      [roundId]: { ...(prev[roundId] || {}), file, success: '', error: '' },
    }));
  };

  const handleImport = async (roundId) => {
    const state = importState[roundId] || {};
    if (!state.file) return;

    setImportState((prev) => ({
      ...prev,
      [roundId]: { ...prev[roundId], uploading: true, success: '', error: '' },
    }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);
      const res = await api.post(`/admin/import-questions/${roundId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setImportState((prev) => ({
        ...prev,
        [roundId]: { file: null, uploading: false, success: `✅ ${res.data.count} questions imported.`, error: '' },
      }));
    } catch (err) {
      const data = err.response?.data;
      let msg = data?.message || 'Import failed.';
      if (data?.errors?.length) {
        msg += ' ' + data.errors.map((e) => `Row ${e.row}: ${e.errors.join(', ')}`).join(' | ');
      }
      setImportState((prev) => ({
        ...prev,
        [roundId]: { ...prev[roundId], uploading: false, success: '', error: msg },
      }));
    }
  };

  // ── Question handlers ───────────────────────────────────────────────────────
  const fetchResults = async () => {
    setResultsLoading(true);
    setResultsError('');
    try {
      const res = await api.get('/admin/results');
      setResults(res.data);
    } catch (err) {
      setResultsError(err.response?.data?.message || 'Failed to load results.');
    } finally {
      setResultsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    if (!form.roundId)             return 'Please select a round.';
    if (!form.questionText.trim()) return 'Question text is required.';
    if (!form.option0.trim())      return 'Option 1 is required.';
    if (!form.option1.trim())      return 'Option 2 is required.';
    if (!form.option2.trim())      return 'Option 3 is required.';
    if (!form.option3.trim())      return 'Option 4 is required.';
    const ca = Number(form.correctAnswer);
    if (form.correctAnswer === '' || isNaN(ca) || !Number.isInteger(ca) || ca < 0 || ca > 3)
      return 'Correct answer must be 0, 1, 2, or 3.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    const error = validateForm();
    if (error) { setFormError(error); return; }

    setSubmitting(true);
    try {
      const res = await api.post('/admin/add-question', {
        roundId:       form.roundId,
        questionText:  form.questionText.trim(),
        options: [form.option0.trim(), form.option1.trim(), form.option2.trim(), form.option3.trim()],
        correctAnswer: Number(form.correctAnswer),
        marks:         Number(form.marks) || 1
      });
      setFormSuccess(`✅ Question added! (ID: ${res.data.questionId})`);
      setForm({ ...EMPTY_QUESTION_FORM, roundId: form.roundId }); // keep round selection
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to add question.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Leaderboard handler ────────────────────────────────────────────────────
  const handleViewLeaderboard = async (roundId) => {
    const current = leaderboardState[roundId] || {};
    if (current.visible) {
      setLeaderboardState((prev) => ({ ...prev, [roundId]: { ...prev[roundId], visible: false } }));
      return;
    }
    setLeaderboardState((prev) => ({ ...prev, [roundId]: { data: [], loading: true, error: '', visible: true } }));
    try {
      const res = await api.get(`/admin/leaderboard/${roundId}`);
      setLeaderboardState((prev) => ({ ...prev, [roundId]: { ...prev[roundId], data: res.data, loading: false } }));
    } catch (err) {
      setLeaderboardState((prev) => ({
        ...prev,
        [roundId]: { ...prev[roundId], loading: false, error: err.response?.data?.message || 'Failed to load leaderboard.' },
      }));
    }
  };
  // ── Participants handler ───────────────────────────────────────────
  const handleResetAttempt = async (rollNo, roundId) => {
    if (!window.confirm(`Reset attempt for ${rollNo}? The student will be able to re-enter the quiz.`)) return;
    try {
      await api.post('/admin/reset-attempt', { rollNo, roundId });
      // Refresh participants list
      const res = await api.get(`/admin/participants/${roundId}`);
      setParticipantState((prev) => ({ ...prev, [roundId]: { ...prev[roundId], data: res.data } }));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset attempt.');
    }
  };

  const handleViewParticipants = async (roundId) => {
    const current = participantState[roundId] || {};
    if (current.visible) {
      setParticipantState((prev) => ({ ...prev, [roundId]: { ...prev[roundId], visible: false } }));
      return;
    }
    setParticipantState((prev) => ({ ...prev, [roundId]: { data: [], loading: true, error: '', visible: true } }));
    try {
      const res = await api.get(`/admin/participants/${roundId}`);
      setParticipantState((prev) => ({ ...prev, [roundId]: { ...prev[roundId], data: res.data, loading: false } }));
    } catch (err) {
      setParticipantState((prev) => ({
        ...prev,
        [roundId]: { ...prev[roundId], loading: false, error: err.response?.data?.message || 'Failed to load participants.' },
      }));
    }
  };

  // ── Delete round handler ─────────────────────────────────────────
  const handleDeleteRound = async (roundId, roundName) => {
    if (!window.confirm(`Are you sure you want to delete "${roundName}"?\nThis will also delete all its questions and student attempts.\nThis cannot be undone.`)) return;
    setDeletingRoundId(roundId);
    try {
      await api.delete(`/admin/round/${roundId}`);
      fetchRounds();
    } catch (err) {
      alert(`❌ ${err.response?.data?.message || 'Failed to delete round.'}`);
    } finally {
      setDeletingRoundId(null);
    }
  };

  // ── View questions + delete question handlers ────────────────────
  const handleViewQuestions = async (roundId) => {
    const current = questionsState[roundId] || {};
    if (current.visible) {
      setQuestionsState((prev) => ({ ...prev, [roundId]: { ...prev[roundId], visible: false } }));
      return;
    }
    setQuestionsState((prev) => ({ ...prev, [roundId]: { data: [], loading: true, error: '', visible: true, deletingId: null } }));
    try {
      const res = await api.get(`/admin/questions/${roundId}`);
      setQuestionsState((prev) => ({ ...prev, [roundId]: { ...prev[roundId], data: res.data, loading: false } }));
    } catch (err) {
      setQuestionsState((prev) => ({
        ...prev,
        [roundId]: { ...prev[roundId], loading: false, error: err.response?.data?.message || 'Failed to load questions.' },
      }));
    }
  };

  const handleDeleteQuestion = async (roundId, questionId) => {
    if (!window.confirm('Are you sure you want to delete this question? This cannot be undone.')) return;
    setQuestionsState((prev) => ({ ...prev, [roundId]: { ...prev[roundId], deletingId: questionId } }));
    try {
      await api.delete(`/admin/question/${questionId}`);
      // Refresh questions list for this round
      const res = await api.get(`/admin/questions/${roundId}`);
      setQuestionsState((prev) => ({ ...prev, [roundId]: { ...prev[roundId], data: res.data, deletingId: null } }));
    } catch (err) {
      alert(`❌ ${err.response?.data?.message || 'Failed to delete question.'}`);
      setQuestionsState((prev) => ({ ...prev, [roundId]: { ...prev[roundId], deletingId: null } }));
    }
  };
  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="admin-page">

      <header className="admin-header">
        <h1>🛠️ Admin Dashboard</h1>
        <button className="btn-logout" onClick={handleLogout}>⏻ Logout</button>
      </header>

      <div className="admin-body">

        {/* ══ LIVE STATS ══ */}
        <section className="admin-section live-stats-section">
          <h2 className="section-title">📡 Live Round Status</h2>
          {!liveStats ? (
            <p className="results-loading">Loading...</p>
          ) : liveStats.message ? (
            <p className="results-empty">{liveStats.message}</p>
          ) : (
            <div className="live-stats-grid">
              <div className="live-stat-card">
                <span className="live-stat-label">Round</span>
                <span className="live-stat-value">{liveStats.roundName}</span>
              </div>
              <div className="live-stat-card">
                <span className="live-stat-label">Total</span>
                <span className="live-stat-value">{liveStats.totalParticipants}</span>
              </div>
              <div className="live-stat-card">
                <span className="live-stat-label">Completed</span>
                <span className="live-stat-value stat-green">{liveStats.completed}</span>
              </div>
              <div className="live-stat-card">
                <span className="live-stat-label">In Progress</span>
                <span className="live-stat-value stat-blue">{liveStats.inProgress}</span>
              </div>
              <div className="live-stat-card">
                <span className="live-stat-label">Terminated</span>
                <span className="live-stat-value stat-red">{liveStats.terminated}</span>
              </div>
            </div>
          )}
        </section>

        {/* ══ SECTION A — Create Round ══ */}
        <section className="admin-section">
          <h2 className="section-title">🏁 Create New Round</h2>
          <form className="question-form" onSubmit={handleRoundSubmit} noValidate>
            <div className="form-row form-row-3">
              <div className="form-group">
                <label htmlFor="r-name">Round Name</label>
                <input id="r-name" type="text" name="name"
                  placeholder="e.g. Round 1 — Networking"
                  value={roundForm.name} onChange={handleRoundChange}
                  disabled={roundSubmitting} />
              </div>
              <div className="form-group">
                <label htmlFor="r-duration">Duration (minutes)</label>
                <input id="r-duration" type="number" name="duration" min={1}
                  placeholder="e.g. 20"
                  value={roundForm.duration} onChange={handleRoundChange}
                  disabled={roundSubmitting} />
              </div>
              <div className="form-group">
                <label htmlFor="r-total">Total Questions</label>
                <input id="r-total" type="number" name="totalQuestions" min={1}
                  placeholder="e.g. 20"
                  value={roundForm.totalQuestions} onChange={handleRoundChange}
                  disabled={roundSubmitting} />
              </div>
            </div>
            {roundFormError   && <div className="msg msg-error">{roundFormError}</div>}
            {roundFormSuccess && <div className="msg msg-success">{roundFormSuccess}</div>}
            <button type="submit" className="btn-primary" disabled={roundSubmitting}>
              {roundSubmitting ? 'Creating...' : 'Create Round'}
            </button>
          </form>
        </section>

        {/* ══ SECTION B — Rounds List ══ */}
        <section className="admin-section">
          <div className="section-title-row">
            <h2 className="section-title">📋 All Rounds</h2>
            <button className="btn-refresh" onClick={fetchRounds} disabled={roundsLoading}>
              {roundsLoading ? 'Loading...' : '↻ Refresh'}
            </button>
          </div>
          {roundsError && <div className="msg msg-error">{roundsError}</div>}
          {roundsLoading ? (
            <p className="results-loading">Fetching rounds...</p>
          ) : rounds.length === 0 ? (
            <p className="results-empty">No rounds created yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th><th>Name</th><th>Duration</th><th>Questions</th><th>Status</th><th>Action</th><th>Import Questions</th><th>Leaderboard</th><th>Participants</th><th>View Qs</th><th>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {rounds.map((r, idx) => {
                    const imp = importState[r._id] || {};
                    return (
                      <tr key={r._id}>
                        <td>{idx + 1}</td>
                        <td><strong>{r.name}</strong></td>
                        <td>{r.duration} min</td>
                        <td>{r.totalQuestions}</td>
                        <td>
                          <span className={`badge ${r.isPublished ? 'badge-green' : 'badge-grey'}`}>
                            {r.isPublished ? '🟢 Live' : 'Draft'}
                          </span>
                        </td>
                        <td>
                          {r.isPublished ? (
                            <span className="live-label">Currently Live</span>
                          ) : (
                            <button className="btn-publish"
                              onClick={() => handlePublish(r._id)}
                              disabled={publishingId === r._id}>
                              {publishingId === r._id ? 'Publishing...' : '▶ Publish'}
                            </button>
                          )}
                        </td>
                        <td>
                          <div className="import-cell">
                            <input
                              type="file"
                              accept=".xlsx"
                              className="import-file-input"
                              onChange={(e) => handleImportFileChange(r._id, e.target.files[0])}
                              disabled={imp.uploading}
                            />
                            <button
                              className="btn-import"
                              onClick={() => handleImport(r._id)}
                              disabled={!imp.file || imp.uploading}>
                              {imp.uploading ? 'Uploading...' : '⬆ Upload'}
                            </button>
                            {imp.success && <div className="msg msg-success import-msg">{imp.success}</div>}
                            {imp.error   && <div className="msg msg-error  import-msg">{imp.error}</div>}
                          </div>
                        </td>
                        <td>
                          <button
                            className="btn-leaderboard"
                            onClick={() => handleViewLeaderboard(r._id)}>
                            {leaderboardState[r._id]?.visible ? '▲ Hide' : '📊 View'}
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn-participants"
                            onClick={() => handleViewParticipants(r._id)}>
                            {participantState[r._id]?.visible ? '▲ Hide' : '👥 View'}
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn-view-qs"
                            onClick={() => handleViewQuestions(r._id)}>
                            {questionsState[r._id]?.visible ? '▲ Hide' : '📄 View'}
                          </button>
                        </td>
                        <td>
                          <button
                            className="btn-delete-round"
                            onClick={() => handleDeleteRound(r._id, r.name)}
                            disabled={deletingRoundId === r._id}>
                            {deletingRoundId === r._id ? '...' : '🗑 Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {/* Per-round leaderboard panels */}
          {rounds.map((r) => {
            const lb = leaderboardState[r._id];
            if (!lb?.visible) return null;
            return (
              <div key={r._id} className="leaderboard-panel">
                <h3 className="leaderboard-title">📊 Leaderboard — {r.name}</h3>
                {lb.loading && <p className="results-loading">Loading...</p>}
                {lb.error   && <div className="msg msg-error">{lb.error}</div>}
                {!lb.loading && !lb.error && lb.data.length === 0 && (
                  <p className="results-empty">No attempts recorded for this round yet.</p>
                )}
                {!lb.loading && lb.data.length > 0 && (
                  <div className="table-wrapper">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>Rank</th><th>Name</th><th>Roll No</th>
                          <th>Score</th><th>Correct</th><th>Attempted</th><th>Time (s)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lb.data.map((entry, idx) => (
                          <tr key={entry._id}>
                            <td><strong>#{idx + 1}</strong></td>
                            <td>{entry.name}</td>
                            <td>{entry.rollNo}</td>
                            <td><strong>{entry.score}</strong></td>
                            <td>{entry.correct}</td>
                            <td>{entry.attempted}</td>
                            <td>{entry.timeTaken != null ? entry.timeTaken : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          {/* Per-round participants panels */}
          {rounds.map((r) => {
            const pt = participantState[r._id];
            if (!pt?.visible) return null;
            return (
              <div key={r._id} className="leaderboard-panel">
                <h3 className="leaderboard-title">👥 Participants — {r.name}</h3>
                {pt.loading && <p className="results-loading">Loading...</p>}
                {pt.error   && <div className="msg msg-error">{pt.error}</div>}
                {!pt.loading && !pt.error && pt.data.length === 0 && (
                  <p className="results-empty">No participants yet.</p>
                )}
                {!pt.loading && pt.data.length > 0 && (
                  <div className="table-wrapper">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>#</th><th>Name</th><th>Roll No</th><th>Attempted</th>
                          <th>Score</th><th>Terminated</th><th>Violations</th>
                          <th>Start Time</th><th>Submit Time</th><th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pt.data.map((p, idx) => (
                          <tr key={p._id}>
                            <td>{idx + 1}</td>
                            <td>{p.name}</td>
                            <td>{p.rollNo}</td>
                            <td>{p.attempted}</td>
                            <td><strong>{p.score}</strong></td>
                            <td>
                              <span className={`badge ${p.terminated ? 'badge-red' : 'badge-green'}`}>
                                {p.terminated ? 'Yes' : 'No'}
                              </span>
                            </td>
                            <td>{p.violationCount}</td>
                            <td>{p.startTime ? new Date(p.startTime).toLocaleTimeString() : '—'}</td>
                            <td>{p.submitTime ? new Date(p.submitTime).toLocaleTimeString() : 'In progress'}</td>
                            <td>
                              <button
                                className="btn-delete-q"
                                onClick={() => handleResetAttempt(p.rollNo, r._id)}
                              >Reset</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
          {/* Per-round questions panels */}
          {rounds.map((r) => {
            const qs = questionsState[r._id];
            if (!qs?.visible) return null;
            return (
              <div key={r._id} className="leaderboard-panel">
                <h3 className="leaderboard-title">📄 Questions — {r.name} ({qs.data.length})</h3>
                {qs.loading && <p className="results-loading">Loading...</p>}
                {qs.error   && <div className="msg msg-error">{qs.error}</div>}
                {!qs.loading && !qs.error && qs.data.length === 0 && (
                  <p className="results-empty">No questions added to this round yet.</p>
                )}
                {!qs.loading && qs.data.length > 0 && (
                  <div className="table-wrapper">
                    <table className="results-table">
                      <thead>
                        <tr>
                          <th>#</th><th>Question</th><th>Options</th><th>Correct</th><th>Marks</th><th>Delete</th>
                        </tr>
                      </thead>
                      <tbody>
                        {qs.data.map((q, idx) => (
                          <tr key={q._id}>
                            <td>{idx + 1}</td>
                            <td style={{ maxWidth: '280px' }}>{q.questionText}</td>
                            <td style={{ fontSize: '0.8rem' }}>
                              {q.options.map((o, i) => (
                                <div key={i}>
                                  <strong>{i}:</strong> {o}
                                </div>
                              ))}
                            </td>
                            <td>{q.correctAnswer}</td>
                            <td>{q.marks}</td>
                            <td>
                              <button
                                className="btn-delete-q"
                                disabled={qs.deletingId === q._id}
                                onClick={() => handleDeleteQuestion(r._id, q._id)}>
                                {qs.deletingId === q._id ? '...' : '🗑'}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* ══ SECTION C — Add Question ══ */}
        <section className="admin-section">
          <h2 className="section-title">➕ Add New Question</h2>
          <form className="question-form" onSubmit={handleSubmit} noValidate>

            <div className="form-group">
              <label htmlFor="roundId">Round</label>
              <select id="roundId" name="roundId" value={form.roundId}
                onChange={handleChange} disabled={submitting}>
                <option value="">— Select a round —</option>
                {rounds.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name} ({r.totalQuestions}Q, {r.duration} min)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="questionText">Question Text</label>
              <textarea id="questionText" name="questionText" rows={3}
                placeholder="Enter the question..."
                value={form.questionText} onChange={handleChange}
                disabled={submitting} />
            </div>

            <div className="options-grid">
              {[0, 1, 2, 3].map((i) => (
                <div className="form-group" key={i}>
                  <label htmlFor={`option${i}`}>Option {i + 1}</label>
                  <input id={`option${i}`} type="text" name={`option${i}`}
                    placeholder={`Option ${i + 1}`}
                    value={form[`option${i}`]} onChange={handleChange}
                    disabled={submitting} />
                </div>
              ))}
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="correctAnswer">Correct Answer Index (0–3)</label>
                <input id="correctAnswer" type="number" name="correctAnswer"
                  placeholder="0, 1, 2 or 3" min={0} max={3}
                  value={form.correctAnswer} onChange={handleChange}
                  disabled={submitting} />
              </div>
              <div className="form-group">
                <label htmlFor="marks">Marks</label>
                <input id="marks" type="number" name="marks" min={1}
                  value={form.marks} onChange={handleChange}
                  disabled={submitting} />
              </div>
            </div>

            {formError   && <div className="msg msg-error">{formError}</div>}
            {formSuccess && <div className="msg msg-success">{formSuccess}</div>}

            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Question'}
            </button>
          </form>
        </section>

        {/* ══ SECTION D — Student Results ══ */}
        <section className="admin-section">
          <div className="section-title-row">
            <h2 className="section-title">📊 Student Results</h2>
            <div className="results-actions">
              <a href={`http://localhost:5000/api/admin/export?token=${localStorage.getItem('adminToken') || ''}`}
                className="btn-export" target="_blank" rel="noreferrer">
                ⬇ Export Excel
              </a>
              <button className="btn-refresh" onClick={fetchResults} disabled={resultsLoading}>
                {resultsLoading ? 'Loading...' : '↻ Refresh'}
              </button>
            </div>
          </div>
          {resultsError && <div className="msg msg-error">{resultsError}</div>}
          {resultsLoading ? (
            <p className="results-loading">Fetching results...</p>
          ) : results.length === 0 ? (
            <p className="results-empty">No submissions yet.</p>
          ) : (
            <div className="table-wrapper">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>#</th><th>Name</th><th>Roll No</th>
                    <th>Attempted</th><th>Correct</th><th>Score</th><th>Terminated</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r, idx) => (
                    <tr key={r._id}>
                      <td>{idx + 1}</td>
                      <td>{r.name}</td>
                      <td>{r.rollNo}</td>
                      <td>{r.attempted}</td>
                      <td>{r.correct}</td>
                      <td><strong>{r.score}</strong></td>
                      <td>
                        <span className={`badge ${r.terminated ? 'badge-red' : 'badge-green'}`}>
                          {r.terminated ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

export default AdminPage;
