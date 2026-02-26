import { useState, useEffect } from 'react';
import './PublicLeaderboard.css';

const API = 'http://localhost:5000/api';

function formatTime(seconds) {
  if (seconds == null) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function PublicLeaderboard() {
  const [data, setData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch(`${API}/public/leaderboard`);
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
    } catch {
      // silently retry next interval
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, []);

  const isNoRound = data?.message;

  return (
    <div className="lb-page">
      <header className="lb-header">
        <h1 className="lb-title">🏆 Live Leaderboard</h1>
        {data && !isNoRound && (
          <p className="lb-round-name">{data.roundName}</p>
        )}
        {lastUpdated && (
          <p className="lb-updated">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </header>

      <main className="lb-main">
        {!data && (
          <p className="lb-message">Loading...</p>
        )}

        {isNoRound && (
          <p className="lb-message">No active round currently.</p>
        )}

        {data && !isNoRound && data.leaderboard.length === 0 && (
          <p className="lb-message">No submissions yet. Check back soon!</p>
        )}

        {data && !isNoRound && data.leaderboard.length > 0 && (
          <div className="lb-table-wrapper">
            <table className="lb-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Name</th>
                  <th>Token No</th>
                  <th>Score</th>
                  <th>Time Taken</th>
                </tr>
              </thead>
              <tbody>
                {data.leaderboard.map((entry, idx) => (
                  <tr key={entry.tokenNo} className={idx < 3 ? `lb-top lb-top-${idx + 1}` : ''}>
                    <td className="lb-rank">
                      {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : idx + 1}
                    </td>
                    <td className="lb-name">{entry.name}</td>
                    <td className="lb-roll">{entry.tokenNo}</td>
                    <td className="lb-score">{entry.score}</td>
                    <td className="lb-time">{formatTime(entry.timeTaken)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

export default PublicLeaderboard;
