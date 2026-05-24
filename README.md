# AgoraGuard

**Autonomous risk-gated AI trading agent running on Arc (Circle's stablecoin-native L1 testnet).**

AgoraGuard monitors DeFi markets in real time, assesses risk through 5 independent guard rules plus Claude AI, and automatically protects user funds by moving them on-chain when a HALT verdict is triggered. It combines an off-chain TypeScript agent with three Solidity smart contracts deployed on Arc testnet (chain ID 5042002).

---

## Architecture

```
┌─────────────────────────────────────────────────┐
│                    agent/                        │
│  Off-chain TypeScript agent (the brain)          │
│                                                  │
│  Monitor ──→ Guards ──→ Brain (AI) ──→ Executor │
│  (data)      (rules)    (decisions)    (actions) │
└──────────────────────┬──────────────────────────┘
                       │  reads/writes on-chain
                       ▼
┌─────────────────────────────────────────────────┐
│                  contracts/                      │
│  On-chain Solidity smart contracts (Arc testnet) │
│                                                  │
│  RiskGuardOracle  ←  verdicts written here       │
│  ThreatRegistry   ←  community threat reports    │
│  GuardianVault    ←  user funds protected here   │
└─────────────────────────────────────────────────┘
                       ▲
                       │  reads on-chain state
┌─────────────────────────────────────────────────┐
│                    client/                       │
│  React dashboard (Vite + TypeScript)             │
│                                                  │
│  Reads oracle state, shows live guard verdicts,  │
│  lets users opt in/out of protection, report     │
│  threats, and withdraw from the vault.           │
└─────────────────────────────────────────────────┘
```

### How it works — each cycle (default: every 30s)

1. **Monitor** (`agent/src/monitor/`) fetches price/candle data, reads on-chain threat scores from `ThreatRegistry`, and queries the GoPlus security API. Outputs an `AgentSnapshot`.

2. **Guards** (`agent/src/guards/`) run 5 independent risk checks against the snapshot, each producing a verdict of `CLEAR`, `CAUTION`, or `HALT`:

   | Guard | File | HALT threshold | CAUTION threshold |
   |-------|------|---------------|-------------------|
   | Drawdown | `drawdown.ts` | > 12% | > 7% |
   | Volatility (ATR) | `volatility.ts` | > 2.5× ATR | > 1.5× ATR |
   | RSI | `rsi.ts` | — | > 72 overbought / < 28 oversold |
   | Spread | `spread.ts` | > 100 bps | > 50 bps |
   | Cooldown | `cooldown.ts` | < 300s since last stop-loss | — |

   The worst guard determines the final verdict. Caution flags are packed into a bitmask.

3. **Brain** (`agent/src/brain/`) routes to Claude AI (Sonnet 4 via `@anthropic-ai/sdk`) when enabled, using a structured prompt with market context. Falls back to deterministic RSI/momentum logic if AI is disabled. Outputs a `TradeDecision`: BUY/SELL/HOLD with size, stop-loss, take-profit, and confidence.

4. **Executor** (`agent/src/executor/`) writes the verdict to `RiskGuardOracle` on-chain. On HALT, scans opted-in wallets and calls `GuardianVault.protectTokens()` to move their USDC/EURC into the vault. Registers the agent's identity via ERC-8004 on first run.

---

## project structure

```
AgoraGuard/
├── agent/                  # Off-chain TypeScript agent
│   └── src/
│       ├── index.ts        # Entry point — cycle loop & lifecycle
│       ├── config.ts       # Arc chain config, contract ABIs, risk params
│       ├── monitor/        # Data collection (prices, chain, threats)
│       ├── guards/         # 5 guard rules + aggregator
│       ├── brain/          # Claude AI + fallback decision logic
│       ├── executor/       # On-chain execution (oracle writes, vault protection)
│       └── utils/          # Logger (winston)
│
├── contracts/              # Solidity smart contracts
│   ├── contracts/
│   │   ├── RiskGuardOracle.sol   # On-chain verdict ledger
│   │   ├── ThreatRegistry.sol    # Community threat reporting
│   │   ├── GuardianVault.sol     # User fund protection vault
│   │   └── MockERC20.sol         # Test token
│   ├── scripts/deploy.ts         # Hardhat deploy script
│   ├── test/                     # Contract tests
│   └── addresses.json            # Deployed addresses on Arc testnet
│
├── client/                 # React dashboard (Vite + TypeScript)
│   └── src/
│       ├── App.tsx         # Main app — dashboard, positions, threats, guard log
│       ├── hooks/
│       │   ├── useArc.ts   # Reads RiskGuardOracle & ThreatRegistry on-chain
│       │   └── useWallet.ts # Wallet connection, vault opt-in, threat reporting
│       └── config/
│           └── contracts.ts # Arc chain config & contract ABIs
│
└── README.md
```

---

## Deployed contracts (Arc testnet)

| Contract | Address | Purpose |
|----------|---------|---------|
| **RiskGuardOracle** | `0x2d101faf...c4c80bf7` | On-chain verdict ledger per asset, 50-entry history, emits `HaltTriggered` |
| **ThreatRegistry** | `0xef650672...02f56272d` | Community threat reports with weighted scoring + time decay, auto-verifies at ≥ 75 |
| **GuardianVault** | `0x8de97750...27f15f988` | Opt-in protection vault — gated by oracle halt state, 5-min cooldown per user |

Guardian address: `0x2ec236a1...b9caE6D7`  
Deployed: 2026-05-20

---

## Getting started

### Prerequisites

- Node.js v24+
- A wallet with Arc testnet USDC/EURC (get from the [Circle faucet](https://faucet.circle.com))
- Anthropic API key (optional — enables Claude AI decisions; falls back to deterministic rules if disabled)
- GoPlus API key (optional — enables security API threat checks)

### 1. Contracts

```bash
cd contracts
npm install
cp .env.example .env    # add PRIVATE_KEY
npm run compile
npm run deploy           # deploys to Arc testnet, writes addresses.json
npm test                 # run contract tests
```

### 2. Agent

```bash
cd agent
npm install
cp .env.example .env     # add PRIVATE_KEY, ANTHROPIC_API_KEY, GOPLUS_API_KEY, contract addresses
npm run dev              # starts the cycle loop with hot reload (tsx watch)
npm run start            # runs a single cycle
```

Key environment variables for the agent:

| Variable | Required | Default |
|----------|----------|---------|
| `PRIVATE_KEY` | Yes | — |
| `GUARDIAN_VAULT_ADDRESS` | Yes | — |
| `THREAT_REGISTRY_ADDRESS` | Yes | — |
| `RISK_GUARD_ORACLE_ADDRESS` | Yes | — |
| `ANTHROPIC_API_KEY` | No | AI falls back to rules |
| `GOPLUS_API_KEY` | No | GoPlus checks skipped |
| `AI_ENABLED` | No | `true` |
| `CYCLE_INTERVAL_SECS` | No | `30` |
| `PROTECTED_WALLETS` | No | none (comma-separated) |
| `MONITORED_TOKENS` | No | USDC, EURC |
| `ARC_RPC_URL` | No | `https://rpc.testnet.arc.network` |

### 3. Client dashboard

```bash
cd client
npm install
npm run dev              # starts Vite dev server
npm run build            # production build
```

Set `VITE_ARC_RPC_URL` in `.env` if you need a custom RPC endpoint. The dashboard auto-refreshes from the on-chain oracle every 30 seconds.

---

## Risk parameters

All thresholds are configurable in `agent/src/config.ts`:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `maxPositionPct` | 20% | Max portfolio allocation under CLEAR verdict |
| `cautionSizeMultiplier` | 0.67 | Position size reduction per caution flag raised |
| `haltDrawdownPct` | 12% | Drawdown threshold that triggers HALT |
| `cautionDrawdownPct` | 7% | Drawdown threshold that triggers CAUTION |
| `atrHaltMultiple` | 2.5× | Volatility HALT threshold (ATR multiple) |
| `rsiOverbought` | 72 | RSI overbought threshold |
| `rsiOversold` | 28 | RSI oversold threshold |
| `spreadHaltBps` | 100 | Spread HALT threshold (basis points) |
| `cooldownSecs` | 300 | Seconds before a position can re-enter after stop-loss |

---

## Smart contract details

### RiskGuardOracle

Stores a 50-entry ring buffer of `GuardRecord` structs per asset, containing: verdict, caution flags, drawdown, ATR multiple, RSI, spread, timestamp, block number, and reason string. Emits `HaltTriggered` events. Only the designated guardian address can call `recordVerdict()`.

### ThreatRegistry

Anyone can report a threat with a score (0-100), type, and reason. Reports are weighted — score decays over time and each upvote increases weight by 2 points (max 20). At an aggregate score ≥ 75, the asset is auto-verified. The agent reads `getAggregateThreatScore()` each cycle and feeds it into the guard engine.

### GuardianVault

Users call `enableProtection()` to opt in. When a HALT verdict is active (checked via `RiskGuardOracle.isHalted()`), the agent calls `protectTokens(user, token, amount, reason)` to move their tokens into the vault. Users can `withdraw()` individual tokens at any time. A 5-minute cooldown prevents rapid in/out cycling. Supports batch operations via `batchProtectTokens()`.

---

## Client dashboard pages

- **Dashboard** — Live guard verdicts per asset with RSI sparkline charts, active caution flags, verdict statistics, wallet connection, and protection status.
- **Positions** — Allowed position sizes computed from verdict × caution flags, with visual breakdown of the 5-guard metrics.
- **Threats** — ThreatRegistry browser showing all reports per asset, aggregate scores, upvote buttons, and a modal to submit new reports.
- **Guard Log** — Full history table of all guard decisions from the RiskGuardOracle, sorted by time (last 100 entries).

---

## Technology stack

| Layer | Tech |
|-------|------|
| Agent runtime | TypeScript, tsx, Node.js |
| AI | Claude Sonnet 4 (`@anthropic-ai/sdk`) |
| On-chain interactions | viem |
| Smart contracts | Solidity 0.8.28, Hardhat 3 Beta, OpenZeppelin 5 |
| Frontend | React 19, Vite 8, TypeScript, Recharts |
| Logging | winston |
| Chain | Arc testnet (chain ID 5042002), Circle's stablecoin-native L1 |
| Identity | ERC-8004 on-chain agent registration |
