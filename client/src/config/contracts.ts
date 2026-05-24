export const CONTRACTS = {
  guardianVault: "0x8de977504d2bff46ecfd153b10cdb9f22715f988" as `0x${string}`,
  threatRegistry: "0xef650672437a97a7b987984239064d502f56272d" as `0x${string}`,
  riskGuardOracle: "0x2d101fafb24c660bfef07fd3106caf1074c80bf7" as `0x${string}`,
};

export const ARC = {
  chainId: 5042002,
  rpcUrl: import.meta.env.VITE_ARC_RPC_URL ?? "https://rpc.testnet.arc.network",
  explorer: "https://testnet.arcscan.app",
  tokens: {
    USDC: "0x3600000000000000000000000000000000000000" as `0x${string}`,
    EURC: "0x89B50855Aa3bE2F677cD6303Cec089B5F319D72a" as `0x${string}`,
  },
};

export const ORACLE_ABI = [
  {
    name: "getCurrentState",
    type: "function",
    inputs: [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "tuple", components: [
      { name: "verdict", type: "uint8"  },
      { name: "cautionFlags", type: "uint8"  },
      { name: "drawdownBps", type: "uint32" },
      { name: "atrMultipleBps", type: "uint32" },
      { name: "rsi", type: "uint8"  },
      { name: "spreadBps", type: "uint32" },
      { name: "timestamp", type: "uint64" },
      { name: "blockNumber", type: "uint64" },
      { name: "reason", type: "string" },
    ]}],
    stateMutability: "view",
  },
  {
    name: "getAllMonitoredAssets",
    type: "function",
    inputs:  [],
    outputs: [{ name: "", type: "address[]" }],
    stateMutability: "view",
  },
  {
    name: "assetStats",
    type: "function",
    inputs:  [{ name: "asset", type: "address" }],
    outputs: [
      { name: "haltCount", type: "uint64" },
      { name: "cautionCount", type: "uint64" },
      { name: "clearCount", type: "uint64" },
      { name: "totalRecords", type: "uint64" },
    ],
    stateMutability: "view",
  },
  {
    name: "getHistory",
    type: "function",
    inputs:  [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "tuple[]", components: [
      { name: "verdict", type: "uint8"  },
      { name: "cautionFlags", type: "uint8"  },
      { name: "drawdownBps", type: "uint32" },
      { name: "atrMultipleBps", type: "uint32" },
      { name: "rsi", type: "uint8"  },
      { name: "spreadBps", type: "uint32" },
      { name: "timestamp", type: "uint64" },
      { name: "blockNumber", type: "uint64" },
      { name: "reason", type: "string" },
    ]}],
    stateMutability: "view",
  },
] as const;

export const VAULT_ABI = [
  {
    name: "isProtected",
    type: "function",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    name: "enableProtection",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "disableProtection",
    type: "function",
    inputs: [],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    name: "getVaultBalance",
    type: "function",
    inputs:  [
      { name: "user", type: "address" },
      { name: "token", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    name: "withdraw",
    type: "function",
    inputs:  [{ name: "token", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const THREAT_ABI = [
  {
    name: "getAggregateThreatScore",
    type: "function",
    inputs:  [{ name: "asset", type: "address" }],
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
    name: "getAllReports",
    type: "function",
    inputs:  [{ name: "asset", type: "address" }],
    outputs: [{ name: "", type: "tuple[]", components: [
      { name: "reporter", type: "address" },
      { name: "score", type: "uint8"   },
      { name: "threatType", type: "uint8"   },
      { name: "reason", type: "string"  },
      { name: "timestamp", type: "uint256" },
      { name: "upvotes", type: "uint256" },
      { name: "verified", type: "bool"    },
    ]}],
    stateMutability: "view",
  },
] as const;