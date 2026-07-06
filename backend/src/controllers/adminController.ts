import { Response } from "express";
import os from "os";
import { User } from "../models/User";
import { FileDocument } from "../models/FileDocument";
import { AuditLog } from "../models/AuditLog";
import { blockchainService } from "../services/blockchainService";

export const getSystemHealth = async (req: any, res: Response) => {
  try {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const cpuCores = os.cpus().length;
    const loadAverage = os.loadavg();

    const userCount = await User.countDocuments();
    const fileCount = await FileDocument.countDocuments();
    const auditCount = await AuditLog.countDocuments();

    const blockchainStatus = blockchainService.getBlockchainStatus();

    return res.json({
      system: {
        cpuCores,
        loadAverage,
        memory: {
          totalBytes: totalMemory,
          usedBytes: usedMemory,
          freeBytes: freeMemory,
          percentUsed: Math.round((usedMemory / totalMemory) * 100)
        },
        uptimeSeconds: Math.round(os.uptime()),
        hostname: os.hostname(),
        platform: os.platform()
      },
      stats: {
        userCount,
        fileCount,
        auditCount
      },
      blockchain: blockchainStatus,
      ipfs: {
        status: "ACTIVE",
        gateway: "Local/Pinata Cloud Hybrid",
        pinnedNodesCount: 1
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateRole = async (req: any, res: Response) => {
  const { userId, role } = req.body;
  try {
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "Target user not found." });
    }

    const previousRole = targetUser.role;
    targetUser.role = role;
    await targetUser.save();

    await AuditLog.create({
      action: "POLICY_UPDATE",
      userId: req.user._id,
      username: req.user.username,
      ip: req.ip || "127.0.0.1",
      details: `Updated role of User ${targetUser.username} from ${previousRole} to ${role}`,
      status: "SUCCESS"
    });

    return res.json({ message: "Role modified successfully.", user: targetUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const updateIPWhitelist = async (req: any, res: Response) => {
  const { userId, whitelistedIps } = req.body;
  try {
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ error: "User not found." });
    }

    targetUser.whitelistedIps = whitelistedIps;
    await targetUser.save();

    await AuditLog.create({
      action: "POLICY_UPDATE",
      userId: req.user._id,
      username: req.user.username,
      ip: req.ip || "127.0.0.1",
      details: `IP Whitelist updated for ${targetUser.username} to [${whitelistedIps.join(", ")}]`,
      status: "SUCCESS"
    });

    return res.json({ message: "IP whitelist updated successfully.", user: targetUser });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};

export const getAllUsers = async (req: any, res: Response) => {
  try {
    const users = await User.find({}, "-passwordHash");
    return res.json(users);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
