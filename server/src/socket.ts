import { Server, Socket } from 'socket.io';
import { SOCKET_EVENTS, JoinRoomPayload, StreamMetaPayload } from '../../shared/socket-events';

interface RoomState {
  senderId?: string;
  receiverId?: string;
}

const rooms = new Map<string, RoomState>();

const handleDisconnect = (socket: Socket, io: Server) => {
  for (const [roomId, state] of rooms.entries()) {
    if (state.senderId === socket.id) {
      console.log(`Sender ${socket.id} disconnected from room ${roomId}`);
      state.senderId = undefined;
      if (state.receiverId) {
        io.to(state.receiverId).emit(SOCKET_EVENTS.PEER_DISCONNECTED, { role: 'sender' });
      }
      if (!state.receiverId) {
        rooms.delete(roomId);
      }
    } else if (state.receiverId === socket.id) {
      console.log(`Receiver ${socket.id} disconnected from room ${roomId}`);
      state.receiverId = undefined;
      if (state.senderId) {
        io.to(state.senderId).emit(SOCKET_EVENTS.PEER_DISCONNECTED, { role: 'receiver' });
      }
      if (!state.senderId) {
        rooms.delete(roomId);
      }
    }
  }
};

export const initSocketHandler = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Handle joining room
    socket.on(SOCKET_EVENTS.JOIN_ROOM, (payload: JoinRoomPayload) => {
      const { roomId, role } = payload;
      socket.join(roomId);
      
      let state = rooms.get(roomId);
      if (!state) {
        state = {};
        rooms.set(roomId, state);
      }

      if (role === 'sender') {
        state.senderId = socket.id;
        console.log(`Sender registered: ${socket.id} in room ${roomId}`);
        // If receiver is already there, notify sender that host is ready to connect
        if (state.receiverId) {
          console.log(`Receiver ${state.receiverId} is already present. Notifying sender ${socket.id}`);
          socket.emit(SOCKET_EVENTS.PEER_READY);
        }
      } else if (role === 'receiver') {
        state.receiverId = socket.id;
        console.log(`Receiver registered: ${socket.id} in room ${roomId}`);
        // If sender is already there, notify sender that host is ready, initiating WebRTC
        if (state.senderId) {
          console.log(`Sender ${state.senderId} is present. Sending peer-ready to sender`);
          io.to(state.senderId).emit(SOCKET_EVENTS.PEER_READY);
        }
      }
    });

    // Signaling relay: Offer
    socket.on(SOCKET_EVENTS.OFFER, (payload: { roomId: string; sdp: any }) => {
      const { roomId, sdp } = payload;
      const state = rooms.get(roomId);
      if (state && state.receiverId) {
        io.to(state.receiverId).emit(SOCKET_EVENTS.OFFER, { sdp });
      }
    });

    // Signaling relay: Answer
    socket.on(SOCKET_EVENTS.ANSWER, (payload: { roomId: string; sdp: any }) => {
      const { roomId, sdp } = payload;
      const state = rooms.get(roomId);
      if (state && state.senderId) {
        io.to(state.senderId).emit(SOCKET_EVENTS.ANSWER, { sdp });
      }
    });

    // Signaling relay: ICE Candidate
    socket.on(SOCKET_EVENTS.ICE_CANDIDATE, (payload: { roomId: string; candidate: any }) => {
      const { roomId, candidate } = payload;
      const state = rooms.get(roomId);
      if (state) {
        if (socket.id === state.senderId && state.receiverId) {
          io.to(state.receiverId).emit(SOCKET_EVENTS.ICE_CANDIDATE, { candidate });
        } else if (socket.id === state.receiverId && state.senderId) {
          io.to(state.senderId).emit(SOCKET_EVENTS.ICE_CANDIDATE, { candidate });
        }
      }
    });

    // Signaling relay: Stream Metadata mapping
    socket.on(SOCKET_EVENTS.STREAM_META, (payload: { roomId: string; meta: StreamMetaPayload }) => {
      const { roomId, meta } = payload;
      const state = rooms.get(roomId);
      if (state && state.receiverId) {
        io.to(state.receiverId).emit(SOCKET_EVENTS.STREAM_META, meta);
      }
    });

    socket.on('disconnect', () => {
      handleDisconnect(socket, io);
    });
  });
};
