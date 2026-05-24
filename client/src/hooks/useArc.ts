import { useState, useEffect, useCallback } from "react";
import { createPublicClient, http, defineChain, formatUnits } from "viem";
import { CONTRACTS, ARC, ORACLE_ABI, VAULT_ABI, THREAT_ABI } from "../config/contracts";

const arcTestnet = defineChain({
  id: ARC.chainId,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: [ARC.rpcUrl] } },
  blockExplorers: { default: { name: "ArcScan", url: ARC.explorer } },
  testnet: true,
});

const client = createPublicClient({
  chain: arcTestnet,
  transport: http(ARC.rpcUrl),
});

export type Verdict = "CLEAR" | "CAUTION" | "HALT";

export interface GuardState {
  verdict: Verdict;
  cautionFlags: number;
  drawdownPct: number;
  atrMultiple: number;
  rsi: number;
  spreadBps: number;
  timestamp: number;
  blockNumber: number;
  reason: string;
}

export interface AssetData {
  address: string;
  symbol: string;
  state: GuardState | null;
  stats: {haltCount: number; cautionCount: number; clearCount: number; totalRecords: number} | null;
  history: GuardState[];
}

export interface ThreatReport {
  reporter: string;
  score: number;
  threatType: number;
  reason: string;
  timestamp: number;
  upvotes: number;
  verified: boolean;
}

const SYMBOL_MAP: Record<string, string> = {
  [ARC.tokens.USDC.toLowerCase()]: "USDC",
  [ARC.tokens.EURC.toLowerCase()]: "EURC",
};

const THREAT_TYPES = [
  "Unknown", "Malicious Contract", "Honeypot", "Rug Pull",
  "Excessive Approval", "Market Manipulation", "Flash Loan", "Other",
];

function verdictCode(n: number): Verdict {
  return n === 2 ? "HALT" : n === 1 ? "CAUTION" : "CLEAR";
}

function parseState(raw: any): GuardState {
  return {
    verdict: verdictCode(raw.verdict),
    cautionFlags: raw.cautionFlags,
    drawdownPct: Number(raw.drawdownBps) / 100,
    atrMultiple: Number(raw.atrMultipleBps) / 100,
    rsi: raw.rsi,
    spreadBps: raw.spreadBps,
    timestamp: Number(raw.timestamp),
    blockNumber: Number(raw.blockNumber),
    reason: raw.reason,
  };
}

export function useArc(refreshMs = 30_000) {
  const [assets, setAssets] = useState<AssetData[]>([]);
  const [threats, setThreats] = useState<Record<string, ThreatReport[]>>({});
  const [blockNumber, setBlockNumber] = useState<bigint>(0n);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetch = useCallback(async () => {
    try {
      const block = await client.getBlockNumber();
      setBlockNumber(block);

      let monitored: string[] = [];
      try {
        monitored = await client.readContract({
          address: CONTRACTS.riskGuardOracle,
          abi: ORACLE_ABI, functionName: "getAllMonitoredAssets",
        }) as string[];
      } catch { monitored = [ARC.tokens.USDC, ARC.tokens.EURC]; }

      const assetData = await Promise.all(
        monitored.map(async (addr): Promise<AssetData> => {
          const address = addr.toLowerCase();
          const symbol = SYMBOL_MAP[address] ?? addr.slice(0, 8) + "...";

          const [state, stats, history] = await Promise.allSettled([
            client.readContract({
              address: CONTRACTS.riskGuardOracle,
              abi: ORACLE_ABI, functionName: "getCurrentState",
              args: [addr as `0x${string}`],
            }),
            client.readContract({
              address: CONTRACTS.riskGuardOracle,
              abi: ORACLE_ABI, functionName: "assetStats",
              args: [addr as `0x${string}`],
            }),
            client.readContract({
              address: CONTRACTS.riskGuardOracle,
              abi: ORACLE_ABI, functionName: "getHistory",
              args: [addr as `0x${string}`],
            }),
          ]);

          return {
            address: addr,
            symbol,
            state: state.status === "fulfilled" ? parseState(state.value)   : null,
            stats: stats.status === "fulfilled" ? {
              haltCount: Number((stats.value as any)[0]),
              cautionCount: Number((stats.value as any)[1]),
              clearCount: Number((stats.value as any)[2]),
              totalRecords: Number((stats.value as any)[3]),
            } : null,
            history: history.status === "fulfilled"
              ? (history.value as any[]).map(parseState)
              : [],
          };
        })
      );

      setAssets(assetData);

      const threatData: Record<string, ThreatReport[]> = {};
      for (const addr of monitored) {
        try {
          const reports = await client.readContract({
            address: CONTRACTS.threatRegistry,
            abi: THREAT_ABI, functionName: "getAllReports",
            args: [addr as `0x${string}`],
          }) as any[];
          threatData[addr] = reports.map(r => ({
            reporter: r.reporter,
            score: r.score,
            threatType: r.threatType,
            reason: r.reason,
            timestamp: Number(r.timestamp),
            upvotes: Number(r.upvotes),
            verified: r.verified,
          }));
        } catch { threatData[addr] = []; }
      }
      setThreats(threatData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Arc fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
    const id = setInterval(fetch, refreshMs);
    return () => clearInterval(id);
  }, [fetch, refreshMs]);

  return { assets, threats, blockNumber, loading, lastUpdated, refresh: fetch };
}

export function useVault(address: `0x${string}` | null) {
  const [isProtected, setIsProtected] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState("0");
  const [eurcBalance, setEurcBalance] = useState("0");

  useEffect(() => {
    if (!address) return;
    const load = async () => {
      try {
        const [prot, usdcBal, eurcBal] = await Promise.allSettled([
          client.readContract({
            address: CONTRACTS.guardianVault,
            abi: VAULT_ABI, functionName: "isProtected", args: [address],
          }),
          client.readContract({
            address: CONTRACTS.guardianVault,
            abi: VAULT_ABI, functionName: "getVaultBalance",
            args: [address, ARC.tokens.USDC],
          }),
          client.readContract({
            address: CONTRACTS.guardianVault,
            abi: VAULT_ABI, functionName: "getVaultBalance",
            args: [address, ARC.tokens.EURC],
          }),
        ]);
        if (prot.status === "fulfilled") setIsProtected(prot.value as boolean);
        if (usdcBal.status === "fulfilled") setUsdcBalance(formatUnits(usdcBal.value as bigint, 6));
        if (eurcBal.status === "fulfilled") setEurcBalance(formatUnits(eurcBal.value as bigint, 6));
      } catch {}
    };
    load();
    const id = setInterval(load, 15_000);
    return () => clearInterval(id);
  }, [address]);

  return { isProtected, usdcBalance, eurcBalance };
}

export { THREAT_TYPES };