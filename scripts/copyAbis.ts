import * as fs from "fs";
import * as path from "path";

const root = path.join(__dirname, "..");

const copies: { artifact: string; destName: string }[] = [
  {
    artifact: path.join(root, "artifacts", "contracts", "PrivateOrderBook.sol", "PrivateOrderBook.json"),
    destName: "PrivateOrderBook.json",
  },
  {
    artifact: path.join(root, "artifacts", "contracts", "PrivateAMM.sol", "PrivateAMM.json"),
    destName: "PrivateAMM.json",
  },
  {
    artifact: path.join(root, "artifacts", "contracts", "PrivateVault.sol", "PrivateVault.json"),
    destName: "PrivateVault.json",
  },
];

/** App ABI path: frontend/src/lib/abis (Next.js `src/lib/abis`). */
const outDir = path.join(root, "frontend", "src", "lib", "abis");

function main() {
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  for (const { artifact: srcPath, destName } of copies) {
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Missing artifact: ${srcPath} — run "npx hardhat compile" first`);
    }
    const artifact = JSON.parse(fs.readFileSync(srcPath, "utf8")) as { abi: unknown[] };
    if (!Array.isArray(artifact.abi)) {
      throw new Error(`No abi array in ${srcPath}`);
    }
    const outPath = path.join(outDir, destName);
    fs.writeFileSync(outPath, `${JSON.stringify(artifact.abi, null, 2)}\n`, "utf8");
    console.log(`Written: ${path.relative(root, outPath)}`);
  }
}

main();
