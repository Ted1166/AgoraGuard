import {
  createPublicClient,
  createWalletClient,
  http,
  defineChain,
  type PublicClient,
  type WalletClient,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

function getRpcUrl(): string {
  return (
    process.env.ARC_RPC_URL ??
    "https://rpc.testnet.arc-node.thecanteenapp.com/v1/swrm_c6471f0a2d8cfc30dac510f4ee758e1350cde083ccbca4faf1cd56bc3563fece"
  );
}

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "ArcScan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
});

let _publicClient: PublicClient | null = null;

export function getPublicClient(): PublicClient {
  if (!_publicClient) {
    _publicClient = createPublicClient({
      chain:     arcTestnet,
      transport: http(getRpcUrl()),
    });
  }
  return _publicClient;
}

export const publicClient = new Proxy({} as PublicClient, {
  get(_target, prop) {
    return (getPublicClient() as any)[prop];
  },
});

export function getWalletClient(): WalletClient {
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error("PRIVATE_KEY not set in .env");
  const account = privateKeyToAccount(key as `0x${string}`);
  return createWalletClient({
    account,
    chain:     arcTestnet,
    transport: http(getRpcUrl()),
  });
}

export function getAccount() {
  const key = process.env.PRIVATE_KEY;
  if (!key) throw new Error("PRIVATE_KEY not set in .env");
  return privateKeyToAccount(key as `0x${string}`);
}

export async function getBlockNumber(): Promise<bigint> {
  return getPublicClient().getBlockNumber();
}

export async function getUSDCBalance(address: `0x${string}`): Promise<bigint> {
  try {
    return await getPublicClient().readContract({
      address: "0x3600000000000000000000000000000000000000",
      abi: [{
        name: "balanceOf", type: "function",
        inputs:  [{ name: "account", type: "address" }],
        outputs: [{ name: "",        type: "uint256" }],
        stateMutability: "view",
      }],
      functionName: "balanceOf",
      args: [address],
    }) as bigint;
  } catch {
    return 0n;
  }
}