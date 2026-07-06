import { expect } from "chai";
import { ethers } from "hardhat";

describe("FileRegistry Smart Contract", function () {
  let fileRegistry: any;
  let owner: any;
  let user1: any;
  let user2: any;

  beforeEach(async function () {
    [owner, user1, user2] = await ethers.getSigners();
    const FileRegistry = await ethers.getContractFactory("FileRegistry");
    fileRegistry = await FileRegistry.deploy();
    await fileRegistry.waitForDeployment();
  });

  describe("File Registration", function () {
    it("Should register a file successfully and emit event", async function () {
      const fileId = "test-file-hash-1";
      const cid = "QmTestCid1234567890";
      const fileHash = "sha256-test-hash-value";
      const threatScore = 0;
      const signature = "signature-data-bytes";

      await expect(
        fileRegistry.connect(user1).registerFile(fileId, cid, fileHash, threatScore, signature)
      )
        .to.emit(fileRegistry, "FileRegistered")
        .withArgs(fileId, cid, fileHash, user1.address, threatScore);

      const file = await fileRegistry.getFile(fileId);
      expect(file.cid).to.equal(cid);
      expect(file.owner).to.equal(user1.address);
    });

    it("Should fail if file already registered", async function () {
      const fileId = "test-file-hash-1";
      await fileRegistry.connect(user1).registerFile(fileId, "cid", "hash", 0, "sig");
      
      await expect(
        fileRegistry.connect(user2).registerFile(fileId, "cid2", "hash2", 0, "sig2")
      ).to.be.revertedWith("File already registered");
    });
  });

  describe("Sharing & Revoking Access", function () {
    const fileId = "test-file-hash-1";

    beforeEach(async function () {
      await fileRegistry.connect(user1).registerFile(fileId, "cid", "hash", 0, "sig");
    });

    it("Should grant and verify access to user2", async function () {
      await fileRegistry.connect(user1).grantAccess(fileId, user2.address, 3600, 5);
      
      // verifyAccess triggers state update (downloadCount increments) so it requires a tx write
      await expect(fileRegistry.connect(user1).verifyAccess(fileId, user2.address))
        .to.emit(fileRegistry, "AccessLogged");
    });

    it("Should allow owner to revoke access", async function () {
      await fileRegistry.connect(user1).grantAccess(fileId, user2.address, 3600, 5);
      await fileRegistry.connect(user1).revokeAccess(fileId, user2.address);

      // In Solidity, non-view calls returning boolean must be checked by staticCall to inspect return value
      const hasAccess = await fileRegistry.verifyAccess.staticCall(fileId, user2.address);
      expect(hasAccess).to.equal(false);
    });

    it("Should fail validation on expired time share", async function () {
      // Grant with 1 second expiry
      await fileRegistry.connect(user1).grantAccess(fileId, user2.address, 1, 5);
      
      // Fast forward time by 2 seconds
      await ethers.provider.send("evm_increaseTime", [2]);
      await ethers.provider.send("evm_mine", []);

      const hasAccess = await fileRegistry.verifyAccess.staticCall(fileId, user2.address);
      expect(hasAccess).to.equal(false);
    });
  });

  describe("Emergency Lock", function () {
    it("Should prevent state updates if emergency lock is active", async function () {
      await fileRegistry.connect(owner).setEmergencyLock(true);
      
      await expect(
        fileRegistry.connect(user1).registerFile("file-1", "cid", "hash", 0, "sig")
      ).to.be.revertedWith("System is under emergency lock");
    });
  });
});
Length: 3004
