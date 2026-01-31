// src/hooks/useYellow.ts
import { useState } from "react";
import { useWalletClient, usePublicClient, useAccount } from "wagmi";
import { NitroliteClient, WalletStateSigner } from "@erc7824/nitrolite";
import { type Address } from "viem";

// Configuration
const CLEARNODE_URL = "wss://clearnet-sandbox.yellow.com/ws";
const SERVICE_NODE_ADDRESS = "0x79dAa774769334aF120f6CAA57E828FBBF56b39a";

// Addresses of polygon amoy 80002
const CONTRACT_ADDRESSES = {
  custody: "0x019B65A265EB3363822f2752141b3dF16131b262" as Address,
  adjudicator: "0x7c7ccbc98469190849BCC6c926307794fDfB11F2" as Address,
};
const CHALLENGE_DURATION = BigInt(86400); // 1 day in seconds

export const useYellow = () => {
  // 1. Get the Signer and Clients from RainbowKit/Wagmi
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { address, isConnected, chainId } = useAccount();

  const [client, setClient] = useState<NitroliteClient | null>(null);
  const [balance, setBalance] = useState(0);
  const [isYellowReady, setIsYellowReady] = useState(false);

  // 2. Initialize Yellow Client using the Wagmi Wallet Client
  const initYellow = async () => {
    if (!walletClient || !publicClient || !address || !chainId) {
      console.error("Wallet or Public client not ready");
      return;
    }

    console.log("⚡ Initializing Yellow over RainbowKit connection...");

    try {
      // The Bridge: We utilize the Wagmi clients to power the Nitrolite SDK
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
    } catch (error) {
      console.error("Failed to initialize Yellow client:", error);
    }
  };

  // 3. Open Session (Lock Funds)
  const openSession = async (amountUSDC: number) => {
    if (!client || !address) {
      console.error("Yellow client not ready. Call initYellow() first.");
      return;
    }

    const amountUnits = BigInt(amountUSDC * 1_000_000); // USDC 6 decimals

    // Logic to open channel...
    // Note: createChannel params might need adjustment based on strict types
    // This is a simplified example based on previous logic
    const sessionPayload = {
      participants: [address, SERVICE_NODE_ADDRESS as Address],
      allocations: [
        { asset: "usdc", amount: amountUnits.toString(), participant: address },
        { asset: "usdc", amount: "0", participant: SERVICE_NODE_ADDRESS },
      ],
      chainId: chainId || 11155111,
      challenge: 10,
    };

    // Note: client.createChannel signature requires CreateChannelParams
    // You will need to construct the params strictly according to CreateChannelParams interface
    // For now we keep the user's intent concept but acknowledge type strictness might require more objects
    // const channelId = await client.createChannel(sessionPayload as any);

    // Placeholder log until we fully implement createChannel construction
    console.log("Opening session with payload:", sessionPayload);

    setBalance(amountUSDC);
    // return channelId;
  };

  // 4. Pay (Sign Off-Chain)
  const signPayment = async (channelId: string, payAmount: number) => {
    if (!client) return null;

    const currentBal = balance - payAmount;

    // Create new state
    const newState = {
      nonce: Date.now(),
      amount: (payAmount * 1_000_000).toString(),
    };

    // Sign with the state signer

    // const signature = await client.stateSigner.signState(...)

    setBalance(currentBal);
    return { payload: newState };
  };

  return {
    initYellow,
    openSession,
    signPayment,
    isYellowReady,
    balance,
    isWalletConnected: isConnected,
  };
};
