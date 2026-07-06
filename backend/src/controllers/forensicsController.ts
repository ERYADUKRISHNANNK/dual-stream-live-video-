import { Response } from "express";
import axios from "axios";
import { ThreatReport } from "../models/ThreatReport";
import { AuditLog } from "../models/AuditLog";
import { FileDocument } from "../models/FileDocument";
import { CryptoHelper } from "../utils/cryptoHelper";

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

export const getForensicsTimeline = async (req: any, res: Response) => {
  try {
    const threats = await ThreatReport.find().sort({ createdAt: -1 }).limit(10);
    const audits = await AuditLog.find({ action: { $in: ["LOGIN", "UPLOAD", "DOWNLOAD", "PERMISSION_CHANGE", "SECURITY_ALERT"] } })
      .sort({ createdAt: -1 })
      .limit(30);

    const timeline = [
      ...threats.map((t) => ({
        id: t._id,
        type: "THREAT",
        title: `Threat Blocked: ${t.fileName}`,
        description: `Flagged: ${t.detectedThreats.join(", ")}. Score: ${t.threatScore}/100. Action: ${t.suggestedAction}`,
        timestamp: t.createdAt,
        severity: t.threatScore >= 60 ? "CRITICAL" : "HIGH",
        user: t.uploaderUsername
      })),
      ...audits.map((a) => ({
        id: a._id,
        type: "AUDIT",
        title: `Audit log: ${a.action}`,
        description: a.details,
        timestamp: a.timestamp,
        severity: a.status === "BLOCKED" || a.status === "FAILED" ? "WARNING" : "INFO",
        user: a.username
      }))
    ];

    // Sort combined records descending
    timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return res.json(timeline);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getComplianceReport = async (req: any, res: Response) => {
  try {
    const totalFiles = await FileDocument.countDocuments();
    const threatLogsCount = await ThreatReport.countDocuments({ status: "ACTIVE" });
    const blockedLogins = await AuditLog.countDocuments({ action: "LOGIN", status: "FAILED" });
    const policyChanges = await AuditLog.countDocuments({ action: "POLICY_UPDATE" });

    // Calculate simulated compliance scorecard metrics based on settings
    const gdprScore = Math.max(100 - (threatLogsCount * 5), 45); // Affected by active unmitigated alerts
    const isoScore = Math.min(60 + (totalFiles > 0 ? 20 : 0) + (policyChanges > 0 ? 20 : 0), 100);
    const nistScore = Math.max(100 - (blockedLogins * 2), 70);

    return res.json({
      scorecard: {
        gdpr: gdprScore,
        iso27001: isoScore,
        nistCSF: nistScore,
        overall: Math.round((gdprScore + isoScore + nistScore) / 3)
      },
      auditChecks: [
        { control: "GDPR Art 32", status: "COMPLIANT", description: "Encryption of personal data implemented (AES-256-GCM + RSA key wrap)." },
        { control: "GDPR Art 33", status: threatLogsCount > 0 ? "ACTION_REQUIRED" : "COMPLIANT", description: "Breach notification alerts linked to live WebSockets." },
        { control: "ISO 27001 A.8", status: "COMPLIANT", description: "Audit trail log stored with ledger receipts." },
        { control: "NIST CSF PR.AC", status: "COMPLIANT", description: "Zero Trust parameters verify geographic ingress logs." }
      ]
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const chatCopilot = async (req: any, res: Response) => {
  const { query, fileId } = req.body;
  try {
    let context: any = {};
    if (fileId) {
      const doc = await FileDocument.findById(fileId);
      if (doc) {
        context = {
          file_name: doc.fileName,
          threat_score: doc.threatScore,
          detected_threats: doc.threatScore > 0 ? ["Simulated Threat Indicators"] : [],
          file_hash: doc.fileHash
        };
      }
    }

    const response = await axios.post(`${AI_ENGINE_URL}/api/v1/copilot/chat`, {
      query,
      context
    });

    return res.json(response.data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
