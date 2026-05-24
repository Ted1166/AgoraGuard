import { useState, useEffect, useCallback } from "react";
import { createWalletClient, createPublicClient, custom, http, defineChain, formatUnits } from "viem";
import { ARC, CONTRACTS, VAULT_ABI, THREAT_ABI } from "../config/contracts";

const arcTestnet = defineChain({
  id: ARC.chainId,
  name: "Arc Testnet",
  nativeCurrency: { name: "USD Coin", symbol: "USDC", decimals: 6 },
  rpcUrls: { default: { http: [ARC.rpcUrl] } },
  blockExplorers: { default: { name: "ArcScan", url: ARC.explorer } },
  testnet: true,
});

export interface WalletState {
  address: `0x${string}` | null;
  isConnected: boolean;
  isProtected: boolean;
  usdcVault: string;
  eurcVault: string;
  chainId: number | null;
  isWrongNetwork: boolean;
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null, isConnected: false, isProtected: false,
    usdcVault: "0", eurcVault: "0", chainId: null, isWrongNetwork: false,
  });
  const [txPending, setTxPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const publicClient = createPublicClient({
    chain: arcTestnet, transport: http(ARC.rpcUrl),
  });

  const loadVaultState = useCallback(async (address: `0x${string}`) => {
    try {
      const [isProtected, usdcBal, eurcBal] = await Promise.allSettled([
        publicClient.readContract({
          address: CONTRACTS.guardianVault, abi: VAULT_ABI,
          functionName: "isProtected", args: [address],
        }),
        publicClient.readContract({
          address: CONTRACTS.guardianVault, abi: VAULT_ABI,
          functionName: "getVaultBalance",
          args: [address, ARC.tokens.USDC],
        }),
        publicClient.readContract({
          address: CONTRACTS.guardianVault, abi: VAULT_ABI,
          functionName: "getVaultBalance",
          args: [address, ARC.tokens.EURC],
        }),
      ]);

      setState(s => ({
        ...s,
        isProtected: isProtected.status === "fulfilled" ? isProtected.value as boolean : false,
        usdcVault: usdcBal.status === "fulfilled" ? formatUnits(usdcBal.value as bigint, 6) : "0",
        eurcVault: eurcBal.status === "fulfilled" ? formatUnits(eurcBal.value as bigint, 6) : "0",
      }));
    } catch {}
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    if (!window.ethereum) {
      setError("MetaMask not found. Please install MetaMask.");
      return;
    }
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      }) as string;

      const address = accounts[0] as `0x${string}`;
      const chainNum = parseInt(chainId, 16);

      setState(s => ({
        ...s,
        address,
        isConnected: true,
        chainId: chainNum,
        isWrongNetwork: chainNum !== ARC.chainId,
      }));

      await loadVaultState(address);
    } catch (err: any) {
      setError(err.message ?? "Connection failed");
    }
  }, [loadVaultState]);

  const switchNetwork = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${ARC.chainId.toString(16)}` }],
      });
    } catch (switchErr: any) {
      if (switchErr.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: `0x${ARC.chainId.toString(16)}`,
            chainName: "Arc Testnet",
            nativeCurrency: {name: "USDC", symbol: "USDC", decimals: 6},
            rpcUrls: [ARC.rpcUrl],
            blockExplorerUrls:[ARC.explorer],
          }],
        });
      }
    }
  }, []);

  const getWalletClient = useCallback(() => {
    if (!window.ethereum || !state.address) return null;
    return createWalletClient({
      account: state.address,
      chain: arcTestnet,
      transport: custom(window.ethereum),
    });
  }, [state.address]);

  const enableProtection = useCallback(async () => {
    const wc = getWalletClient();
    if (!wc || !state.address) return;
    setTxPending(true); setError(null); setTxHash(null);
    try {
      const hash = await wc.writeContract({
        address: CONTRACTS.guardianVault, abi: VAULT_ABI,
        functionName: "enableProtection", args: [],
        account: state.address,
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await loadVaultState(state.address);
    } catch (err: any) {
      setError(err.shortMessage ?? err.message ?? "Transaction failed");
    } finally {
      setTxPending(false);
    }
  }, [getWalletClient, state.address, loadVaultState]);

  const disableProtection = useCallback(async () => {
    const wc = getWalletClient();
    if (!wc || !state.address) return;
    setTxPending(true); setError(null); setTxHash(null);
    try {
      const hash = await wc.writeContract({
        address: CONTRACTS.guardianVault, abi: VAULT_ABI,
        functionName: "disableProtection", args: [],
        account: state.address,
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await loadVaultState(state.address);
    } catch (err: any) {
      setError(err.shortMessage ?? err.message ?? "Transaction failed");
    } finally {
      setTxPending(false);
    }
  }, [getWalletClient, state.address, loadVaultState]);

  const withdraw = useCallback(async (token: `0x${string}`) => {
    const wc = getWalletClient();
    if (!wc || !state.address) return;
    setTxPending(true); setError(null); setTxHash(null);
    try {
      const hash = await wc.writeContract({
        address: CONTRACTS.guardianVault, abi: VAULT_ABI,
        functionName: "withdraw", args: [token],
        account: state.address,
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
      await loadVaultState(state.address);
    } catch (err: any) {
      setError(err.shortMessage ?? err.message ?? "Transaction failed");
    } finally {
      setTxPending(false);
    }
  }, [getWalletClient, state.address, loadVaultState]);

  const reportThreat = useCallback(async (
    asset: `0x${string}`,
    score: number,
    threatType: number,
    reason: string,
  ) => {
    const wc = getWalletClient();
    if (!wc || !state.address) return;
    setTxPending(true); setError(null); setTxHash(null);
    try {
      const hash = await wc.writeContract({
        address: CONTRACTS.threatRegistry, abi: THREAT_ABI,
        functionName: "reportThreat",
        args: [asset, score, threatType, reason],
        account: state.address,
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (err: any) {
      setError(err.shortMessage ?? err.message ?? "Transaction failed");
    } finally {
      setTxPending(false);
    }
  }, [getWalletClient, state.address]);

  const upvoteReport = useCallback(async (
    asset: `0x${string}`,
    index: number,
  ) => {
    const wc = getWalletClient();
    if (!wc || !state.address) return;
    setTxPending(true); setError(null); setTxHash(null);
    try {
      const hash = await wc.writeContract({
        address: CONTRACTS.threatRegistry, abi: THREAT_ABI,
        functionName: "upvoteReport",
        args: [asset, BigInt(index)],
        account: state.address,
      });
      setTxHash(hash);
      await publicClient.waitForTransactionReceipt({ hash });
    } catch (err: any) {
      setError(err.shortMessage ?? err.message ?? "Transaction failed");
    } finally {
      setTxPending(false);
    }
  }, [getWalletClient, state.address]);

  useEffect(() => {
    if (!window.ethereum) return;

    const onAccounts = (accounts: string[]) => {
      if (accounts.length === 0) {
        setState(s => ({ ...s, isConnected: false, address: null }));
      } else {
        const address = accounts[0] as `0x${string}`;
        setState(s => ({ ...s, address, isConnected: true }));
        loadVaultState(address);
      }
    };

    const onChain = (chainId: string) => {
      const chainNum = parseInt(chainId, 16);
      setState(s => ({ ...s, chainId: chainNum, isWrongNetwork: chainNum !== ARC.chainId }));
    };

    window.ethereum.on("accountsChanged", onAccounts);
    window.ethereum.on("chainChanged", onChain);
    return () => {
      window.ethereum?.removeListener("accountsChanged", onAccounts);
      window.ethereum?.removeListener("chainChanged", onChain);
    };
  }, [loadVaultState]);

  useEffect(() => {
    if (!state.address) return;
    const id = setInterval(() => loadVaultState(state.address!), 15_000);
    return () => clearInterval(id);
  }, [state.address, loadVaultState]);

  return {
    ...state,
    connect, switchNetwork,
    enableProtection, disableProtection, withdraw,
    reportThreat, upvoteReport,
    txPending, txHash, error,
    clearError: () => setError(null),
    clearTx: () => setTxHash(null),
    refresh: () => state.address && loadVaultState(state.address),
  };
}

declare global {
  interface Window {
    ethereum?: any;
  }
}