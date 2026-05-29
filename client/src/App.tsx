import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { ClientPage } from './pages/ClientPage';
import { HostPage } from './pages/HostPage';
import { Tv } from 'lucide-react';
import './App.css';

function App() {
  return (
    <Router>
      <header className="app-header">
        <div className="header-content">
          <Link to="/" className="logo">
            <Tv size={20} /> DualStream <span>Live</span>
          </Link>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            Real-time WebRTC P2P
          </div>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/client" element={<ClientPage />} />
        <Route path="/host" element={<HostPage />} />
      </Routes>
    </Router>
  );
}

export default App;
