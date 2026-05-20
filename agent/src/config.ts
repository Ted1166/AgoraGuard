import "dotenv/config";

export const ARC = {
  chainId:   5042002,
  rpcUrl:    process.env.ARC_RPC_URL ?? "https://rpc.testnet.arc.network",
  explorer:  "https://testnet.arcscan.app",
  faucet:    "https://faucet.circle.com",

  tokens: {
    USDC: "0x3600000000000000000000000000000000000000" as `0x${string}`,
    EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as `0x${string}`,
    USYC: "0xe9185F0c5F296Ed1797AaE4238D26CCaBEadb86C" as `0x${string}`,
  },

  identity: {
    identityRegistry:   "0x8004A818BFB912233c491871b3d84c89A494BD9e" as `0x${string}`,
    reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713" as `0x${string}`,
    validationRegistry: "0x8004Cb1BF31DAf7788923b405b754f57acEB4272" as `0x${string}`,
  },

  cctp: {
    tokenMessenger:    "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as `0x${string}`,
    messageTransmitter:"0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275" as `0x${string}`,
  },
} as const;

export const CONTRACTS = {
  guardianVault:   (process.env.GUARDIAN_VAULT_ADDRESS   ?? "") as `0x${string}`,
  threatRegistry:  (process.env.THREAT_REGISTRY_ADDRESS  ?? "") as `0x${string}`,
  riskGuardOracle: (process.env.RISK_GUARD_ORACLE_ADDRESS ?? "") as `0x${string}`,
} as const;

export const RISK = {
  // Position sizing
  maxPositionPct:       0.20,
  cautionSizeMultiplier: 0.67,

  // Drawdown
  haltDrawdownPct:    0.12,
  cautionDrawdownPct: 0.07,

  // Volatility (ATR)
  atrPeriod:          14,
  atrHaltMultiple:    2.5,
  atrCautionMultiple: 1.5,

  // RSI
  rsiPeriod:       14,
  rsiOverbought:   72,
  rsiOversold:     28,

  // Spread
  spreadHaltBps:    100,
  spreadCautionBps:  50,

  // Cooldown after stop-loss
  cooldownSecs: 300,

  // Threat Registry integration
  threatScoreCautionThreshold: 50,
  threatScoreHaltThreshold:    75,

  // GoPlus risk score (0-100)
  goplusHaltThreshold: 80,
} as const;

export const ASSET_MAP: Record<string, `0x${string}`> = {
  BTCUSDT: ARC.tokens.USDC,
  ETHUSDT: ARC.tokens.USDC,
  EURUSDT: ARC.tokens.EURC,
};

export const MONITORED_TOKENS: `0x${string}`[] = process.env.MONITORED_TOKENS
  ? (process.env.MONITORED_TOKENS.split(",").map(a => a.trim()) as `0x${string}`[])
  : [ARC.tokens.USDC, ARC.tokens.EURC];

export const PROTECTED_WALLETS: `0x${string}`[] = process.env.PROTECTED_WALLETS
  ? (process.env.PROTECTED_WALLETS.split(",").map(a => a.trim()) as `0x${string}`[])
  : [];

export const AGENT = {
  cycleIntervalSecs: Number(process.env.CYCLE_INTERVAL_SECS ?? 30),
  aiEnabled:         process.env.AI_ENABLED !== "false",
  privateKey:        (process.env.PRIVATE_KEY ?? "") as `0x${string}`,
  anthropicKey:      process.env.ANTHROPIC_API_KEY ?? "",
  goplusKey:         process.env.GOPLUS_API_KEY ?? "",

  canteenUpdates: process.env.CANTEEN_UPDATES === "true",
} as const;

export const ORACLE_ABI = [
  {
    name: "recordVerdict",
    type: "function",
    inputs: [
      { name: "asset",          type: "address" },
      { name: "verdict",        type: "uint8"   },
      { name: "cautionFlags",   type: "uint8"   },
      { name: "drawdownBps",    type: "uint32"  },
      { name: "atrMultipleBps", type: "uint32"  },
      { name: "rsi",            type: "uint8"   },
      { name: "spreadBps",      type: "uint32"  },
      { name: "reason",         type: "string"  },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "getCurrentVerdict",
    type: "function",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "isHalted",
    type: "function",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

export const VAULT_ABI = [
  {
    name: "protectTokens",
    type: "function",
    inputs: [
      { name: "user",   type: "address" },
      { name: "token",  type: "address" },
      { name: "amount", type: "uint256" },
      { name: "reason", type: "string"  },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "batchProtectTokens",
    type: "function",
    inputs: [
      { name: "user",    type: "address"   },
      { name: "tokens",  type: "address[]" },
      { name: "amounts", type: "uint256[]" },
      { name: "reason",  type: "string"    },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "isProtected",
    type: "function",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    name: "isCooldownActive",
    type: "function",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

export const THREAT_ABI = [
  {
    name: "getAggregateThreatScore",
    type: "function",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
  },
  {
    name: "isVerifiedThreat",
    type: "function",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    name: "reportThreat",
    type: "function",
    inputs: [
      { name: "asset",      type: "address" },
      { name: "score",      type: "uint8"   },
      { name: "threatType", type: "uint8"   },
      { name: "reason",     type: "string"  },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;