import { Schema, model } from "mongoose";
import { isDbOffline } from "../config/db";
import { MockSessionLog } from "./dbMock";

const SessionLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true },
    ipAddress: { type: String, required: true },
    userAgent: { type: String, default: "" },
    fingerprint: { type: String, default: "" },
    lat: { type: Number, default: 0.0 },
    lon: { type: Number, default: 0.0 },
    country: { type: String, default: "Unknown" },
    active: { type: Boolean, default: true },
    lastActive: { type: Date, default: Date.now },
    riskScore: { type: Number, default: 0 },
    keystrokeAvg: { type: Number, default: 100 },
    mouseJitterAvg: { type: Number, default: 1.0 }
  },
  { timestamps: true }
);

const MongooseSession = model("SessionLog", SessionLogSchema);

export const SessionLog = new Proxy(MongooseSession, {
  get(target, prop) {
    if (isDbOffline) {
      return (MockSessionLog as any)[prop];
    }
    return (target as any)[prop];
  }
}) as any;
