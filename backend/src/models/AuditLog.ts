import { Schema, model } from "mongoose";
import { isDbOffline } from "../config/db";
import { MockAuditLog } from "./dbMock";

const AuditLogSchema = new Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "LOGIN",
        "LOGOUT",
        "UPLOAD",
        "DOWNLOAD",
        "SHARE",
        "DELETE",
        "PERMISSION_CHANGE",
        "BLOCKCHAIN_TX",
        "SECURITY_ALERT",
        "POLICY_UPDATE",
        "MFA_CHALLENGE"
      ],
      index: true
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    username: { type: String, default: "system" },
    ip: { type: String, required: true },
    location: { type: String, default: "Unknown" },
    details: { type: String, default: "" },
    status: { type: String, enum: ["SUCCESS", "FAILED", "BLOCKED"], required: true },
    blockchainTxHash: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now, index: true }
  },
  { timestamps: true }
);

const MongooseAudit = model("AuditLog", AuditLogSchema);

export const AuditLog = new Proxy(MongooseAudit, {
  get(target, prop) {
    if (isDbOffline) {
      return (MockAuditLog as any)[prop];
    }
    return (target as any)[prop];
  }
}) as any;
