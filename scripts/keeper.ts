import * as dotenv from "dotenv";

dotenv.config();

import {
  createPublicClient,
  createWalletClient,
  http,
  getAddress,
  BaseError,
  type Address,
  type Hex,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

/**
 * PrivateDEX keeper.
 *
 * Every POLL_INTERVAL_MS it:
 *   1. Reads `orderCount` from PrivateOrderBook.
 *   2. Fetches every order via `getOrder(id)` and keeps the live ones
 *      (not filled, not cancelled, not expired).
 *   3. Finds complementary pairs where
 *        A.tokenIn == B.tokenOut && A.tokenOut == B.tokenIn
 *   4. Calls `matchOrders(buyId, sellId)` on PrivateAMM for each pair
 *      (simulated first so we don't waste gas on reverts).
 *
 * Signs with PRIVATE_KEY from the repo-root .env on Arbitrum Sepolia.
 */

const POLL_INTERVAL_MS = 15_000;

const ORDER_BOOK_ABI = [
  {
    type: "function",
    name: "orderCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getOrder",
    stateMutability: "view",
    inputs: [{ name: "orderId", type: "uint256" }],
    outputs: [
      { name: "trader", type: "address" },
      { name: "tokenIn", type: "address" },
      { name: "tokenOut", type: "address" },
      { name: "expiry", type: "uint256" },
      { name: "filled", type: "bool" },
      { name: "cancelled", type: "bool" },
    ],
  },
] as const;

const AMM_ABI = [
  {
    type: "function",
    name: "matchOrders",
    stateMutability: "nonpayable",
    inputs: [
      { name: "buyId", type: "uint256" },
      { name: "sellId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

type LiveOrder = {
  id: bigint;
  trader: Address;
  tokenIn: Address;
  tokenOut: Address;
  expiry: bigint;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing ${name} in .env`);
  }
  return value.trim();
}

function normalizePrivateKey(raw: string): Hex {
  const hex = raw.startsWith("0x") ? raw : `0x${raw}`;
  return hex as Hex;
}

function formatError(error: unknown): string {
  if (error instanceof BaseError) {
    return error.shortMessage || error.message;
  }
  if (error instanceof Error) return error.message;
  return String(error);
}

function pairKey(a: bigint, b: bigint): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

async function main() {
  const privateKey = normalizePrivateKey(requireEnv("PRIVATE_KEY"));
  const orderBookAddress = getAddress(requireEnv("NEXT_PUBLIC_ORDER_BOOK_ADDRESS"));
  const ammAddress = getAddress(requireEnv("NEXT_PUBLIC_AMM_ADDRESS"));
  const rpcUrl =
    process.env.NEXT_PUBLIC_RPC_URL?.trim() ||
    process.env.RPC_URL?.trim() ||
    arbitrumSepolia.rpcUrls.default.http[0];

  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    account,
    chain: arbitrumSepolia,
    transport: http(rpcUrl),
  });

  console.log("PrivateDEX keeper starting");
  console.log("  network    :", arbitrumSepolia.name, `(${arbitrumSepolia.id})`);
  console.log("  rpc        :", rpcUrl);
  console.log("  keeper     :", account.address);
  console.log("  orderBook  :", orderBookAddress);
  console.log("  amm        :", ammAddress);
  console.log("  interval   :", `${POLL_INTERVAL_MS / 1000}s`);

  // Pairs we have already broadcast in this process; avoids re-submitting
  // while a match tx is still pending and the orders look open on-chain.
  const submittedPairs = new Set<string>();

  async function fetchLiveOrders(): Promise<LiveOrder[]> {
    const orderCount = (await publicClient.readContract({
      address: orderBookAddress,
      abi: ORDER_BOOK_ABI,
      functionName: "orderCount",
    })) as bigint;

    const count = Number(orderCount);
    if (count === 0) return [];

    const calls = Array.from({ length: count }, (_, i) => ({
      address: orderBookAddress,
      abi: ORDER_BOOK_ABI,
      functionName: "getOrder" as const,
      args: [BigInt(i)] as const,
    }));

    const results = await publicClient.multicall({ contracts: calls });
    const now = BigInt(Math.floor(Date.now() / 1000));
    const live: LiveOrder[] = [];

    results.forEach((res, i) => {
      if (res.status !== "success" || !res.result) return;
      const [trader, tokenIn, tokenOut, expiry, filled, cancelled] =
        res.result as readonly [Address, Address, Address, bigint, boolean, boolean];
      if (filled || cancelled) return;
      if (expiry <= now) return;
      live.push({
        id: BigInt(i),
        trader,
        tokenIn: getAddress(tokenIn),
        tokenOut: getAddress(tokenOut),
        expiry,
      });
    });

    return live;
  }

  function findPairs(orders: LiveOrder[]): Array<[LiveOrder, LiveOrder]> {
    const pairs: Array<[LiveOrder, LiveOrder]> = [];
    const consumed = new Set<bigint>();

    for (let i = 0; i < orders.length; i++) {
      const a = orders[i];
      if (consumed.has(a.id)) continue;
      for (let j = i + 1; j < orders.length; j++) {
        const b = orders[j];
        if (consumed.has(b.id)) continue;
        const complementary =
          a.tokenIn === b.tokenOut && a.tokenOut === b.tokenIn;
        if (!complementary) continue;
        pairs.push([a, b]);
        consumed.add(a.id);
        consumed.add(b.id);
        break;
      }
    }

    return pairs;
  }

  async function matchPair(a: LiveOrder, b: LiveOrder): Promise<void> {
    const key = pairKey(a.id, b.id);
    if (submittedPairs.has(key)) return;

    console.log(
      `→ match attempt: buyId=${a.id} sellId=${b.id} (${a.tokenIn} ⇄ ${a.tokenOut})`,
    );

    try {
      const { request } = await publicClient.simulateContract({
        account,
        address: ammAddress,
        abi: AMM_ABI,
        functionName: "matchOrders",
        args: [a.id, b.id],
      });

      const hash = await walletClient.writeContract(request);
      submittedPairs.add(key);
      console.log(`  tx sent     : ${hash}`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status === "success") {
        console.log(`  ✅ matched  : buyId=${a.id} sellId=${b.id} (block ${receipt.blockNumber})`);
      } else {
        submittedPairs.delete(key);
        console.log(`  ❌ reverted : buyId=${a.id} sellId=${b.id}`);
      }
    } catch (error) {
      console.log(`  ❌ failed   : buyId=${a.id} sellId=${b.id} — ${formatError(error)}`);
    }
  }

  async function tick(): Promise<void> {
    try {
      const orders = await fetchLiveOrders();
      console.log(
        `[${new Date().toISOString()}] live orders: ${orders.length}` +
          (orders.length ? ` (ids: ${orders.map((o) => o.id).join(", ")})` : ""),
      );

      const pairs = findPairs(orders);
      if (pairs.length === 0) {
        if (orders.length > 1) console.log("  no complementary pairs found");
        return;
      }

      for (const [a, b] of pairs) {
        await matchPair(a, b);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] tick error:`, formatError(error));
    }
  }

  await tick();
  const timer = setInterval(() => {
    void tick();
  }, POLL_INTERVAL_MS);

  const shutdown = () => {
    clearInterval(timer);
    console.log("\nkeeper stopped");
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("keeper fatal:", formatError(error));
  process.exit(1);
});
