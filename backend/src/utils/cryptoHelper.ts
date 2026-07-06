import crypto from "crypto";

export class CryptoHelper {
  // 1. AES-256 Symmetric Encryption (GCM mode)
  static encryptAES(data: Buffer, key: Buffer): { encrypted: Buffer; iv: Buffer; authTag: Buffer } {
    const iv = crypto.randomBytes(12); // GCM standard IV is 12 bytes
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    
    const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return { encrypted, iv, authTag };
  }

  static decryptAES(encrypted: Buffer, key: Buffer, iv: Buffer, authTag: Buffer): Buffer {
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  // 2. RSA-4096 Key Wrapping
  static generateRSAKeyPair(): { publicKey: string; privateKey: string } {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
      modulusLength: 4096,
      publicKeyEncoding: { type: "spki", format: "pem" },
      privateKeyEncoding: { type: "pkcs8", format: "pem" }
    });
    return { publicKey, privateKey };
  }

  static encryptRSA(data: Buffer, publicKeyPem: string): string {
    const buffer = crypto.publicEncrypt(
      {
        key: publicKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256"
      },
      data
    );
    return buffer.toString("base64");
  }

  static decryptRSA(encryptedBase64: string, privateKeyPem: string): Buffer {
    const buffer = Buffer.from(encryptedBase64, "base64");
    return crypto.privateDecrypt(
      {
        key: privateKeyPem,
        padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
        oaepHash: "sha256"
      },
      buffer
    );
  }

  // 3. Digital Signatures (ECDSA simulation / SHA-256 Hash signing)
  static calculateSHA256(data: Buffer): string {
    return crypto.createHash("sha256").update(data).digest("hex");
  }

  static signHash(hash: string, privateKeyPem: string): string {
    const sign = crypto.createSign("SHA256");
    sign.update(hash);
    return sign.sign(privateKeyPem, "base64");
  }

  static verifySignature(hash: string, signatureBase64: string, publicKeyPem: string): boolean {
    try {
      const verify = crypto.createVerify("SHA256");
      verify.update(hash);
      return verify.verify(publicKeyPem, signatureBase64, "base64");
    } catch {
      return false;
    }
  }

  // 4. Post-Quantum Cryptography (PQC) Simulation (Kyber KEM Wrapper)
  // Generates simulated Kyber-1024 quantum-resistant public/private share keys
  static simulateKyberKEM(aesKey: Buffer): { kyberCiphertext: string; pqcAlgorithm: string } {
    // Generate simulated Kyber encapsulation
    const salt = crypto.randomBytes(16);
    const pqcHash = crypto.createHmac("sha3-512", salt).update(aesKey).digest("hex");
    
    return {
      kyberCiphertext: `CRYPTO_KEM_KYBER_1024:${salt.toString("hex")}:${pqcHash}`,
      pqcAlgorithm: "Kyber-1024 (Post-Quantum Key Encapsulation)"
    };
  }
}
