import * as fs from "fs";
import * as path from "path";
import hre from "hardhat";

/**
 * Deploys two MockERC20 test tokens (mWETH 18d, mUSDC 6d) with an open faucet,
 * mints a starting balance to the deployer, and writes their addresses into the
 * frontend `.env.local` and the repo-root `.env` as:
 *   NEXT_PUBLIC_WETH_ADDRESS / NEXT_PUBLIC_USDC_ADDRESS
 *
 * Existing core-contract env entries (order book / amm / vault) are preserved.
 *
 *   npm run deploy:tokens           (Arbitrum Sepolia)
 *   npm run deploy:tokens:local     (localhost)
 */
async function main() {
  const { ethers } = hre;
  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "No deployer account. Set PRIVATE_KEY in the repo-root .env (Arbitrum Sepolia) or run a local node.",
    );
  }
  console.log("Deploying test tokens with:", deployer.address);

  const Mock = await ethers.getContractFactory("MockERC20");

  // 1,000 WETH (18d) and 1,000,000 USDC (6d) minted to the deployer.
  const weth = await Mock.deploy("Mock Wrapped Ether", "WETH", 18, ethers.parseUnits("1000", 18), deployer.address);
  await weth.waitForDeployment();
  const wethAddress = await weth.getAddress();
  console.log("MockWETH:", wethAddress);

  const usdc = await Mock.deploy("Mock USD Coin", "USDC", 6, ethers.parseUnits("1000000", 6), deployer.address);
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("MockUSDC:", usdcAddress);

  const updates: Record<string, string> = {
    NEXT_PUBLIC_WETH_ADDRESS: wethAddress,
    NEXT_PUBLIC_USDC_ADDRESS: usdcAddress,
  };

  const frontendEnv = path.join(__dirname, "..", "frontend", ".env.local");
  upsertEnv(frontendEnv, updates);
  console.log(`✅ Updated ${path.relative(process.cwd(), frontendEnv)}`);

  const rootEnv = path.join(__dirname, "..", ".env");
  upsertEnv(rootEnv, updates);
  console.log(`✅ Updated ${path.relative(process.cwd(), rootEnv)}`);
}

/** Merge key=value pairs into an env file, preserving and updating existing keys. */
function upsertEnv(filePath: string, updates: Record<string, string>) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
  const lines = existing.length ? existing.replace(/\r\n/g, "\n").split("\n") : [];
  const seen = new Set<string>();

  const out = lines.map((line) => {
    const m = line.match(/^([A-Za-z0-9_]+)=/);
    if (m && updates[m[1]] != null) {
      seen.add(m[1]);
      return `${m[1]}=${updates[m[1]]}`;
    }
    return line;
  });

  for (const [key, value] of Object.entries(updates)) {
    if (!seen.has(key)) out.push(`${key}=${value}`);
  }

  const content = out.filter((l, i) => !(l === "" && i === out.length - 1)).join("\n") + "\n";
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, "utf8");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
