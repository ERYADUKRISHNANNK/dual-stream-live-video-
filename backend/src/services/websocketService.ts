import { WebSocketServer, WebSocket } from "ws";
import http from "http";

export class WebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();

  initialize(server: http.Server) {
    this.wss = new WebSocketServer({ server });
    
    this.wss.on("connection", (ws: WebSocket) => {
      this.clients.add(ws);
      console.log(`WebSocket connection registered. Total active: ${this.clients.size}`);

      ws.on("close", () => {
        this.clients.delete(ws);
        console.log(`WebSocket connection closed. Remaining: ${this.clients.size}`);
      });

      // Send greeting telemetry
      ws.send(JSON.stringify({
        type: "SYSTEM_GREETING",
        message: "Connected to SOC Cyber Defense Feed Stream.",
        timestamp: new Date().toISOString()
      }));
    });
  }

  broadcast(messageObj: any) {
    const payload = JSON.stringify(messageObj);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
  }

  notifyThreat(report: any) {
    this.broadcast({
      type: "THREAT_ALERT",
      payload: {
        fileName: report.fileName,
        threatScore: report.threatScore,
        confidenceScore: report.confidenceScore,
        detectedThreats: report.detectedThreats,
        piiDetected: report.piiDetected,
        suggestedAction: report.suggestedAction,
        uploader: report.uploaderUsername,
        timestamp: new Date().toISOString()
      }
    });
  }

  notifyUploadSuccess(file: any) {
    this.broadcast({
      type: "UPLOAD_SUCCESS",
      payload: {
        fileName: file.fileName,
        cid: file.cid,
        ownerAddress: file.ownerAddress,
        blockchainTx: file.blockchainTxHash,
        timestamp: new Date().toISOString()
      }
    });
  }

  notifyPermissionChange(fileId: string, accessor: string, type: string) {
    this.broadcast({
      type: "PERMISSION_CHANGE",
      payload: {
        fileId,
        accessor,
        type, // e.g. "GRANTED" | "REVOKED"
        timestamp: new Date().toISOString()
      }
    });
  }
}

export const websocketService = new WebSocketService();
