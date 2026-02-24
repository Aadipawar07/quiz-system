import { useState, useEffect } from 'react';
import api from '../services/api';
import './Home.css';

function Home() {
  const [serverStatus, setServerStatus] = useState('Checking...');
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    try {
      const response = await api.get('/health');
      setServerStatus(response.data.status);
      setIsConnected(true);
    } catch (error) {
      setServerStatus('Server not connected');
      setIsConnected(false);
    }
  };

  return (
    <div className="home">
      <div className="home-container">
        <h1 className="home-title">🎯 Quiz System Ready</h1>
        <p className="home-subtitle">
          Your full-stack quiz application is set up and running!
        </p>
        
        <div className={`status-card ${isConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-indicator"></div>
          <div className="status-info">
            <span className="status-label">Backend Status:</span>
            <span className="status-value">{serverStatus}</span>
          </div>
        </div>

        <div className="info-section">
          <h2>Quick Info</h2>
          <ul>
            <li>Frontend: <code>http://localhost:5173</code></li>
            <li>Backend API: <code>http://localhost:5000/api</code></li>
            <li>Health Check: <code>GET /api/health</code></li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Home;
