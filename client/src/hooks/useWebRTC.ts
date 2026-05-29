import { useEffect, useRef, useState, useCallback } from 'react';
import { socketService } from '../services/socket';
import { SOCKET_EVENTS } from '../../../shared/socket-events';
import type { StreamMetaPayload } from '../../../shared/socket-events';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

export const useWebRTC = (roomId: string, role: 'sender' | 'receiver') => {
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  
  const [streamMeta, setStreamMeta] = useState<StreamMetaPayload | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pendingCandidates = useRef<RTCIceCandidateInit[]>([]);

  const cleanup = useCallback(() => {
    console.log('Cleaning up WebRTC peer connection resources...');
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    setConnectionStatus('disconnected');
    setRemoteStreams({});
    setStreamMeta(null);
    pendingCandidates.current = [];
  }, []);

  useEffect(() => {
    const socket = socketService.connect();

    socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, role });

    socket.on(SOCKET_EVENTS.PEER_DISCONNECTED, () => {
      console.log('Remote peer disconnected, cleaning up...');
      cleanup();
      // Wait to reconnect by re-joining
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, role });
    });

    return () => {
      socket.off(SOCKET_EVENTS.PEER_DISCONNECTED);
      cleanup();
    };
  }, [roomId, role, cleanup]);

  const createPeerConnection = useCallback((socket: any) => {
    if (pcRef.current) {
      console.log('PeerConnection already exists. Recreating...');
      cleanup();
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;
    setConnectionStatus('connecting');

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit(SOCKET_EVENTS.ICE_CANDIDATE, { roomId, candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      console.log('PeerConnection status changed:', pc.connectionState);
      switch (pc.connectionState) {
        case 'connected':
          setConnectionStatus('connected');
          setError(null);
          break;
        case 'disconnected':
        case 'failed':
          setConnectionStatus('error');
          setError('Signaling connection lost or WebRTC negotiation failed. Reconnecting...');
          break;
        case 'closed':
          setConnectionStatus('disconnected');
          break;
        default:
          break;
      }
    };

    return pc;
  }, [roomId, cleanup]);

  // SENDER PORTION
  const startBroadcasting = useCallback(async (
    webcamStream: MediaStream | null, 
    screenStream: MediaStream | null
  ) => {
    const socket = socketService.getSocket();
    if (!socket) {
      setError('Socket connection not initialized');
      return;
    }

    try {
      console.log('Starting WebRTC broadcasting pipeline...');
      const pc = createPeerConnection(socket);

      if (webcamStream) {
        console.log('Adding webcam tracks, stream ID:', webcamStream.id);
        webcamStream.getTracks().forEach(track => {
          pc.addTrack(track, webcamStream);
        });
      }

      if (screenStream) {
        console.log('Adding screen share tracks, stream ID:', screenStream.id);
        screenStream.getTracks().forEach(track => {
          pc.addTrack(track, screenStream);
        });
      }

      // Relay metadata first so host knows which stream is which
      socket.emit(SOCKET_EVENTS.STREAM_META, {
        roomId,
        meta: {
          webcamStreamId: webcamStream?.id || '',
          screenStreamId: screenStream?.id || ''
        }
      });

      const offer = await pc.createOffer({
        offerToReceiveAudio: false,
        offerToReceiveVideo: false
      });
      await pc.setLocalDescription(offer);

      socket.emit(SOCKET_EVENTS.OFFER, { roomId, sdp: offer });
    } catch (err: any) {
      console.error('Error in broadcasting setup:', err);
      setError('Failed to setup media channels: ' + err.message);
      setConnectionStatus('error');
    }
  }, [roomId, createPeerConnection]);

  // SENDER SIGNALS LISTENER
  useEffect(() => {
    if (role !== 'sender') return;

    const socket = socketService.getSocket();
    if (!socket) return;

    const handleAnswer = async (payload: { sdp: RTCSessionDescriptionInit }) => {
      console.log('SDP Answer received from host');
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        } catch (err: any) {
          console.error('Error applying answer SDP:', err);
          setError('Failed to apply signaling handshake: ' + err.message);
        }
      }
    };

    const handleIceCandidate = async (payload: { candidate: RTCIceCandidateInit }) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate on sender:', err);
        }
      }
    };

    socket.on(SOCKET_EVENTS.ANSWER, handleAnswer);
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate);

    return () => {
      socket.off(SOCKET_EVENTS.ANSWER, handleAnswer);
      socket.off(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate);
    };
  }, [role]);

  // RECEIVER PORTION
  useEffect(() => {
    if (role !== 'receiver') return;

    const socket = socketService.getSocket();
    if (!socket) return;

    socket.on(SOCKET_EVENTS.STREAM_META, (meta: StreamMetaPayload) => {
      console.log('Mapped remote stream ids:', meta);
      setStreamMeta(meta);
    });

    const handleOffer = async (payload: { sdp: RTCSessionDescriptionInit }) => {
      console.log('SDP Offer received from client');
      try {
        const pc = createPeerConnection(socket);

        pc.ontrack = (event) => {
          const stream = event.streams[0];
          if (!stream) return;
          console.log(`Received remote track: ${event.track.kind} of Stream ID: ${stream.id}`);
          setRemoteStreams((prev) => ({
            ...prev,
            [stream.id]: stream
          }));
        };

        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));

        console.log('Creating Answer SDP');
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        socket.emit(SOCKET_EVENTS.ANSWER, { roomId, sdp: answer });

        while (pendingCandidates.current.length > 0) {
          const candidate = pendingCandidates.current.shift();
          if (candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          }
        }
      } catch (err: any) {
        console.error('Error processing SDP offer:', err);
        setError('Failed to setup connection stream: ' + err.message);
        setConnectionStatus('error');
      }
    };

    const handleIceCandidate = async (payload: { candidate: RTCIceCandidateInit }) => {
      if (pcRef.current && pcRef.current.remoteDescription) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err) {
          console.error('Error adding ICE candidate on host:', err);
        }
      } else {
        pendingCandidates.current.push(payload.candidate);
      }
    };

    socket.on(SOCKET_EVENTS.OFFER, handleOffer);
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate);

    return () => {
      socket.off(SOCKET_EVENTS.STREAM_META);
      socket.off(SOCKET_EVENTS.OFFER, handleOffer);
      socket.off(SOCKET_EVENTS.ICE_CANDIDATE, handleIceCandidate);
    };
  }, [role, roomId, createPeerConnection]);

  const sendReadySignal = useCallback(() => {
    const socket = socketService.getSocket();
    if (socket) {
      console.log('Emitting client-ready signals to trigger negotiation');
      socket.emit(SOCKET_EVENTS.JOIN_ROOM, { roomId, role });
    }
  }, [roomId, role]);

  return {
    connectionStatus,
    error,
    webcamStream: streamMeta ? remoteStreams[streamMeta.webcamStreamId] || null : null,
    screenStream: streamMeta ? remoteStreams[streamMeta.screenStreamId] || null : null,
    startBroadcasting,
    sendReadySignal,
    cleanup
  };
};
