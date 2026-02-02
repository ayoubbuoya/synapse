// src/hooks/useYellow.ts
import { useState } from "react";
import { useWalletClient, usePublicClient, useAccount } from "wagmi";
import { NitroliteClient, WalletStateSigner } from "@erc7824/nitrolite";
import { parseUnits, formatUnits, type Address } from "viem";
import { TOKEN_ADDRESS, TOKEN_DECIMALS } from "../lib/const";

// Configuration
const CONTRACT_ADDRESSES = {
  custody: "0x019B65A265EB3363822f2752141b3dF16131b262" as Address,
  adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2" as Address,
  guestAddress: "0x79dAa774769334aF120f6CAA57E828FBBF56b39a" as Address,
};
const CHALLENGE_DURATION = BigInt(100); // 100 blocks

export const useYellow = () => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address, isConnected, chainId } = useAccount();

  const [client, setClient] = useState<NitroliteClient | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isYellowReady, setIsYellowReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Yellow Client
  const initYellow = async () => {
    if (!walletClient || !publicClient || !address || !chainId) {
      setError("Wallet or Public client not ready");
      console.error("Wallet or Public client not ready");
      return;
    }

    console.log("⚡ Initializing Yellow over RainbowKit connection...");
    setIsLoading(true);
    setError(null);

    try {
      const signer = new WalletStateSigner(walletClient);

      const nitro = new NitroliteClient({
        publicClient: publicClient,
        walletClient: walletClient,
        stateSigner: signer,
        addresses: CONTRACT_ADDRESSES,
        chainId: chainId,
        challengeDuration: CHALLENGE_DURATION,
      });

      setClient(nitro);
      setIsYellowReady(true);
      console.log("✅ Yellow Layer Initialized");

      // Fetch initial balance
      await refreshBalance(nitro, address);
    } catch (error) {
      console.error("Failed to initialize Yellow client:", error);
      setError("Failed to initialize Yellow client");
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh balance from custody contract
  const refreshBalance = async (
    nitroClient?: NitroliteClient,
    userAddress?: Address,
  ) => {
    const clientToUse = nitroClient || client;
    const addressToUse = userAddress || address;

    if (!clientToUse || !addressToUse) {
      console.error("Client or address not available");
      return;
    }

    try {
      const balanceWei = await clientToUse.getAccountBalance(TOKEN_ADDRESS);
      const balanceFormatted = formatUnits(balanceWei, TOKEN_DECIMALS);
      setBalance(balanceFormatted);
      console.log("💰 Balance:", balanceFormatted, "USDC");
    } catch (error) {
      console.error("Failed to fetch balance:", error);
    }
  };

  // Approve USDC tokens for spending by custody contract
  const approveTokens = async (amountUSDC: number) => {
    if (!client || !address) {
      setError("Yellow client not ready. Call initYellow() first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountUnits = parseUnits(amountUSDC.toString(), TOKEN_DECIMALS);

      console.log("🔓 Approving tokens...");
      const txHash = await client.approveTokens(TOKEN_ADDRESS, amountUnits);
      console.log("✅ Tokens approved. Transaction hash:", txHash);

      return txHash;
    } catch (error: any) {
      console.error("Failed to approve tokens:", error);
      setError(error?.message || "Failed to approve tokens");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Deposit funds to custody contract
  const depositFunds = async (amountUSDC: number) => {
    if (!client || !address) {
      setError("Yellow client not ready. Call initYellow() first.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountUnits = parseUnits(amountUSDC.toString(), TOKEN_DECIMALS);

      console.log("💸 Depositing funds...");
      const txHash = await client.deposit(TOKEN_ADDRESS, amountUnits);
      console.log("✅ Deposit successful. Transaction hash:", txHash);

      // Refresh balance after deposit
      await refreshBalance();

      return txHash;
    } catch (error: any) {
      console.error("Failed to deposit:", error);
      setError(error?.message || "Failed to deposit funds");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Check token allowance
  const checkAllowance = async () => {
    if (!client) {
      return BigInt(0);
    }

    try {
      const allowance = await client.getTokenAllowance(TOKEN_ADDRESS);
      return allowance;
    } catch (error) {
      console.error("Failed to check allowance:", error);
      return BigInt(0);
    }
  };

  return {
    initYellow,
    approveTokens,
    depositFunds,
    refreshBalance: () => refreshBalance(),
    checkAllowance,
    isYellowReady,
    balance,
    isLoading,
    error,
    isWalletConnected: isConnected,
  };
};
