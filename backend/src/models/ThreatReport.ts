import { Schema, model } from "mongoose";
import { isDbOffline } from "../config/db";
import { MockThreatReport } from "./dbMock";

const ThreatReportSchema = new Schema(
  {
    fileName: { type: String, required: true },
    fileHash: { type: String, required: true, index: true },
    uploaderUsername: { type: String, required: true },
    threatScore: { type: Number, required: true },
    confidenceScore: { type: Number, required: true },
    detectedThreats: [{ type: String }],
    piiDetected: { type: Map, of: Number },
    suggestedAction: { type: String, required: true },
    vtPositives: { type: Number, default: 0 },
    vtTotal: { type: Number, default: 75 },
    mitreMapping: [
      {
        technique: String,
        name: String,
        tactic: String
      }
    ],
    status: { type: String, enum: ["ACTIVE", "MITIGATED", "FALSE_POSITIVE"], default: "ACTIVE" },
    actionTaken: { type: String, default: "FILE_BLOCKED" }
  },
  { timestamps: true }
);

const MongooseThreat = model("ThreatReport", ThreatReportSchema);

export const ThreatReport = new Proxy(MongooseThreat, {
  get(target, prop) {
    if (isDbOffline) {
      return (MockThreatReport as any)[prop];
    }
    return (target as any)[prop];
  }
}) as any;
