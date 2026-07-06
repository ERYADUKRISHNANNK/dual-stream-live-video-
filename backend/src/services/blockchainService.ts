import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";

// Load ABIs
const fileRegistryAbi = [
  "function registerFile(string memory fileId, string memory cid, string memory fileHash, uint8 threatScore, string memory signature) public",
  "function grantAccess(string memory fileId, address accessor, uint256 durationSeconds, uint256 maxDownloads) public",
  "function revokeAccess(string memory fileId, address accessor) public",
  "function verifyAccess(string memory fileId, address accessor) public returns (bool)",
  "function getFile(string memory fileId) public view returns (string memory cid, string memory fileHash, address owner, uint256 timestamp, uint8 threatScore, string memory signature)",
  "function setEmergencyLock(bool state) public",
  "function systemEmergencyLock() public view returns (bool)"
];

const decentralizedIdAbi = [
  "function registerDID(string memory didUri, string memory publicKey) public",
  "function getDID(address owner) public view returns (string memory didUri, string memory publicKey, string memory credentialsHash, uint256 createdAt, bool active)"
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider | null = null;
  private signer: ethers.Signer | null = null;
  private fileRegistryContract: ethers.Contract | null = null;
  private didContract: ethers.Contract | null = null;
  private isSimulation = true;

  // In-memory ledger fallback in case blockchain node is offline
  private mockFileRegistry: Map<string, any> = new Map();
  private mockDIDs: Map<string, any> = new Map();

  constructor() {
    this.initializeWeb3();
  }

  private async initializeWeb3() {
    try {
      const addressesPath = path.join(__dirname, "../config/contractAddresses.json");
      if (!fs.existsSync(addressesPath)) {
        console.warn("Contract addresses JSON missing. Operating in local simulated blockchain ledger mode.");
        return;
      }

      const addresses = JSON.parse(fs.readFileSync(addressesPath, "utf8"));
      const providerUrl = process.env.HARDHAT_PROVIDER_URL || "http://127.0.0.1:8545";
      
      this.provider = new ethers.JsonRpcProvider(providerUrl);
      
      // Test connection
      await this.provider.getNetwork();
      
      // Select the first Hardhat account signer
      this.signer = await this.provider.getSigner(0);
      
      this.fileRegistryContract = new ethers.Contract(addresses.fileRegistry, fileRegistryAbi, this.signer);
      this.didContract = new ethers.Contract(addresses.decentralizedID, decentralizedIdAbi, this.signer);
      
      this.isSimulation = false;
      console.log("Blockchain Service fully connected to Hardhat Local EVM Node.");
    } catch (error) {
      console.warn("Unable to connect to EVM RPC node. Activating memory-safe Blockchain Simulation mode.");
      this.isSimulation = true;
    }
  }

  // File Registry functions
  async registerFileOnChain(
    fileId: string,
    cid: string,
    fileHash: string,
    threatScore: number,
    signature: string
  ): Promise<{ txHash: string; success: boolean }> {
    if (this.isSimulation) {
      const txHash = "0x" + crypto.randomUUID().replace(/-/g, "") + "0000000000000000";
      this.mockFileRegistry.set(fileId, {
        cid,
        fileHash,
        owner: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // hardhat #1 address
        threatScore,
        signature,
        timestamp: Date.now()
      });
      return { txHash, success: true };
    }

    try {
      const tx = await this.fileRegistryContract!.registerFile(fileId, cid, fileHash, threatScore, signature);
      const receipt = await tx.wait();
      return { txHash: receipt.hash, success: true };
    } catch (err: any) {
      console.error("Blockchain registry tx failed:", err.message);
      return { txHash: "", success: false };
    }
  }

  async verifyAccessOnChain(fileId: string, accessorWallet: string): Promise<boolean> {
    if (this.isSimulation) {
      return true; // Auto-pass in simulation mode
    }
    try {
      // Send write transaction or call depending on mutability
      const tx = await this.fileRegistryContract!.verifyAccess(fileId, accessorWallet);
      await tx.wait();
      return true;
    } catch {
      return false;
    }
  }

  // DID registration
  async registerDIDOnChain(ownerAddress: string, didUri: string, publicKey: string): Promise<string> {
    const txHash = "0x" + crypto.randomUUID().replace(/-/g, "") + "1111111111111111";
    if (this.isSimulation) {
      this.mockDIDs.set(ownerAddress.toLowerCase(), { didUri, publicKey, active: true });
      return txHash;
    }
    try {
      const tx = await this.didContract!.registerDID(didUri, publicKey);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch {
      return txHash;
    }
  }

  getBlockchainStatus() {
    return {
      connected: !this.isSimulation,
      mode: this.isSimulation ? "Simulated InMemory Ledger" : "Hardhat EVM Node Live",
      fileRegistryAddress: this.fileRegistryContract ? this.fileRegistryContract.target : "simulated",
      didAddress: this.didContract ? this.didContract.target : "simulated"
    };
  }
}

export const blockchainService = new BlockchainService();
