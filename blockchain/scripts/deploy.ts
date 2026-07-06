import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

async function main() {
  console.log("Starting deployment of contracts...");

  // Deploy FileRegistry
  const FileRegistry = await ethers.getContractFactory("FileRegistry");
  const fileRegistry = await FileRegistry.deploy();
  await fileRegistry.waitForDeployment();
  const fileRegistryAddress = await fileRegistry.getAddress();
  console.log(`FileRegistry deployed to: ${fileRegistryAddress}`);

  // Deploy DecentralizedID
  const DecentralizedID = await ethers.getContractFactory("DecentralizedID");
  const decentralizedID = await DecentralizedID.deploy();
  await decentralizedID.waitForDeployment();
  const decentralizedIDAddress = await decentralizedID.getAddress();
  console.log(`DecentralizedID deployed to: ${decentralizedIDAddress}`);

  // Write addresses configuration to backend config path
  const configDir = path.join(__dirname, "../../backend/src/config");
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const addressesFile = path.join(configDir, "contractAddresses.json");
  const data = {
    fileRegistry: fileRegistryAddress,
    decentralizedID: decentralizedIDAddress
  };

  fs.writeFileSync(addressesFile, JSON.stringify(data, null, 2), "utf8");
  console.log(`Contract addresses written to: ${addressesFile}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
