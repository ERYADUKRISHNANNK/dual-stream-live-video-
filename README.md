# DualStream Live Video Application

A full-stack, real-time, dual-stream live video application built with React (Vite, TypeScript), Express, and Socket.IO. The application lets a client stream their webcam video (embedded with a live digital clock timestamp via HTML Canvas) and screen sharing simultaneously to a host monitor dashboard with minimal latency using peer-to-peer WebRTC connections.

---

## Features

- **Real-Time Webcam Streaming**: Captures local camera stream and blends it with audio.
- **Canvas Timestamp Overlay**: Processes raw webcam video onto a hidden Canvas, rendering an HH:MM:SS clock capsule onto the frames in real-time (30 FPS), then capturing it as a custom video track.
- **Simultaneous Screen Sharing**: Captures desktop screen media tracks in parallel.
- **Single Connection Dual-Stream WebRTC**: Sends both media streams through a single `RTCPeerConnection` configuration.
- **Socket.IO Signaling Server**: Relays SDP configurations and ICE network candidates.
- **Responsive Dashboard UI**: Vanilla CSS dark-themed display console with connection health gauges.

---

## Project Structure

```text
├── client/          # React + Vite + TypeScript frontend
├── server/          # Node.js + Express + TypeScript signaling server
├── shared/          # Shared TypeScript event names and interfaces
├── README.md        # Setup guide
└── METHODOLOGY.md   # System architecture analysis
```

---

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher recommended)
- Modern web browser (Chrome, Firefox, Edge, Safari) with support for WebRTC and Screen Capture APIs.

### Setup Instructions

1. **Clone the project** to your local workspace directory.
2. **Install all dependencies** by running:
   ```bash
   npm install
   ```

*(Note: To install individual packages, you can run `npm install` inside both `/client` and `/server` directories)*.

---

## Running the Application

### 1. Start Backend Server
Navigate to the `server/` directory and spin up the TypeScript dev server (runs on Port `5000`):
```bash
cd server
npm run dev
```

### 2. Start Frontend App
Navigate to the `client/` directory and launch the Vite development server (runs on Port `5173`):
```bash
cd client
npm run dev
```

---

## Quick Testing Walkthrough

1. Open your browser and navigate to the frontend hub: `http://localhost:5173`.
2. Enter a room code (or use the default `default-room`).
3. Open **Start Broadcasting** in Tab A:
   - Click **Request & Preview Devices**.
   - Grant Webcam, Microphone, and Screen Share permissions in the browser prompt.
   - Verify the webcam preview shows a live digital timestamp clock (`HH:MM:SS`) in the top-right corner.
4. Open **Monitor Dashboard** in Tab B (or a private window):
   - Watch the signaling handshake establish automatically.
   - Verify that both streams (Webcam with timestamp + Screen share) are visible and playing in real-time with sub-second latency.
5. Close the Broadcaster Tab A; observe the Host Tab B update its status to "Client Disconnected". Reopening Tab A will automatically reconnect and resume the live stream feed.
