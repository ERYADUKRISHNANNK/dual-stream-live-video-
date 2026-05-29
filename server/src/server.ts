import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSocketHandler } from './socket';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST']
}));

app.use(express.json());

app.get('/', (req, res) => {
  res.send('WebRTC Signaling Server is online. Please use http://localhost:5173 to access the frontend client.');
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'WebRTC Signaling Server is running' });
});

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

initSocketHandler(io);

server.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(` Signaling Server running on port ${PORT} `);
  console.log(`=============================================`);
});
