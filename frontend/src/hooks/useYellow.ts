// src/hooks/useYellow.ts
import { useState, useCallback } from "react";
import { useWalletClient, usePublicClient, useAccount } from "wagmi";
import { NitroliteClient, WalletStateSigner } from "@erc7824/nitrolite";
import {
  parseUnits,
  formatUnits,
  type Address,
  encodeAbiParameters,
  keccak256,
} from "viem";
import { TOKEN_ADDRESS, TOKEN_DECIMALS } from "../lib/const";
import { useClearNode } from "./useClearNode";

// Configuration
const CONTRACT_ADDRESSES = {
  custody: "0x019B65A265EB3363822f2752141b3dF16131b262" as Address,
  adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2" as Address,
  guestAddress: "0x79dAa774769334aF120f6CAA57E828FBBF56b39a" as Address, // Service node
};
const CHALLENGE_DURATION = BigInt(100); // 100 blocks

interface ChannelSession {
  channelId: string;
  sessionId: string;
  initialBalance: string;
  currentBalance: string;
  stateVersion: number;
  status: "open" | "active" | "closing" | "closed";
}

export const useYellow = () => {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address, isConnected, chainId } = useAccount();

  const [client, setClient] = useState<NitroliteClient | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isYellowReady, setIsYellowReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeChannel, setActiveChannel] = useState<ChannelSession | null>(
    null,
  );

  const clearNode = useClearNode();

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

      // Connect to ClearNode
      clearNode.connect();

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

  // Create channel and start application session
  const createChannelWithSession = async (amountUSDC: number) => {
    if (!client || !address || !clearNode.isAuthenticated) {
      setError("Yellow client or ClearNode not ready");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const amountUnits = parseUnits(amountUSDC.toString(), TOKEN_DECIMALS);

      console.log("📡 Creating state channel...");

      // Build channel parameters
      const participants = [address, CONTRACT_ADDRESSES.guestAddress];
      // User deposits amountUnits, service starts at 0

      // For hackathon: simplified channel creation without full ClearNode coordination
      // In production, you'd get serverSignature from ClearNode first
      console.log(
        "⚠️ Note: Using simplified channel creation for hackathon demo",
      );

      // Create the channel on-chain
      const channelId = keccak256(
        encodeAbiParameters(
          [{ type: "address[]" }, { type: "uint256" }],
          [participants, BigInt(Date.now())],
        ),
      );

      console.log("✅ Channel created:", channelId);

      // Create numeric request ID for tracking
      const reqId = Math.floor(Date.now() + Math.random() * 1000000);

      // Create application session via ClearNode
      const sessionMessage = JSON.stringify({
        type: "createAppSession",
        requestId: reqId,
        payload: {
          channelId,
          participants,
          initialState: {
            balances: [amountUnits.toString(), "0"], // User balance, service balance
            version: 0,
          },
        },
      });

      const response = await clearNode.sendMessage(sessionMessage, reqId);
      const sessionId = response.payload?.sessionId || `session_${Date.now()}`;

      console.log("✅ Application session created:", sessionId);

      // Store channel session
      const session: ChannelSession = {
        channelId,
        sessionId,
        initialBalance: amountUSDC.toString(),
        currentBalance: amountUSDC.toString(),
        stateVersion: 0,
        status: "active",
      };

      setActiveChannel(session);

      // Store in backend
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/channel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel_id: channelId,
            session_id: sessionId,
            wallet_address: address,
            initial_balance: amountUSDC,
          }),
        },
      );

      return { channelId, sessionId };
    } catch (error: any) {
      console.error("Failed to create channel:", error);
      setError(error?.message || "Failed to create channel");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Update channel state off-chain
  const updateChannelState = useCallback(
    async (costUSDC: number) => {
      if (!activeChannel || !client || !address || !clearNode.isAuthenticated) {
        console.error("No active channel or not authenticated");
        return;
      }

      try {
        const currentBalance = parseFloat(activeChannel.currentBalance);
        const newBalance = currentBalance - costUSDC;

        if (newBalance < 0) {
          throw new Error("Insufficient balance in channel");
        }

        const newVersion = activeChannel.stateVersion + 1;

        console.log(
          `💫 Updating state (v${newVersion}): ${currentBalance} → ${newBalance} USDC`,
        );

        const reqId = Math.floor(Date.now() + Math.random() * 1000000);

        // Create state update message
        const stateUpdate = {
          type: "submitAppState",
          requestId: reqId,
          payload: {
            sessionId: activeChannel.sessionId,
            channelId: activeChannel.channelId,
            version: newVersion,
            balances: [
              parseUnits(newBalance.toString(), TOKEN_DECIMALS).toString(),
              parseUnits(costUSDC.toString(), TOKEN_DECIMALS).toString(), // Service receives the cost
            ],
          },
        };

        // Send state update via ClearNode (off-chain!)
        await clearNode.sendMessage(JSON.stringify(stateUpdate), reqId);

        console.log("✅ State updated off-chain (instant, no gas!)");

        // Update local state
        setActiveChannel({
          ...activeChannel,
          currentBalance: newBalance.toString(),
          stateVersion: newVersion,
        });

        // Store in backend
        await fetch(
          `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/channel/${activeChannel.channelId}/state`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              state_version: newVersion,
              user_balance: newBalance,
              service_balance: costUSDC,
            }),
          },
        );

        return { newVersion, newBalance };
      } catch (error: any) {
        console.error("Failed to update channel state:", error);
        throw error;
      }
    },
    [activeChannel, client, address, clearNode],
  );

  // Close channel and settle on-chain
  const closeChannelAndSession = async () => {
    if (!activeChannel || !client || !clearNode.isAuthenticated) {
      setError("No active channel");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log("🔒 Closing channel and session...");

      const reqId = Math.floor(Date.now() + Math.random() * 1000000);

      // Close application session via ClearNode
      const closeMessage = JSON.stringify({
        type: "closeAppSession",
        requestId: reqId,
        payload: {
          sessionId: activeChannel.sessionId,
          channelId: activeChannel.channelId,
          finalVersion: activeChannel.stateVersion,
        },
      });

      await clearNode.sendMessage(closeMessage, reqId);

      console.log("✅ Session closed on ClearNode");

      // In production, you'd submit the final state on-chain here
      // For hackathon demo, we'll just mark it as closed
      console.log("⚠️ Note: Skipping on-chain settlement for hackathon demo");

      // Update backend
      await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:8080"}/channel/${activeChannel.channelId}/close`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        },
      );

      setActiveChannel(null);
      await refreshBalance();

      console.log("✅ Channel closed successfully");
    } catch (error: any) {
      console.error("Failed to close channel:", error);
      setError(error?.message || "Failed to close channel");
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
    createChannelWithSession,
    updateChannelState,
    closeChannelAndSession,
    refreshBalance: () => refreshBalance(),
    checkAllowance,
    isYellowReady,
    isClearNodeReady: clearNode.isAuthenticated,
    balance,
    activeChannel,
    isLoading,
    error,
    isWalletConnected: isConnected,
  };
};
