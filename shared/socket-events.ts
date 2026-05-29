export const SOCKET_EVENTS = {
  JOIN_ROOM: 'join-room',
  PEER_READY: 'peer-ready',
  OFFER: 'offer',
  ANSWER: 'answer',
  ICE_CANDIDATE: 'ice-candidate',
  STREAM_META: 'stream-meta',
  PEER_DISCONNECTED: 'peer-disconnected',
} as const;

export type SocketRole = 'sender' | 'receiver';

export interface JoinRoomPayload {
  roomId: string;
  role: SocketRole;
}

export interface StreamMetaPayload {
  webcamStreamId: string;
  screenStreamId: string;
}

export interface SignalingPayload {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}
