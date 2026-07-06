# AI-Powered Secure Decentralized File Sharing & Cyber Defense Platform

An enterprise-ready, production-grade cybersecurity and decentralized file vault sharing system. It enforces a strict **Zero Trust Architecture** and coordinates dynamic **AI Threat Analysis**, **Hybrid Client Encryptions**, **IPFS file pinning**, and **EVM Smart Contract** integrity audits.

---

## Key Features

1. **AI Security Engine (FastAPI)**:
   - Heuristic Malware & Trojan scans.
   - Shannon Entropy analysis for Packed Ransomware checks.
   - Custom regex PII scan matching Social Security, Credit Cards, PAN, Aadhaar, and Passports.
   - Steganography analyzer matching ZIP header structures appended inside JPEG/PNG blocks.
   - MITRE ATT&CK Mapping & threat feeds integration.
2. **Zero Trust Gateway (Express + TypeScript)**:
   - Continuous Behavioral Biometric scoring (Typing dynamics & mouse acceleration deviations).
   - Network IP Whitelists & Concurrent Session limits.
   - Dynamic ABAC (Auditor time locks) & RBAC role guards.
   - Impossible geographic velocity travel detection.
3. **Hybrid Encryption Architecture**:
   - Files encrypted in-memory using AES-256-GCM.
   - Generated AES keys wrapped using user's RSA-4096 public key.
   - ECDSA digital signatures recorded on EVM blocks.
   - Post-Quantum Cryptography (PQC) readiness simulations (Kyber-1024 KEM).
4. **Decentralized Ledger & Storage**:
   - Local Hardhat network registry storing hashes, DIDs, and permissions.
   - IPFS integration with Pinata Cloud service and modular local storage fallbacks.
5. **Security Operations Center (SOC) Dashboard**:
   - Real-time event streams utilizing WebSockets.
   - Interactive Recharts ingress logs.
   - Dynamic compliance meters for GDPR (Art 32/33), ISO 27001 (A.8), and NIST CSF (PR.AC).
   - Interactive AI Security Copilot responding to forensics, compliance, and mitigation inquiries.

---

## System Architecture

```text
               +--------------------------------------+
               |    React Frontend (Cyberpunk UI)     |
               +------------------+-------------------+
                                  |
                        HTTPS / WebSockets / JWT
                                  |
                                  v
               +------------------+-------------------+
               |  Express Gatekeeper (Zero Trust)     |
               +--------+---------+---------+---------+
                        |         |         |
      HTTP / Scikit-learn|         |         | Mongoose
                        v         | JSON-RPCv
     +--------------------+       |    +----+------------+
     | FastAPI AI Engine  |       |    |  MongoDB Atlas  |
     +--------------------+       |    +-----------------+
                                  v
                       +----------+-----------+
                       | EVM Network (Hardhat)|
                       +----------+-----------+
                                  |
                                  v
                       +----------+-----------+
                       |    IPFS / Pinata     |
                       +----------------------+
```

---

## Database Schemas (MongoDB)

### 1. User (`User`)
- `username`: String (Unique, Indexed)
- `passwordHash`: String
- `email`: String (Unique)
- `role`: String ("Super Admin", "Admin", "SOC Analyst", "Auditor", "User", etc.)
- `didAddress`: String (EVM Wallet address)
- `rsaPublicKey`: String (SPKI PEM)
- `whitelistedIps`: Array[String]
- `fingerprintBase`: String

### 2. FileDocument (`FileDocument`)
- `fileName`: String
- `fileSize`: Number
- `cid`: String (Unique IPFS Address)
- `fileHash`: String (SHA-256 Digest, Indexed)
- `owner`: ObjectId ref `User`
- `encryptedAesKey`: String (Wrapped RSA key)
- `iv`: String (Hex)
- `digitalSignature`: String (ECDSA signed)
- `blockchainTxHash`: String
- `sharedWith`: Array[{ accessor: ObjectId, validUntil: Date, maxDownloads: Number, downloadCount: Number }]

---

## API Documentation

### Authentication APIs
- `POST /api/auth/register` - Create user credentials and generate RSA keys.
- `POST /api/auth/login` - Verify password, log session, check telemetry, issue JWT token.
- `POST /api/auth/wallet` - Bind wallet address and register DID.

### File APIs
- `POST /api/files/upload` - Accept file upload, trigger FastAPI scan, encrypt payload, push to IPFS, register on Hardhat contract.
- `GET /api/files/download/:fileId` - Verify ownership/share rules, verify access on contract, retrieve IPFS CID, verify checksum hash, decrypt buffer.
- `POST /api/files/share` - Set dynamic access control sharing parameters.

### Forensic & SOC APIs
- `GET /api/forensics/timeline` - Retrieve alerts and audit timelines.
- `GET /api/compliance/report` - Scorecard indices for ISO 27001, GDPR, and NIST CSF.
- `POST /api/copilot/query` - Request mitigation checklists and explain incidents.

---

## Smart Contract Architecture (Solidity)

### 1. `FileRegistry.sol`
- `registerFile(fileId, cid, fileHash, threatScore, signature)`: Records metadata parameters.
- `grantAccess(fileId, accessor, duration, maxDownloads)`: Adds user to share lists.
- `revokeAccess(fileId, accessor)`: Removes access rights.
- `verifyAccess(fileId, accessor)`: Increments verify logs and checks time limits.
- `setEmergencyLock(state)`: Stops registry transactions in case of system alerts.

### 2. `DecentralizedID.sol`
- `registerDID(didUri, publicKey)`: Stores DIDs mapped to owner keys.

---

## Local Setup & Installation

### Prerequisites
- Node.js (v18+)
- Python (3.9+)
- MongoDB (Running locally on 27017 or Atlas connection URL)

### 1. Blockchain Setup
```bash
cd blockchain
npm install
# Compile smart contracts
npm run compile
# Start local Hardhat network node
npm run node
```

### 2. Deploy Contracts
In a new terminal window inside the `blockchain` directory:
```bash
npm run deploy:local
```
*This deploys the contracts and automatically writes the deployed addresses to the backend configuration directory.*

### 3. AI Security Engine Setup
```bash
cd ai_engine
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
# Start FastAPI server
python app/main.py
```

### 4. Backend Gateway Setup
```bash
cd backend
npm install
# Configure environment variables in .env if needed
# Start dev gateway server
npm run dev
```

### 5. Frontend Client Setup
```bash
cd frontend
npm install
# Start client dashboard server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) inside your web browser.

---

## Deployment (Docker Compose)
To compile and launch all containers (Mongo, FastAPI engine, Express Gateway, Nginx Frontend) in a unified network:
```bash
docker-compose up --build
```
The React frontend dashboard will be available on port `3000`, the express backend on port `5000`, and FastAPI on port `8000`.
