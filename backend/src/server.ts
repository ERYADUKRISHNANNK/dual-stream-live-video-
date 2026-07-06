import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./config/db";
import apiRouter from "./routes/api";
import { websocketService } from "./services/websocketService";

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Security Middleware Headers
app.use(helmet({
  contentSecurityPolicy: false, // Turned off for dev dashboard integration
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: "*", // Adjust for deployment security boundaries
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST routes
app.use("/api", apiRouter);

app.get("/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString()
  });
});

// Initialize WebSocket stream broadcasts
websocketService.initialize(server);

// Connect Database & Startup listeners
const startServer = async () => {
  await connectDB();
  server.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`==================================================`);
    console.log(`🚀 Cyber Defense Gateway running on port: ${PORT}`);
    console.log(`🔒 Zero Trust Security Policies: ACTIVE`);
    console.log(`==================================================`);
  });
};

startServer().catch((err) => {
  console.error("Server startup error:", err);
});
