import { Routes, Route } from 'react-router-dom';
import EntryPage from './pages/EntryPage';
import QuizPage from './pages/QuizPage';
import AdminPage from './pages/AdminPage';
import AdminLogin from './pages/AdminLogin';
import ResultPage from './pages/ResultPage';
import PublicLeaderboard from './pages/PublicLeaderboard';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/"            element={<EntryPage />} />
        <Route path="/quiz"        element={<QuizPage />} />
        <Route path="/result"      element={<ResultPage />} />
        <Route path="/leaderboard" element={<PublicLeaderboard />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin"       element={<AdminPage />} />
      </Routes>
    </div>
  );
}

export default App;
