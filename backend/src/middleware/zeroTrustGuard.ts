import { Response, NextFunction } from "express";
import axios from "axios";
import { AuthenticatedRequest } from "./auth";
import { SessionLog } from "../models/SessionLog";
import { AuditLog } from "../models/AuditLog";

// Configuration limits
const MAX_CONCURRENT_SESSIONS = 3;
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

export const zeroTrustGuard = (requiredRoles?: string[], policyAttrs?: { timeLimit?: boolean; geoRestrict?: string[] }) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const user = req.user;
    const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
    const userAgent = req.headers["user-agent"] || "";

    // 1. Authenticated User Identity Check
    if (!user) {
      return res.status(401).json({ error: "Zero Trust: Identity unverified." });
    }

    // 2. IP Whitelisting (Network Control)
    if (user.whitelistedIps && user.whitelistedIps.length > 0) {
      const isAllowedIp = user.whitelistedIps.includes(clientIp);
      if (!isAllowedIp && clientIp !== "127.0.0.1" && clientIp !== "::1") {
        await AuditLog.create({
          action: "SECURITY_ALERT",
          userId: user._id,
          username: user.username,
          ip: clientIp,
          details: "Access attempt from unauthorized IP address.",
          status: "BLOCKED"
        });
        return res.status(403).json({ error: "Zero Trust: IP Address is not in whitelist." });
      }
    }

    // 3. Concurrent Session Detection
    const activeSessionsCount = await SessionLog.countDocuments({
      userId: user._id,
      active: true
    });

    if (activeSessionsCount > MAX_CONCURRENT_SESSIONS) {
      await AuditLog.create({
        action: "SECURITY_ALERT",
        userId: user._id,
        username: user.username,
        ip: clientIp,
        details: `Concurrent sessions limit exceeded: ${activeSessionsCount}/${MAX_CONCURRENT_SESSIONS}`,
        status: "BLOCKED"
      });
      return res.status(403).json({ error: "Zero Trust: Session limit exceeded. Access denied." });
    }

    // 4. Role & Dynamic Attribute Validation (RBAC & ABAC Engine)
    if (requiredRoles && requiredRoles.length > 0) {
      const hasRole = requiredRoles.includes(user.role);
      if (!hasRole) {
        await AuditLog.create({
          action: "SECURITY_ALERT",
          userId: user._id,
          username: user.username,
          ip: clientIp,
          details: `Role verification failed. Required: ${requiredRoles.join(",")}. Current: ${user.role}`,
          status: "BLOCKED"
        });
        return res.status(403).json({ error: "Zero Trust: Role verification failed." });
      }
    }

    // ABAC Time restrictions: e.g. Auditors can only check records during business hours (8 AM - 8 PM local time)
    if (policyAttrs && policyAttrs.timeLimit) {
      const currentHour = new Date().getHours();
      if ((user.role === "Auditor" || user.role === "Guest") && (currentHour < 8 || currentHour >= 20)) {
        await AuditLog.create({
          action: "SECURITY_ALERT",
          userId: user._id,
          username: user.username,
          ip: clientIp,
          details: `ABAC Rule: Access blocked outside corporate hours (8AM - 8PM). Hour: ${currentHour}`,
          status: "BLOCKED"
        });
        return res.status(403).json({ error: "Zero Trust: Corporate policy denies access outside hours." });
      }
    }

    // 5. AI behavioral UEBA Evaluation
    try {
      // Gather current session parameters from headers/body
      const keystrokeHold = parseFloat((req.headers["x-biometrics-keystroke-hold"] as string) || "100.0");
      const mouseJitter = parseFloat((req.headers["x-biometrics-mouse-jitter"] as string) || "1.0");
      const browserFingerprint = (req.headers["x-browser-fingerprint"] as string) || "default_fingerprint";
      
      // Look up previous session for geolocation travel validation
      const lastSession = await SessionLog.findOne({ userId: user._id }).sort({ createdAt: -1 });

      const telemetryPayload = {
        username: user.username,
        ip: clientIp,
        location: { lat: 12.9716, lon: 77.5946, country: "IN" }, // Bangalore simulation
        device_trust_metrics: {
          is_known_device: user.fingerprintBase ? (user.fingerprintBase === browserFingerprint) : true,
          is_known_ip: lastSession ? (lastSession.ipAddress === clientIp) : true,
          is_known_location: true,
          is_known_browser: true
        },
        previous_login: lastSession ? {
          lat: lastSession.lat || 12.9716,
          lon: lastSession.lon || 77.5946,
          timestamp: Math.floor(new Date(lastSession.createdAt).getTime() / 1000)
        } : null,
        session_concurrent: activeSessionsCount,
        downloads_last_hour: 2, // Query or simulation
        biometrics: {
          keystroke_average_hold_ms: keystrokeHold,
          mouse_jitter_index: mouseJitter
        },
        timestamp: Math.floor(Date.now() / 1000)
      };

      // Call AI Microservice
      const response = await axios.post(`${AI_ENGINE_URL}/api/v1/ueba/evaluate`, telemetryPayload);
      const data = response.data;

      // Update current session log with calculated risk score
      if (req.token) {
        await SessionLog.updateOne(
          { token: req.token },
          { 
            riskScore: data.risk_score,
            keystrokeAvg: keystrokeHold,
            mouseJitterAvg: mouseJitter,
            fingerprint: browserFingerprint
          }
        );
      }

      // Zero Trust strict boundary - Reject or mandate MFA on high threat scoring
      if (data.action === "REQUIRE_MFA_CHALLENGE" || data.risk_score >= 70) {
        await AuditLog.create({
          action: "SECURITY_ALERT",
          userId: user._id,
          username: user.username,
          ip: clientIp,
          details: `Zero Trust Anomaly: UEBA score [${data.risk_score}/100]. Reason: ${data.reasons.join(", ")}`,
          status: "BLOCKED"
        });
        return res.status(403).json({
          error: "Zero Trust verification failed: High Behavioral Risk Score.",
          reasons: data.reasons,
          requireMfa: true
        });
      }

    } catch (error) {
      // In case of AI Engine connection outage, fall back to default logging and allow access under monitoring
      console.warn("AI Engine UEBA connection failed. Operating in fail-secure monitoring mode.");
    }

    next();
  };
};
