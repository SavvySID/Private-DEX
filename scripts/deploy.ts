import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

async function main() {
  const { ethers } = hre;
  const signers = await ethers.getSigners();
  const deployer = signers[0];
  if (!deployer) {
    throw new Error(
      'No deployer account. For Arbitrum Sepolia set PRIVATE_KEY in the repo root .env. For localhost run "npx hardhat node" in another terminal, then npm run deploy:local.',
    );
  }
  console.log("Deploying with:", deployer.address);

  const isLocal = hre.network.name === "localhost" || hre.network.name === "hardhat";
  const nextChainId = isLocal ? 31337 : 421614;

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

  const envLines = [
    `NEXT_PUBLIC_ORDER_BOOK_ADDRESS=${orderBookAddress}`,
    `NEXT_PUBLIC_AMM_ADDRESS=${ammAddress}`,
    `NEXT_PUBLIC_VAULT_ADDRESS=${vaultAddress}`,
    `NEXT_PUBLIC_CHAIN_ID=${nextChainId}`,
  ];
  if (isLocal) {
    envLines.push('NEXT_PUBLIC_LOCAL_RPC=http://127.0.0.1:8545');
  } else {
    envLines.push('NEXT_PUBLIC_RPC_URL=https://sepolia-rollup.arbitrum.io/rpc');
  }
  const envLocal = `${envLines.join("\n")}\n`;

  const frontendEnv = path.join(__dirname, "..", "frontend", ".env.local");
  fs.mkdirSync(path.dirname(frontendEnv), { recursive: true });
  fs.writeFileSync(frontendEnv, envLocal, "utf8");
  console.log("✅ Addresses written to frontend/.env.local");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
