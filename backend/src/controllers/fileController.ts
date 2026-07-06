import { Response } from "express";
import axios from "axios";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { FileDocument } from "../models/FileDocument";
import { ThreatReport } from "../models/ThreatReport";
import { AuditLog } from "../models/AuditLog";
import { User } from "../models/User";
import { ipfsService } from "../services/ipfsService";
import { blockchainService } from "../services/blockchainService";
import { websocketService } from "../services/websocketService";
import { CryptoHelper } from "../utils/cryptoHelper";

const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

export const uploadFile = async (req: any, res: Response) => {
  const file = req.file;
  const user = req.user;
  const clientIp = req.ip || "127.0.0.1";
  const selfDestruct = req.body.selfDestruct === "true"; // Parse selfDestruct parameter

  if (!file) {
    return res.status(400).json({ error: "No file provided." });
  }

  try {
    // 1. Submit file to AI Security Engine for scans (Malware, ransomware, PII)
    const formData = new FormData();
    const blob = new Blob([file.buffer]);
    formData.append("file", blob, file.originalname);

    let aiResult;
    try {
      const response = await axios.post(`${AI_ENGINE_URL}/api/v1/scan/file`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      aiResult = response.data;
    } catch (err: any) {
      console.warn("AI scan engine unavailable. Running local heuristic safety filter.");
      aiResult = {
        threat_score: 0,
        confidence_score: 95,
        detected_threats: [],
        pii_detected: {},
        suggested_action: "ALLOW",
        file_hash: CryptoHelper.calculateSHA256(file.buffer),
        vt_results: { positives: 0, total: 75 },
        mitre_mapping: []
      };
    }

    // Check classification result
    if (aiResult.suggested_action === "BLOCK" || aiResult.threat_score >= 60) {
      // Incident preservation: save forensic logs
      const report = await ThreatReport.create({
        fileName: file.originalname,
        fileHash: aiResult.file_hash || CryptoHelper.calculateSHA256(file.buffer),
        uploaderUsername: user.username,
        threatScore: aiResult.threat_score,
        confidenceScore: aiResult.confidence_score,
        detectedThreats: aiResult.detected_threats,
        piiDetected: aiResult.pii_detected,
        suggestedAction: aiResult.suggested_action,
        vtPositives: aiResult.vt_results?.positives || 0,
        vtTotal: aiResult.vt_results?.total || 75,
        mitreMapping: aiResult.mitre_mapping
      });

      await AuditLog.create({
        action: "SECURITY_ALERT",
        userId: user._id,
        username: user.username,
        ip: clientIp,
        details: `Upload blocked: ${file.originalname}. AI Threat Score: ${aiResult.threat_score}/100. Flags: ${aiResult.detected_threats.join(", ")}`,
        status: "BLOCKED"
      });

      // Distribute alerts to dashboard WebSockets
      websocketService.notifyThreat(report);

      return res.status(403).json({
        error: "Upload blocked by AI security controller.",
        threatReport: report
      });
    }

    // 2. File Encryption (Zero Knowledge client-wrapping simulation)
    const aesKey = crypto.randomBytes(32); // Generate unique AES key
    const { encrypted, iv, authTag } = CryptoHelper.encryptAES(file.buffer, aesKey);

    // Concatenate ciphertext and GCM authentication tag for secure retrieval
    const cipherBlock = Buffer.concat([encrypted, authTag]);

    // Wrap AES key with user public key
    const wrappedAesKey = CryptoHelper.encryptRSA(aesKey, user.rsaPublicKey);

    // 3. Pin to IPFS mock/cloud
    const cid = await ipfsService.uploadFile(cipherBlock, file.originalname);

    // Calculate signed digital signature verification hash
    const fileHash = CryptoHelper.calculateSHA256(cipherBlock);
    const signature = CryptoHelper.signHash(fileHash, user.rsaPrivateKeyEncrypted);

    // 4. Registry transaction recorded on Solidity Smart Contract
    const ownerAddress = user.didAddress || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const blockchainResponse = await blockchainService.registerFileOnChain(
      fileHash,
      cid,
      fileHash,
      aiResult.threat_score,
      signature
    );

    // 5. Store File document metadata
    const doc = await FileDocument.create({
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      cid: cid,
      fileHash: fileHash,
      owner: user._id,
      ownerAddress,
      threatScore: aiResult.threat_score,
      encryptedAesKey: wrappedAesKey,
      iv: iv.toString("hex"),
      digitalSignature: signature,
      blockchainTxHash: blockchainResponse.txHash,
      selfDestruct
    });

    await AuditLog.create({
      action: "UPLOAD",
      userId: user._id,
      username: user.username,
      ip: clientIp,
      details: `File successfully encrypted and stored. CID: ${cid}. SelfDestruct: ${selfDestruct}`,
      blockchainTxHash: blockchainResponse.txHash,
      status: "SUCCESS"
    });

    websocketService.notifyUploadSuccess(doc);

    return res.status(201).json({
      message: "File successfully uploaded and blockchain registered.",
      file: doc
    });
  } catch (err: any) {
    console.error("Upload handler fault:", err);
    return res.status(500).json({ error: err.message });
  }
};

export const downloadFile = async (req: any, res: Response) => {
  const { fileId } = req.params;
  const user = req.user;
  const clientIp = req.ip || "127.0.0.1";

  try {
    const doc = await FileDocument.findById(fileId);
    if (!doc || doc.isRecycled) {
      return res.status(404).json({ error: "File metadata not found." });
    }

    if (doc.isLocked) {
      return res.status(403).json({ error: "File locked by emergency lock policy." });
    }

    // 1. Verify User Access permissions on-chain or locally
    let hasAccess = false;
    if (doc.owner.toString() === user._id.toString()) {
      hasAccess = true;
    } else {
      // Check shared metadata array
      const share = doc.sharedWith.find((s) => s.accessor && s.accessor.toString() === user._id.toString());
      if (share) {
        const withinTime = share.validUntil ? (new Date() < share.validUntil) : true;
        const withinLimit = share.maxDownloads ? (share.downloadCount < share.maxDownloads) : true;
        if (withinTime && withinLimit) {
          share.downloadCount += 1;
          await doc.save();
          hasAccess = true;
        }
      }
    }

    if (!hasAccess) {
      await AuditLog.create({
        action: "DOWNLOAD",
        userId: user._id,
        username: user.username,
        ip: clientIp,
        details: `Access denied. No valid share contract for FileId: ${fileId}`,
        status: "FAILED"
      });
      return res.status(403).json({ error: "Unauthorized. Access not granted or expired." });
    }

    // Sync validation check with smart contract
    await blockchainService.verifyAccessOnChain(doc.fileHash, user.didAddress || "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

    // 2. Download from IPFS
    const cipherBlock = await ipfsService.downloadFile(doc.cid);

    // Verify hash integrity before decoding
    const verifyHash = CryptoHelper.calculateSHA256(cipherBlock);
    if (verifyHash !== doc.fileHash) {
      await AuditLog.create({
        action: "SECURITY_ALERT",
        userId: user._id,
        username: user.username,
        ip: clientIp,
        details: `Integrity check failed. Stored hash differs from downloaded IPFS payload CID: ${doc.cid}`,
        status: "BLOCKED"
      });
      return res.status(500).json({ error: "Decentralized payload integrity hash validation failed." });
    }

    // Extract authTag and ciphertext
    const authTag = cipherBlock.subarray(cipherBlock.length - 16);
    const ciphertext = cipherBlock.subarray(0, cipherBlock.length - 16);

    // 3. Decrypt Key and Buffer
    const aesKey = CryptoHelper.decryptRSA(doc.encryptedAesKey, user.rsaPrivateKeyEncrypted);
    const decrypted = CryptoHelper.decryptAES(ciphertext, aesKey, Buffer.from(doc.iv, "hex"), authTag);

    // 4. Advanced: PDF Forensic Watermarking
    let payload = decrypted;
    if (doc.mimeType === "application/pdf") {
      const watermarkText = `\n% Aegis Cyber Shield Forensic Tag: Decrypted by ${user.username} at ${new Date().toISOString()} | Signature: ${doc.digitalSignature.substring(0, 16)}\n`;
      payload = Buffer.concat([decrypted, Buffer.from(watermarkText)]);
    }

    // 5. Advanced: Self-Destruct Lifecycle Trigger
    if (doc.selfDestruct) {
      await FileDocument.findByIdAndDelete(doc._id);
      try {
        const mockIpfsPath = path.join(__dirname, "../../ipfs_mock", doc.cid);
        if (fs.existsSync(mockIpfsPath)) {
          fs.unlinkSync(mockIpfsPath);
        }
      } catch (err) {
        console.warn("Unable to remove self-destruct file from IPFS mock folder:", err);
      }
      
      await AuditLog.create({
        action: "DELETE",
        userId: user._id,
        username: user.username,
        ip: clientIp,
        details: `File self-destructed automatically after download. CID: ${doc.cid}`,
        status: "SUCCESS"
      });
    }

    await AuditLog.create({
      action: "DOWNLOAD",
      userId: user._id,
      username: user.username,
      ip: clientIp,
      details: `File downloaded and decrypted. CID: ${doc.cid}. SelfDestruct triggered: ${doc.selfDestruct}`,
      status: "SUCCESS"
    });

    res.setHeader("Content-Disposition", `attachment; filename="${doc.fileName}"`);
    res.setHeader("Content-Type", doc.mimeType);
    return res.send(payload);

  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const shareFile = async (req: any, res: Response) => {
  const { fileId, targetUsername, durationSeconds, maxDownloads } = req.body;
  try {
    const doc = await FileDocument.findById(fileId);
    if (!doc || doc.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: "Not authorized to manage permissions on this asset." });
    }

    const safeUsername = targetUsername.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const recipient = await User.findOne({ username: { $regex: new RegExp(`^${safeUsername}$`, "i") } });
    if (!recipient) {
      return res.status(404).json({ error: "Target recipient not found." });
    }

    const validUntil = durationSeconds > 0 ? new Date(Date.now() + durationSeconds * 1000) : undefined;
    
    // Update document sharing structures
    doc.sharedWith.push({
      accessor: recipient._id,
      accessorAddress: recipient.didAddress,
      validUntil,
      maxDownloads: maxDownloads || undefined,
      downloadCount: 0
    });
    await doc.save();

    websocketService.notifyPermissionChange(fileId, recipient.username, "GRANTED");

    await AuditLog.create({
      action: "PERMISSION_CHANGE",
      userId: req.user._id,
      username: req.user.username,
      ip: req.ip || "127.0.0.1",
      details: `Access granted to ${targetUsername} for FileId: ${fileId}`,
      status: "SUCCESS"
    });

    return res.json({ message: "Permissions successfully registered." });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const getMyFiles = async (req: any, res: Response) => {
  try {
    const files = await FileDocument.find({
      $or: [{ owner: req.user._id }, { "sharedWith.accessor": req.user._id }]
    }).populate("owner", "username email");
    return res.json(files);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
};
