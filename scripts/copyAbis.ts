import * as fs from "fs";
import * as path from "path";

const root = path.join(__dirname, "..");
const artifactsDir = path.join(root, "artifacts", "contracts");
const outDir = path.join(root, "frontend", "src", "lib", "abis");

const contracts = [
  ["PrivateOrderBook.sol", "PrivateOrderBook"],
  ["PrivateVault.sol", "PrivateVault"],
  ["PrivateAMM.sol", "PrivateAMM"],
];

function main() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const [folder, name] of contracts) {
    const src = path.join(artifactsDir, folder, `${name}.json`);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing artifact: ${src} — run "npx hardhat compile" first`);
    }
    const artifact = JSON.parse(fs.readFileSync(src, "utf8")) as { abi: unknown };
    const outPath = path.join(outDir, `${name}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ abi: artifact.abi }, null, 2), "utf8");
    console.log(`✅ Wrote ${path.relative(root, outPath)}`);
  }
}

main();
