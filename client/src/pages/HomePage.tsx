import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Tv, Key } from 'lucide-react';

export const HomePage: React.FC = () => {
  const [roomId, setRoomId] = useState('default-room');
  const navigate = useNavigate();

  const handleNavigate = (role: 'client' | 'host') => {
    const cleanRoomId = roomId.trim() || 'default-room';
    if (role === 'client') {
      navigate(`/client?room=${cleanRoomId}`);
    } else {
      navigate(`/host?room=${cleanRoomId}`);
    }
  };

  return (
    <div className="home-container">
      <header style={{ marginBottom: '2rem' }}>
        <h1 className="home-title">Dual-Stream Live</h1>
        <p className="home-subtitle">
          Stream your webcam and screen share simultaneously with sub-second WebRTC latency and canvas-burned real-time timestamp.
        </p>
      </header>

      <div className="glass-card" style={{ maxWidth: '480px', width: '100%', marginBottom: '3rem', padding: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', color: 'var(--color-text-secondary)' }}>
          <Key size={16} />
          <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Enter Stream Room ID</span>
        </div>
        <div className="room-input-container">
          <input
            type="text"
            className="input-field"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="e.g. streaming-room-1"
          />
        </div>
      </div>

      <div className="hub-cards">
        <div className="glass-card hub-card" onClick={() => handleNavigate('client')}>
          <div className="hub-icon-wrapper">
            <Video size={32} />
          </div>
          <h3>Start Broadcasting</h3>
          <p>Request permissions for webcam, microphone, and screen share to stream them simultaneously.</p>
          <button className="btn btn-primary" style={{ marginTop: 'auto', width: '100%' }}>
            Broadcaster Page
          </button>
        </div>

        <div className="glass-card hub-card" onClick={() => handleNavigate('host')}>
          <div className="hub-icon-wrapper" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)', color: 'var(--accent-violet)' }}>
            <Tv size={32} />
          </div>
          <h3>Monitor Dashboard</h3>
          <p>Receive and play both streams in real-time with automatic reconnection and stream separation.</p>
          <button className="btn btn-secondary" style={{ marginTop: 'auto', width: '100%' }}>
            Host Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
