import * as fs from "fs";
import * as path from "path";
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const PrivateOrderBook = await ethers.getContractFactory("PrivateOrderBook");
  const orderBook = await PrivateOrderBook.deploy();
  await orderBook.waitForDeployment();
  const orderBookAddress = await orderBook.getAddress();
  console.log("PrivateOrderBook:", orderBookAddress);

  const PrivateVault = await ethers.getContractFactory("PrivateVault");
  const vault = await PrivateVault.deploy();
  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  console.log("PrivateVault:", vaultAddress);

  const PrivateAMM = await ethers.getContractFactory("PrivateAMM");
  const amm = await PrivateAMM.deploy(orderBookAddress);
  await amm.waitForDeployment();
  const ammAddress = await amm.getAddress();
  console.log("PrivateAMM:", ammAddress);

  const tx = await orderBook.setMatcher(ammAddress);
  await tx.wait();
  console.log("Matcher set on PrivateOrderBook");

  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const envLocal = [
    `NEXT_PUBLIC_ORDER_BOOK_ADDRESS=${orderBookAddress}`,
    `NEXT_PUBLIC_AMM_ADDRESS=${ammAddress}`,
    `NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}`,
    `NEXT_PUBLIC_CHAIN_ID=${chainId}`,
    "",
  ].join("\n");

  const frontendEnv = path.join(__dirname, "..", "frontend", ".env.local");
  fs.mkdirSync(path.dirname(frontendEnv), { recursive: true });
  fs.writeFileSync(frontendEnv, envLocal, "utf8");
  console.log("✅ Written to frontend/.env.local");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
