import { Request, Response } from "express";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User";
import { SessionLog } from "../models/SessionLog";
import { AuditLog } from "../models/AuditLog";
import { CryptoHelper } from "../utils/cryptoHelper";
import { blockchainService } from "../services/blockchainService";

const JWT_SECRET = process.env.JWT_SECRET || "SUPER_SECURE_CYBER_JWT_SECRET";

export const registerUser = async (req: Request, res: Response) => {
  const { username, password, email, role } = req.body;
  try {
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.status(400).json({ error: "Username or Email already registered." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    
    // Generate RSA key pair for client decrypt encapsulation
    const { publicKey, privateKey } = CryptoHelper.generateRSAKeyPair();

    const newUser = await User.create({
      username,
      passwordHash,
      email,
      role: role || "User",
      rsaPublicKey: publicKey,
      rsaPrivateKeyEncrypted: privateKey // In production this would be wrapped on client side
    });

    await AuditLog.create({
      action: "POLICY_UPDATE",
      username: newUser.username,
      ip: req.ip || "127.0.0.1",
      details: `New account registered. Role: ${newUser.role}`,
      status: "SUCCESS"
    });

    return res.status(201).json({
      message: "User account created successfully.",
      user: {
        id: newUser._id,
        username: newUser.username,
        role: newUser.role,
        rsaPublicKey: newUser.rsaPublicKey
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const loginUser = async (req: Request, res: Response) => {
  const { username, password, fingerprint } = req.body;
  const clientIp = req.ip || "127.0.0.1";
  try {
    const user = await User.findOne({ username });
    if (!user) {
      await AuditLog.create({
        action: "LOGIN",
        username,
        ip: clientIp,
        details: "Login failed: Username not found.",
        status: "FAILED"
      });
      return res.status(401).json({ error: "Invalid credentials." });
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      await AuditLog.create({
        action: "LOGIN",
        userId: user._id,
        username: user.username,
        ip: clientIp,
        details: "Login failed: Incorrect password.",
        status: "FAILED"
      });
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Zero Trust Check: Save Fingerprint if not present
    if (!user.fingerprintBase && fingerprint) {
      user.fingerprintBase = fingerprint;
      await user.save();
    }

    // Create access token (short-lived)
    const token = jwt.sign(
      { id: user._id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: "2h" }
    );

    // Create refresh token (long-lived) and store it with the user
    const REFRESH_SECRET = process.env.REFRESH_SECRET || "SUPER_SECURE_REFRESH_SECRET";
    const refreshToken = jwt.sign({ id: user._id }, REFRESH_SECRET, { expiresIn: "7d" });
    // Save refresh token to user record
    (user.refreshTokens = user.refreshTokens || []).push(refreshToken);
    await user.save();

    // Save session telemetry
    await SessionLog.create({
      userId: user._id,
      token,
      ipAddress: clientIp,
      userAgent: req.headers["user-agent"] || "",
      fingerprint: fingerprint || "",
      lat: 12.9716,
      lon: 77.5946,
      country: "IN"
    });

    await AuditLog.create({
      action: "LOGIN",
      userId: user._id,
      username: user.username,
      ip: clientIp,
      details: "Login verified.",
      status: "SUCCESS"
    });

    return res.json({
      token,
      refreshToken,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        didAddress: user.didAddress,
        rsaPublicKey: user.rsaPublicKey,
        privateKey: user.rsaPrivateKeyEncrypted
      }
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

export const linkWalletAddress = async (req: any, res: Response) => {
  const { walletAddress, didUri } = req.body;
  try {
    const user = req.user;
    user.didAddress = walletAddress;
    await user.save();

    // Register on-chain blockchain DID
    const txHash = await blockchainService.registerDIDOnChain(walletAddress, didUri || `did:ethr:${walletAddress}`, user.rsaPublicKey);

    await AuditLog.create({
      action: "PERMISSION_CHANGE",
      userId: user._id,
      username: user.username,
      ip: req.ip || "127.0.0.1",
      details: `Wallet address ${walletAddress} linked. DID Registered.`,
      blockchainTxHash: txHash,
      status: "SUCCESS"
    });

    return res.json({
      message: "DID Registered and wallet connected.",
      didAddress: walletAddress,
      txHash
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Simple Verifiable Credential (VC) issuer (prototype)
export const issueVerifiableCredential = async (req: any, res: Response) => {
  try {
    const { subjectId, claims, expiresInDays } = req.body;
    const issuer = req.user;
    if (!issuer) return res.status(401).json({ error: "Issuer identity required." });

    // For prototype, generate an ephemeral issuer keypair or reuse issuer's RSA public key as issuer id
    const issuerDid = issuer.didAddress || `did:local:${issuer._id}`;
    const { publicKey: issuerPublicKey, privateKey: issuerPrivateKey } = CryptoHelper.generateRSAKeyPair();

    const issuanceDate = new Date().toISOString();
    const expirationDate = new Date(Date.now() + ((expiresInDays || 365) * 24 * 60 * 60 * 1000)).toISOString();

    const vc = {
      '@context': ['https://www.w3.org/2018/credentials/v1'],
      id: `urn:uuid:${crypto.randomUUID()}`,
      type: ['VerifiableCredential', 'SecurityCredential'],
      issuer: issuerDid,
      issuanceDate,
      expirationDate,
      credentialSubject: {
        id: subjectId,
        claims: claims || {}
      }
    };

    // Sign VC by hashing the JSON and signing with issuer private key
    const vcBuffer = Buffer.from(JSON.stringify(vc));
    const vcHash = CryptoHelper.calculateSHA256(vcBuffer);
    const signature = CryptoHelper.signHash(vcHash, issuerPrivateKey);

    // Store issuance audit
    await AuditLog.create({
      action: 'ISSUE_VC',
      userId: issuer._id,
      username: issuer.username,
      ip: req.ip || '127.0.0.1',
      details: `VC issued to ${subjectId}`,
      status: 'SUCCESS'
    });

    return res.json({ vc, signature, issuerPublicKey });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Simple VC verification endpoint (prototype)
export const verifyVerifiableCredential = async (req: any, res: Response) => {
  try {
    const { vc, signature, issuerPublicKey } = req.body;
    if (!vc || !signature || !issuerPublicKey) return res.status(400).json({ error: 'vc, signature and issuerPublicKey required.' });

    const vcBuffer = Buffer.from(JSON.stringify(vc));
    const vcHash = CryptoHelper.calculateSHA256(vcBuffer);
    const valid = CryptoHelper.verifySignature(vcHash, signature, issuerPublicKey);

    await AuditLog.create({
      action: 'VERIFY_VC',
      username: (req.user && req.user.username) || 'anonymous',
      ip: req.ip || '127.0.0.1',
      details: `VC verification ${valid ? 'SUCCESS' : 'FAILED'}`,
      status: valid ? 'SUCCESS' : 'FAILED'
    });

    return res.json({ valid });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Refresh access token using refresh token
export const refreshAccessToken = async (req: any, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });

    const REFRESH_SECRET = process.env.REFRESH_SECRET || "SUPER_SECURE_REFRESH_SECRET";
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    } catch (err) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ error: "User not found" });

    // Check that the refresh token is in user's active list
    if (!user.refreshTokens || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ error: "Refresh token revoked" });
    }

    // Issue new access token and rotate refresh token
    const newAccessToken = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: "2h" });
    const newRefreshToken = jwt.sign({ id: user._id }, REFRESH_SECRET, { expiresIn: "7d" });

    // Replace the used refresh token with the new one
    user.refreshTokens = user.refreshTokens.filter((t: string) => t !== refreshToken);
    user.refreshTokens.push(newRefreshToken);
    await user.save();

    return res.json({ token: newAccessToken, refreshToken: newRefreshToken });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};

// Logout (revoke refresh token)
export const logoutUser = async (req: any, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: "refreshToken required" });

    const REFRESH_SECRET = process.env.REFRESH_SECRET || "SUPER_SECURE_REFRESH_SECRET";
    let decoded: any;
    try {
      decoded = jwt.verify(refreshToken, REFRESH_SECRET) as any;
    } catch (err) {
      return res.status(403).json({ error: "Invalid refresh token" });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(403).json({ error: "User not found" });

    user.refreshTokens = (user.refreshTokens || []).filter((t: string) => t !== refreshToken);
    await user.save();

    await AuditLog.create({ action: 'LOGOUT', userId: user._id, username: user.username, ip: req.ip || '127.0.0.1', details: 'User logged out', status: 'SUCCESS' });

    return res.json({ message: 'Logged out' });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};
