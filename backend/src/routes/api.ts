import { Router } from "express";
import multer from "multer";
import { authenticateJWT } from "../middleware/auth";
import { zeroTrustGuard } from "../middleware/zeroTrustGuard";
import { registerUser, loginUser, refreshAccessToken, logoutUser, linkWalletAddress, issueVerifiableCredential, verifyVerifiableCredential } from "../controllers/authController";
import { uploadFile, downloadFile, shareFile, getMyFiles } from "../controllers/fileController";
import { getSystemHealth, updateRole, updateIPWhitelist, getAllUsers } from "../controllers/adminController";
import { getForensicsTimeline, getComplianceReport, chatCopilot } from "../controllers/forensicsController";

const router = Router();
const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } }); // 50MB max file size

// Public Routes
router.post("/auth/register", registerUser);
router.post("/auth/login", loginUser);
router.post("/auth/refresh", refreshAccessToken);
router.post("/auth/logout", logoutUser);
router.post("/auth/issue-vc", authenticateJWT, zeroTrustGuard(["Super Admin", "Admin"]), issueVerifiableCredential);
router.post("/auth/verify-vc", authenticateJWT, verifyVerifiableCredential);

// Secure User Routes
router.post("/auth/wallet", authenticateJWT, linkWalletAddress);

router.get("/files/list", authenticateJWT, zeroTrustGuard(), getMyFiles);
router.post("/files/upload", authenticateJWT, upload.single("file"), zeroTrustGuard(), uploadFile);
router.get("/files/download/:fileId", authenticateJWT, zeroTrustGuard(), downloadFile);
router.post("/files/share", authenticateJWT, zeroTrustGuard(), shareFile);

// Forensics & Copilot APIs
router.get("/forensics/timeline", authenticateJWT, zeroTrustGuard(["Super Admin", "Admin", "Security Analyst", "SOC Analyst"]), getForensicsTimeline);
router.get("/compliance/report", authenticateJWT, zeroTrustGuard(["Super Admin", "Admin", "Auditor", "Compliance Officer"]), getComplianceReport);
router.post("/copilot/query", authenticateJWT, zeroTrustGuard(), chatCopilot);

// Admin / SIEM APIs
router.get("/admin/system-health", authenticateJWT, zeroTrustGuard(["Super Admin", "Admin"]), getSystemHealth);
router.get("/admin/users", authenticateJWT, zeroTrustGuard(["Super Admin", "Admin"]), getAllUsers);
router.post("/admin/update-role", authenticateJWT, zeroTrustGuard(["Super Admin"]), updateRole);
router.post("/admin/update-ip", authenticateJWT, zeroTrustGuard(["Super Admin", "Admin"]), updateIPWhitelist);

export default router;
