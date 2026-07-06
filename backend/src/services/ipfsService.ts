import fs from "fs";
import path from "path";
import axios from "axios";
import crypto from "crypto";

export class IPFSService {
  private mockIpfsDir: string;
  private usePinata = false;
  private pinataApiKey = "";
  private pinataSecretKey = "";

  constructor() {
    this.mockIpfsDir = path.join(__dirname, "../../ipfs_mock");
    if (!fs.existsSync(this.mockIpfsDir)) {
      fs.mkdirSync(this.mockIpfsDir, { recursive: true });
    }

    this.pinataApiKey = process.env.PINATA_API_KEY || "";
    this.pinataSecretKey = process.env.PINATA_API_SECRET || "";
    if (this.pinataApiKey && this.pinataSecretKey) {
      this.usePinata = true;
      console.log("IPFS: Pinata API credentials found. Live cloud pinning enabled.");
    } else {
      console.log("IPFS: No Pinata variables found. Operating in local IPFS mock storage mode.");
    }
  }

  async uploadFile(fileBuffer: Buffer, fileName: string): Promise<string> {
    if (this.usePinata) {
      try {
        const formData = new FormData();
        const blob = new Blob([fileBuffer]);
        formData.append("file", blob, fileName);

        const response = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
            pinata_api_key: this.pinataApiKey,
            pinata_secret_api_key: this.pinataSecretKey
          }
        });

        return response.data.IpfsHash; // Return the pinned CID
      } catch (err: any) {
        console.error("Pinata cloud upload failed, falling back to mock storage:", err.message);
      }
    }

    // Heuristic CID Mock generation
    const sha256 = crypto.createHash("sha256").update(fileBuffer).digest("hex");
    const simulatedCid = `Qm${sha256.substring(0, 44)}`;
    
    const targetPath = path.join(this.mockIpfsDir, simulatedCid);
    fs.writeFileSync(targetPath, fileBuffer);
    console.log(`Saved encrypted file block inside local IPFS mock: ${targetPath}`);

    return simulatedCid;
  }

  async downloadFile(cid: string): Promise<Buffer> {
    if (this.usePinata) {
      try {
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;
        const response = await axios.get(gatewayUrl, { responseType: "arraybuffer" });
        return Buffer.from(response.data);
      } catch {
        console.warn("Unable to pull CID from Pinata cloud gateway. Attempting local lookup.");
      }
    }

    const targetPath = path.join(this.mockIpfsDir, cid);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`IPFS Object with CID ${cid} not found in storage.`);
    }

    return fs.readFileSync(targetPath);
  }
}

export const ipfsService = new IPFSService();
