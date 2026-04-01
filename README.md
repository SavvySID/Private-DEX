# PrivateDEX

Full-stack FHE dark-pool DEX scaffold: Hardhat contracts (`@fhenixprotocol/cofhe-contracts`) + Next.js 14 frontend (wagmi v2, RainbowKit, cofhejs).

## Prerequisites

- Node.js 20+
- A WalletConnect Cloud `projectId` for RainbowKit (`frontend/.env.local` → `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`)

## Setup

```bash
# root — contracts
npm install
npx hardhat compile
npm run copy:abis

# frontend
cd frontend
npm install
cp .env.local.example .env.local
# fill contract addresses after deploy + WalletConnect project id
```

## Local chain

```bash
# terminal A
npx hardhat node

# terminal B (repo root)
npm run deploy:local
npm run copy:abis

# terminal C
cd frontend && npm run dev
```

## Arbitrum Sepolia

Set `PRIVATE_KEY` in root `.env`, then:

```bash
npm run deploy:testnet
npm run copy:abis
```

Copy `frontend/.env.local` fields from the deploy output. Set `NEXT_PUBLIC_CHAIN_ID=421614` and `NEXT_PUBLIC_RPC_URL` if needed.

## Scripts (root)

| Script | Purpose |
|--------|---------|
| `npm run build:contracts` | `hardhat compile` + copy ABIs into `frontend/src/lib/abis/` |
| `npm run deploy:local` | Deploy to localhost |
| `npm run deploy:testnet` | Deploy to Arbitrum Sepolia |
| `npm run copy:abis` | Copy ABIs only |

## Solidity note

CoFHE `0.1.3` requires **Solidity ≥ 0.8.25** and **EVM Cancun** with `viaIR` enabled in `hardhat.config.ts`.
