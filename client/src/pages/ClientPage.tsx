import React, { useState, useEffect, useRef } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Video, ShieldAlert, AlertTriangle, Monitor, Mic, Radio, Square, ArrowLeft } from 'lucide-react';
import { socketService } from '../services/socket';
import { useWebcamWithTimestamp } from '../hooks/useWebcamWithTimestamp';
import { useWebRTC } from '../hooks/useWebRTC';
import { SOCKET_EVENTS } from '../../../shared/socket-events';

type PermissionState = 'pending' | 'granted' | 'denied' | 'error';

export const ClientPage: React.FC = () => {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const roomId = queryParams.get('room') || 'default-room';

  // Local media streams
  const [rawWebcamStream, setRawWebcamStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  
  // Permission statuses
  const [permissionStatus, setPermissionStatus] = useState<{
    webcam: PermissionState;
    mic: PermissionState;
    screen: PermissionState;
  }>({
    webcam: 'pending',
    mic: 'pending',
    screen: 'pending',
  });

  const [error, setError] = useState<string | null>(null);
  const [hostReady, setHostReady] = useState(false);

  // Canvas process hook
  const { processedStream: processedWebcamStream, error: canvasError } = useWebcamWithTimestamp(rawWebcamStream);

  // WebRTC hook
  const { connectionStatus, error: rtcError, startBroadcasting, cleanup } = useWebRTC(roomId, 'sender');

  // Video refs for local previews
  const webcamPreviewRef = useRef<HTMLVideoElement | null>(null);
  const screenPreviewRef = useRef<HTMLVideoElement | null>(null);

  // Apply streams to local video preview elements
  useEffect(() => {
    if (webcamPreviewRef.current && processedWebcamStream) {
      webcamPreviewRef.current.srcObject = processedWebcamStream;
    }
  }, [processedWebcamStream]);

  useEffect(() => {
    if (screenPreviewRef.current && screenStream) {
      screenPreviewRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  // Handle errors from canvas overlay
  useEffect(() => {
    if (canvasError) {
      setError(canvasError);
    }
  }, [canvasError]);

  // Request camera, microphone, and screen share permissions
  const handleRequestPermissions = async () => {
    try {
      setError(null);
      
      // 1. Request Webcam and Audio (Mic)
      console.log('Requesting User Media (Webcam & Microphone)...');
      const webcam = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      setRawWebcamStream(webcam);
      setPermissionStatus(prev => ({ ...prev, webcam: 'granted', mic: 'granted' }));

      // 2. Request Screen Share
      console.log('Requesting Display Media (Screen Share)...');
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30 } },
        audio: false // Screen audio not required
      });
      setScreenStream(screen);
      setPermissionStatus(prev => ({ ...prev, screen: 'granted' }));

      // Listen to screen sharing stop event (triggered by browser UI banner)
      screen.getVideoTracks()[0].onended = () => {
        console.log('Screen sharing stopped by user through browser UI.');
        setScreenStream(null);
        setPermissionStatus(prev => ({ ...prev, screen: 'pending' }));
      };

    } catch (err: any) {
      console.error('Error acquiring media permissions:', err);
      setError(`${err.name}: ${err.message || 'Permission denied'}`);
      
      // Update statuses depending on failure
      setPermissionStatus({
        webcam: err.name === 'NotAllowedError' ? 'denied' : 'error',
        mic: err.name === 'NotAllowedError' ? 'denied' : 'error',
        screen: err.name === 'NotAllowedError' ? 'denied' : 'error',
      });
    }
  };

  // Stop broadcasting and clean up all media tracks
  const handleStopBroadcasting = () => {
    console.log('Stopping broadcast and stopping all local media tracks...');
    cleanup();
    setHostReady(false);
    
    if (rawWebcamStream) {
      rawWebcamStream.getTracks().forEach(track => track.stop());
      setRawWebcamStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      setScreenStream(null);
    }
    setPermissionStatus({
      webcam: 'pending',
      mic: 'pending',
      screen: 'pending',
    });
  };

  // Monitor host readiness through socket
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handlePeerReady = () => {
      console.log('Host is connected and ready to receive stream.');
      setHostReady(true);
      if (processedWebcamStream && screenStream) {
        startBroadcasting(processedWebcamStream, screenStream);
      }
    };

    const handlePeerDisconnected = (payload: { role: string }) => {
      if (payload.role === 'receiver') {
        console.log('Host has disconnected.');
        setHostReady(false);
      }
    };

    socket.on(SOCKET_EVENTS.PEER_READY, handlePeerReady);
    socket.on(SOCKET_EVENTS.PEER_DISCONNECTED, handlePeerDisconnected);

    // If host was already connected, trigger check
    // Join room returns ready if host is there, handled in useWebRTC

    return () => {
      socket.off(SOCKET_EVENTS.PEER_READY, handlePeerReady);
      socket.off(SOCKET_EVENTS.PEER_DISCONNECTED, handlePeerDisconnected);
    };
  }, [processedWebcamStream, screenStream, startBroadcasting]);

  // Auto-broadcast if streams capture and host was already flagged as ready
  useEffect(() => {
    if (hostReady && processedWebcamStream && screenStream && connectionStatus === 'disconnected') {
      console.log('Broadcasting triggered (both streams acquired and Host is ready).');
      startBroadcasting(processedWebcamStream, screenStream);
    }
  }, [hostReady, processedWebcamStream, screenStream, connectionStatus, startBroadcasting]);

  const isStreamsAcquired = !!(processedWebcamStream && screenStream);

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
            <Radio size={24} className="pulse-danger" style={{ color: 'var(--accent-indigo)' }} />
            <div>
              <h2>Broadcaster Stream Console</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>Room: {roomId}</p>
            </div>
          </div>
          <div>
            <span className={`status-badge ${connectionStatus}`}>
              <span className="dot"></span>
              {connectionStatus === 'connected' && hostReady ? 'Live Broadcasting' : connectionStatus}
            </span>
          </div>
        </div>

        {error && (
          <div className="error-banner">
            <ShieldAlert size={20} />
            <div>
              <strong>Device Error:</strong> {error}
            </div>
          </div>
        )}

        {rtcError && (
          <div className="error-banner">
            <AlertTriangle size={20} />
            <div>
              <strong>Streaming Error:</strong> {rtcError}
            </div>
          </div>
        )}

        {!hostReady && connectionStatus !== 'connected' && (
          <div className="glass-card" style={{ background: 'rgba(245, 158, 11, 0.05)', borderColor: 'rgba(245, 158, 11, 0.2)', padding: '1rem', marginBottom: '1.5rem', borderRadius: '10px' }}>
            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-warning)', fontSize: '0.9rem' }}>
              <AlertTriangle size={18} />
              Waiting for Host (Receiver Dashboard) to connect to Room "{roomId}"...
            </p>
          </div>
        )}

        <div className="permissions-list">
          <div className="permission-item">
            <div className="permission-info">
              <span className="permission-icon"><Video size={20} /></span>
              <span className="permission-name">Webcam Stream Access</span>
            </div>
            <span className={`permission-status ${permissionStatus.webcam}`}>
              {permissionStatus.webcam}
            </span>
          </div>

          <div className="permission-item">
            <div className="permission-info">
              <span className="permission-icon"><Mic size={20} /></span>
              <span className="permission-name">Microphone Audio Access</span>
            </div>
            <span className={`permission-status ${permissionStatus.mic}`}>
              {permissionStatus.mic}
            </span>
          </div>

          <div className="permission-item">
            <div className="permission-info">
              <span className="permission-icon"><Monitor size={20} /></span>
              <span className="permission-name">Screen Sharing Access</span>
            </div>
            <span className={`permission-status ${permissionStatus.screen}`}>
              {permissionStatus.screen}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          {!isStreamsAcquired ? (
            <button className="btn btn-primary" onClick={handleRequestPermissions}>
              <Video size={18} /> Request & Preview Devices
            </button>
          ) : (
            <button className="btn btn-danger" onClick={handleStopBroadcasting}>
              <Square size={18} /> Stop Stream & Release Devices
            </button>
          )}

          {isStreamsAcquired && connectionStatus === 'disconnected' && hostReady && (
            <button className="btn btn-primary" onClick={() => startBroadcasting(processedWebcamStream, screenStream)}>
              <Radio size={18} /> Connect WebRTC manually
            </button>
          )}
        </div>
      </div>

      <div className="panel-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <h3>Local Capture Previews</h3>
      </div>
      <div className="streams-grid">
        <div className={`stream-card ${processedWebcamStream ? 'active' : ''}`}>
          {processedWebcamStream ? (
            <video
              ref={webcamPreviewRef}
              className="stream-video"
              autoPlay
              playsInline
              muted
            />
          ) : (
            <div className="stream-placeholder">
              <Video size={48} className="stream-placeholder-icon" />
              <p>Webcam preview is offline</p>
            </div>
          )}
          <div className="stream-label">
            <Video size={14} /> Webcam Stream (Canvas Timestamp Overlaid)
          </div>
        </div>

        <div className={`stream-card ${screenStream ? 'active' : ''}`}>
          {screenStream ? (
            <video
              ref={screenPreviewRef}
              className="stream-video"
              autoPlay
              playsInline
              muted
            />
          ) : (
            <div className="stream-placeholder">
              <Monitor size={48} className="stream-placeholder-icon" />
              <p>Screen Share preview is offline</p>
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
