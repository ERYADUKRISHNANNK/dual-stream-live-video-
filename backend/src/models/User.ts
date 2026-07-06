import { Schema, model } from "mongoose";
import { isDbOffline } from "../config/db";
import { MockUser } from "./dbMock";

const UserSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    role: {
      type: String,
      enum: [
        "Super Admin",
        "Admin",
        "Security Analyst",
        "SOC Analyst",
        "Auditor",
        "Compliance Officer",
        "Guest",
        "User"
      ],
      default: "User"
    },
    didAddress: { type: String, default: "" }, // MetaMask address/DID pointer
    totpSecret: { type: String, default: "" },
    isMfaEnabled: { type: Boolean, default: false },
    rsaPublicKey: { type: String, default: "" }, // For file decryption wrapping
    rsaPrivateKeyEncrypted: { type: String, default: "" }, // Client-side wrapped keys
    fingerprintBase: { type: String, default: "" }, // Saved browser fingerprint comparison
    biometricsCadence: {
      keystrokeHoldAvg: { type: Number, default: 100 },
      mouseJitterMax: { type: Number, default: 2.0 }
    },
    whitelistedIps: [{ type: String }],
    refreshTokens: [{ type: String }],
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

const MongooseUser = model("User", UserSchema);

// Dynamic proxy failsafe router
export const User = new Proxy(MongooseUser, {
  get(target, prop) {
    if (isDbOffline) {
      return (MockUser as any)[prop];
    }
    return (target as any)[prop];
  }
}) as any;
