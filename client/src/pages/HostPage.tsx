import React, { useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Tv, ShieldAlert, Video, Monitor, Info, Server, ShieldCheck, Activity, ArrowLeft } from 'lucide-react';
import { useWebRTC } from '../hooks/useWebRTC';

export const HostPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const roomId = queryParams.get('room') || 'default-room';

  // WebRTC Hook configured as receiver
  const {
    connectionStatus,
    error,
    webcamStream,
    screenStream,
    sendReadySignal
  } = useWebRTC(roomId, 'receiver');

  // Video element refs
  const webcamVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);

  // Send ready trigger on page mount / socket reload
  useEffect(() => {
    sendReadySignal();
  }, [sendReadySignal]);

  // Bind incoming remote media streams to video elements
  useEffect(() => {
    if (webcamVideoRef.current) {
      if (webcamStream) {
        console.log('Binding incoming webcam stream to video element:', webcamStream.id);
        webcamVideoRef.current.srcObject = webcamStream;
      } else {
        webcamVideoRef.current.srcObject = null;
      }
    }
  }, [webcamStream]);

  useEffect(() => {
    if (screenVideoRef.current) {
      if (screenStream) {
        console.log('Binding incoming screen share stream to video element:', screenStream.id);
        screenVideoRef.current.srcObject = screenStream;
      } else {
        screenVideoRef.current.srcObject = null;
      }
    }
  }, [screenStream]);

  const hasStreams = !!(webcamStream || screenStream);

  return (
    <div className="container">
      <div style={{ marginBottom: '1.5rem' }}>
        <Link to="/" className="btn btn-secondary" style={{ padding: '0.5rem 1rem' }}>
          <ArrowLeft size={16} /> Back to Hub
        </Link>
      </div>

      <div className="glass-card" style={{ marginBottom: '2rem' }}>
        <div className="panel-header">
          <div className="panel-title-area">
            <Tv size={24} style={{ color: 'var(--accent-violet)' }} />
            <div>
              <h2>Host Monitor Dashboard</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Room: {roomId}</p>
            </div>
          </div>
          <div>
            <span className={`status-badge ${connectionStatus}`}>
              <span className="dot"></span>
              {connectionStatus === 'connected' ? 'Monitoring Live Streams' : connectionStatus}
            </span>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <ShieldAlert size={20} />
            <div>
              <strong>Connection Error:</strong> {error}
            </div>
          </div>
        )}

        {!hasStreams && connectionStatus === 'connected' && (
          <div className="glass-card" style={{ background: 'rgba(99, 102, 241, 0.03)', border: '1px dashed rgba(99, 102, 241, 0.3)', padding: '2rem', textAlign: 'center', borderRadius: '12px' }}>
            <Activity size={32} className="pulse-success" style={{ color: 'var(--accent-indigo)', margin: '0 auto 1rem auto' }} />
            <h4 style={{ marginBottom: '0.5rem' }}>WebRTC Channel Negotiated Successfully</h4>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>
              Waiting for the Broadcaster client to transmit media streams...
            </p>
          </div>
        )}

        {connectionStatus !== 'connected' && !hasStreams && (
          <div className="glass-card" style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-color)', padding: '2rem', textAlign: 'center', borderRadius: '12px' }}>
            <Server size={32} style={{ color: 'var(--color-text-muted)', margin: '0 auto 1rem auto' }} />
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-text-secondary)' }}>Signaling Channel Awaiting Broadcaster</h4>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>
              No active publisher detected. Open the Broadcaster Client view on the same room to begin.
            </p>
            <button className="btn btn-secondary" style={{ marginTop: '1.25rem', fontSize: '0.85rem' }} onClick={sendReadySignal}>
              Trigger Handshake Retry
            </button>
          </div>
        )}

        <div className="stats-panel">
          <div className="stat-card">
            <ShieldCheck size={20} className="stat-icon" />
            <div className="stat-details">
              <h4>Protocol</h4>
              <p>WebRTC P2P</p>
            </div>
          </div>

          <div className="stat-card">
            <Activity size={20} className="stat-icon" style={{ color: 'var(--color-success)' }} />
            <div className="stat-details">
              <h4>Latency Rating</h4>
              <p>{connectionStatus === 'connected' && hasStreams ? '< 100ms (Excellent)' : 'N/A'}</p>
            </div>
          </div>

          <div className="stat-card">
            <Info size={20} className="stat-icon" style={{ color: 'var(--accent-indigo)' }} />
            <div className="stat-details">
              <h4>Active Streams</h4>
              <p>
                {webcamStream ? 'Webcam ' : ''}
                {screenStream ? 'Screen' : ''}
                {!webcamStream && !screenStream ? 'None' : ''}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="panel-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <h3>Live Received Stream Feeds</h3>
      </div>
      <div className="streams-grid">
        <div className={`stream-card ${webcamStream ? 'active' : ''}`}>
          {webcamStream ? (
            <video
              ref={webcamVideoRef}
              className="stream-video"
              autoPlay
              playsInline
              controls // Allow control bar on receiver side
            />
          ) : (
            <div className="stream-placeholder">
              <Video size={48} className="stream-placeholder-icon" style={{ color: 'var(--color-text-muted)' }} />
              <p style={{ color: 'var(--color-text-muted)' }}>Webcam stream is offline</p>
            </div>
          )}
          <div className="stream-label">
            <Video size={14} /> Webcam Stream (Burned-in Timestamp)
          </div>
        </div>

        <div className={`stream-card ${screenStream ? 'active' : ''}`}>
          {screenStream ? (
            <video
              ref={screenVideoRef}
              className="stream-video"
              autoPlay
              playsInline
              controls
            />
          ) : (
            <div className="stream-placeholder">
              <Monitor size={48} className="stream-placeholder-icon" style={{ color: 'var(--color-text-muted)' }} />
              <p style={{ color: 'var(--color-text-muted)' }}>Screen Share stream is offline</p>
            </div>
          )}
          <div className="stream-label">
            <Monitor size={14} /> Screen Share Stream
          </div>
        </div>
      </div>
    </div>
  );
};
