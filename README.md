# ChainRescue — Monad Blitz Ankara V4

ChainRescue is a hackathon MVP for a shared, auditable task ledger during **fictional emergency drills**. Independent volunteers can claim a request, report its completion, and have it finalized through two independent, admin-authorized confirmations.

> **Important:** This is a demonstration, not a real emergency service. It contains no dispatching, alerting, geolocation, financial rewards, real people, or real incident data. Do not use it for a real emergency.

## What it demonstrates

The Solidity contract enforces this task lifecycle:

```text
OPEN → CLAIMED → REPORTED → VERIFIED
```

- Creators add a category, short description, and fictional area.
- One non-creator volunteer can claim an open task atomically.
- Only the assigned volunteer may report completion.
- The designated demo admin controls an allowlist of verifiers.
- Two different authorized verifiers are required after a report.
- The creator and assigned volunteer cannot verify that task.
- Every lifecycle event is emitted on-chain.

The React dashboard uses `viem` and an injected EIP-1193 wallet. It detects Monad Testnet (chain ID `10143`), requests a network switch when needed, waits for receipts, and only labels transactions as confirmed after a successful receipt. Successful transactions include explorer links.

## Stack

- React, TypeScript, Vite, Tailwind CSS, Lucide icons
- Solidity `0.8.24`, Hardhat, ethers test tooling
- viem for browser wallet/public RPC integration
- Monad Testnet, chain ID `10143`

## Local setup

Prerequisites: Node.js 20+ and an EIP-1193 browser wallet (for live transactions).

```bash
npm install
Copy-Item .env.example .env
npm run compile
npm test
npm run dev
```

On macOS/Linux, use `cp .env.example .env` instead of `Copy-Item`.

Until `VITE_CHAIN_RESCUE_ADDRESS` is set, the UI runs in **viewer mode** with clearly labeled seeded demo examples. Those cards are not contract state and all transaction controls are disabled.

## Test and build commands

```bash
npm run compile
npm test
npm run lint
npm run build
```

The contract suite covers task creation, atomic claiming, duplicate claim rejection, unauthorized completion rejection, reporting, invalid verification, duplicate verifier prevention, two-verifier finalization, and invalid state transitions.

## Monad Testnet deployment

### Current testnet deployment

ChainRescue was deployed successfully to Monad Testnet (chain ID `10143`):

- Contract: [`0x7F2789a0e1aF06F71b24708540e0291b7B2f7FcB`](https://testnet.monadexplorer.com/address/0x7F2789a0e1aF06F71b24708540e0291b7B2f7FcB)
- Demo admin: `0xF9A09B2e1A5E559b156cCED79ebDd9677D416738`
- Authorized verifier 1 transaction: [`0x8c255427c8f52ec0ee566574c0b472eec39c68f040d90d54cc00e4e3759e9a7f`](https://testnet.monadexplorer.com/tx/0x8c255427c8f52ec0ee566574c0b472eec39c68f040d90d54cc00e4e3759e9a7f)
- Authorized verifier 2 transaction: [`0x44c0337c29b217fbfdcfeada25498f6dc4aa091814ae139c2cb8b165bc15f889`](https://testnet.monadexplorer.com/tx/0x44c0337c29b217fbfdcfeada25498f6dc4aa091814ae139c2cb8b165bc15f889)

The following instructions let you deploy a separate instance if required.

1. Copy `.env.example` to `.env`.
2. Set `MONAD_TESTNET_RPC_URL` to a working Monad Testnet RPC endpoint and add a funded testnet-only `DEPLOYER_PRIVATE_KEY`. Never commit this file or use a mainnet key.
3. Deploy:

   ```bash
   npm run deploy:monad
   ```

4. Copy the printed address into both `CHAIN_RESCUE_ADDRESS` and `VITE_CHAIN_RESCUE_ADDRESS` in `.env`.
5. Set two distinct `VERIFIER_ONE_ADDRESS` and `VERIFIER_TWO_ADDRESS` values, then authorize them using the deployment-admin key:

   ```bash
   npm run authorize:verifiers
   ```

6. Restart `npm run dev`, connect each wallet in turn, and select Monad Testnet.

The Vite variables are intentionally public configuration only. Private keys are read only by Hardhat from `.env`; never place any private key in a `VITE_` variable.

## 90-second live demo script

Preparation: deploy once, authorize two verifier wallets, and fund the creator/volunteer/verifier wallets with testnet MON. Keep all copy and locations fictional.

1. **0–15s — Context:** open the dashboard and point out the hackathon disclaimer and Monad Testnet badge. Explain that the visible record prevents two groups from independently claiming the same fictional task.
2. **15–30s — Wallet A:** connect the creator wallet, select `Supplies`, enter “Deliver bottled water to the fictional support point” and “Demo District A,” then create it. Show the pending state and the explorer link after confirmation.
3. **30–45s — Wallet B:** switch accounts, claim the new open task, then report completion. The card moves through `OPEN → CLAIMED → REPORTED` only after each receipt.
4. **45–70s — Verifiers:** switch to each pre-authorized verifier wallet in turn and use “Record verification.” The first confirmation is recorded; the second changes the card to `VERIFIED`.
5. **70–90s — Audit trail:** open the task detail panel. Show the two confirmation count, independent wallet addresses, this-session transaction history, and each explorer link. Mention that the contract rejects duplicate claims, duplicate verification, conflicted verification, and invalid transitions.

## Project layout

```text
contracts/ChainRescue.sol         Lifecycle contract
test/ChainRescue.ts               Automated contract tests
scripts/deploy.ts                 Monad Testnet deployment
scripts/authorize-verifiers.ts    Demo verifier authorization
src/App.tsx                       Responsive dashboard and viem integration
src/lib/contract.ts               Chain definition and contract ABI
src/lib/demo-data.ts              Explicitly labeled non-chain examples
```

## MVP limitations

- No real-world dispatch, notification, maps, identity, organization governance, or sensitive data.
- Verifier authorization is administered by one designated demo admin, not decentralized governance.
- The transaction list is this-browser-session history; the underlying event logs remain on-chain and can be read through the explorer.
- This MVP has no professional security audit and should not manage funds or coordinate real incidents.
