import { ethers, network, run } from "hardhat";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  console.log(`Deploying ClinicalTrialRegistry to network: ${network.name}...`);

  const [deployer] = await ethers.getSigners();
  console.log(`Deployer (Patient): ${deployer.address}`);

  const hospitalAddr = process.env.HOSPITAL_ADDRESS!;

  const Registry = await ethers.getContractFactory("ClinicalTrialRegistry");
  const registry = await Registry.deploy(hospitalAddr);
  await registry.waitForDeployment();

  const addr = await registry.getAddress();
  console.log(`ClinicalTrialRegistry deployed to: ${addr}`);
  console.log(`Hospital address: ${hospitalAddr}`);

  const backendEnvPath = path.resolve(__dirname, "..", "..", "backend", ".env");
  const rpcUrl =
    network.name === "sepolia"
      ? process.env.ALCHEMY_SEPOLIA_URL
      : "http://127.0.0.1:8545";

  const content = `RPC_URL=${rpcUrl}
CONTRACT_ADDRESS=${addr}
DEPLOYER_PRIVATE_KEY=${process.env.PRIVATE_KEY || ""}
NETWORK=${network.name}
HOSPITAL_ADDRESS=${hospitalAddr}
`;
  fs.writeFileSync(backendEnvPath, content, { encoding: "utf-8" });
  console.log(`Wrote backend/.env (${network.name})`);

  if (process.env.ETHERSCAN_API_KEY && network.name === "sepolia") {
    console.log("Verifying contract on Etherscan...");
    try {
      await run("verify:verify", {
        address: addr,
        constructorArguments: [hospitalAddr],
      });
      console.log("Contract verified successfully!");
    } catch (err: any) {
      console.log("Verification skipped or failed:", err.message);
    }
  }
}

main().catch((error) => {
  console.error("Deployment failed:", error);
  process.exitCode = 1;
});
