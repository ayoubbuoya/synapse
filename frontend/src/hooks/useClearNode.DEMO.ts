// src/hooks/useClearNode.ts - DEMO VERSION
// This version bypasses the second signature for video recording purposes
import { useState, useEffect, useCallback, useRef } from "react";
import { useWalletClient, useAccount } from "wagmi";
import { createAuthRequestMessage } from "@erc7824/nitrolite";
import type { Address } from "viem";

// ClearNode WebSocket URL
const CLEARNODE_URL = "wss://clearnet-sandbox.yellow.com/ws";

// Message types
type MessageType =
  | "auth.request"
  | "auth.challenge"
  | "auth_challenge"
  | "auth.verify"
  | "auth.success"
  | "auth_success"
  | "createAppSession"
  | "submitAppState"
  | "closeAppSession"
  | "error";

interface ClearNodeMessage {
  type: MessageType;
  requestId?: number;
  payload?: any;
  error?: string;
}

interface AppSession {
  sessionId: string;
  channelId: string;
  participants: Address[];
  status: "active" | "closing" | "closed";
}

export const useClearNode = () => {
  const { data: walletClient } = useWalletClient();
  const { address, chainId } = useAccount();

  // Use refs to avoid stale closures in WebSocket callbacks
  const walletClientRef = useRef(walletClient);
  const addressRef = useRef(address);
  const chainIdRef = useRef(chainId);

  useEffect(() => {
    walletClientRef.current = walletClient;
  }, [walletClient]);

  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  useEffect(() => {
    chainIdRef.current = chainId;
  }, [chainId]);

  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeSession, setActiveSession] = useState<AppSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  const messageHandlers = useRef<Map<string, (message: any) => void>>(
    new Map(),
  );
  const pendingRequests = useRef<Map<number, (response: any) => void>>(
    new Map(),
  );

  // Generate unique request ID (must be number)
  const generateRequestId = () =>
    Math.floor(Date.now() + Math.random() * 1000000);

  // Connect to ClearNode
  const connect = useCallback(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      console.log("Already connected to ClearNode");
      return;
    }

    console.log("🎬 DEMO MODE: Connecting to ClearNode...");
    const websocket = new WebSocket(CLEARNODE_URL);

    websocket.onopen = () => {
      console.log("✅ Connected to ClearNode");
      setIsConnected(true);
      setError(null);

      // Start authentication flow
      authenticate(websocket);
    };

    websocket.onmessage = (event) => {
      try {
        const rawMessage = JSON.parse(event.data);
        console.log("📨 Received raw:", rawMessage);

        let message: ClearNodeMessage | null = null;

        // Parse RPC format
        if (rawMessage.res && Array.isArray(rawMessage.res)) {
          const [requestId, method, params] = rawMessage.res;
          message = {
            type: method as MessageType,
            requestId: requestId,
            payload: params,
          };
        } else if (rawMessage.req && Array.isArray(rawMessage.req)) {
          const [requestId, method, params] = rawMessage.req;
          message = {
            type: method as MessageType,
            requestId: requestId,
            payload: params,
          };
        } else if (
          rawMessage.res &&
          Array.isArray(rawMessage.res) &&
          rawMessage.res.length === 4
        ) {
          // Handle 4-element response format: [requestId, method, params, timestamp]
          const [requestId, method, params] = rawMessage.res;
          message = {
            type: method as MessageType,
            requestId: requestId,
            payload: params,
          };
        }

        if (!message) {
          console.warn("Unknown message format:", rawMessage);
          return;
        }

        console.log("📨 Parsed:", message);

        // Handle specific message types
        switch (message.type) {
          case "auth_challenge": // RPC method name uses underscore
          case "auth.challenge":
            handleAuthChallenge(websocket, message);
            break;
          case "auth_success":
            setIsAuthenticated(true);
            console.log("✅ Authenticated with ClearNode");
            // Resolve pending auth request
            if (
              message.requestId &&
              pendingRequests.current.has(message.requestId)
            ) {
              const resolver = pendingRequests.current.get(message.requestId);
              resolver?.(message);
              pendingRequests.current.delete(message.requestId);
            }
            break;
          default:
            // Handle response to pending request
            if (
              message.requestId &&
              pendingRequests.current.has(message.requestId)
            ) {
              const resolver = pendingRequests.current.get(message.requestId);
              resolver?.(message);
              pendingRequests.current.delete(message.requestId);
              return;
            }

            // Call registered handler if exists
            const handler = messageHandlers.current.get(message.type);
            if (handler) {
              handler(message);
            }
        }
      } catch (err) {
        console.error("Failed to parse message:", err);
      }
    };

    websocket.onerror = (event) => {
      console.error("❌ WebSocket error:", event);
      // DEMO MODE: Don't set error, just log it
      console.log("🎬 DEMO: Ignoring WebSocket error");
    };

    websocket.onclose = () => {
      console.log("🔌 Disconnected from ClearNode");
      setIsConnected(false);
      // DEMO MODE: Keep authenticated state
      console.log("🎬 DEMO: Keeping authenticated state");
    };

    setWs(websocket);
  }, [ws]);

  // Authenticate with ClearNode - DEMO MODE
  const authenticate = async (websocket: WebSocket) => {
    const currentAddress = addressRef.current;
    if (!currentAddress) {
      console.error("No wallet address available");
      return;
    }

    try {
      const requestId = generateRequestId();
      const authRequest = await createAuthRequestMessage(
        {
          address: currentAddress,
          session_key: currentAddress,
          app_name: "Synapse",
          allowances: [],
          expire: Math.floor(Date.now() / 1000 + 3600 * 24).toString(),
          scope: "user",
          application: currentAddress,
        },
        requestId,
      );

      websocket.send(authRequest);
      console.log("🔐 Sent auth request");
    } catch (err) {
      console.error("Failed to create auth request:", err);
      // DEMO MODE: Ignore error and mark as authenticated
      console.log(
        "🎬 DEMO: Ignoring auth request error, marking as authenticated",
      );
      setIsAuthenticated(true);
    }
  };

  // Handle authentication challenge - DEMO MODE (bypasses second signature)
  const handleAuthChallenge = async (
    websocket: WebSocket,
    message: ClearNodeMessage,
  ) => {
    const client = walletClientRef.current;
    const currentAddress = addressRef.current;
    const currentChainId = chainIdRef.current;

    if (!client || !currentAddress || !currentChainId) {
      console.error("Wallet client or chainId not available");
      // DEMO MODE: Mark as authenticated anyway
      console.log(
        "🎬 DEMO: No wallet client, but marking as authenticated anyway",
      );
      setIsAuthenticated(true);
      return;
    }

    try {
      const challenge =
        message.payload?.challenge_message || message.payload?.challenge;
      if (!challenge) {
        console.error("No challenge in message");
        // DEMO MODE: Mark as authenticated anyway
        console.log(
          "🎬 DEMO: No challenge, but marking as authenticated anyway",
        );
        setIsAuthenticated(true);
        return;
      }

      console.log("🎬 DEMO MODE: Signing first challenge only...");

      // Domain definition for Synapse app
      const domain = {
        name: "Synapse",
        version: "1",
        chainId: currentChainId,
      };

      // 1. Sign the challenge with EIP-712 (Proof of Wallet Ownership)
      const challengeSignature = await client.signTypedData({
        account: currentAddress,
        domain,
        types: {
          Challenge: [{ name: "message", type: "string" }],
        },
        primaryType: "Challenge",
        message: {
          message: challenge,
        },
      });

      console.log("✅ First signature completed");
      console.log(
        "🎬 DEMO MODE: Skipping second signature, simulating success...",
      );

      // DEMO MODE: Skip the second signature and just mark as authenticated
      setTimeout(() => {
        console.log("✅ DEMO: Simulated authentication success");
        setIsAuthenticated(true);
      }, 1000);

      // Still try to send a message (will fail in background, but we ignore it)
      const requestId = generateRequestId();
      const rpcPayload = [
        requestId,
        "auth_verify",
        {
          challenge: challenge,
          signature: challengeSignature,
        },
        Date.now(),
      ];

      const messageToSend = JSON.stringify({
        req: rpcPayload,
        sig: [
          "0x0000000000000000000000000000000000000000000000000000000000000000",
        ], // Dummy signature
      });

      websocket.send(messageToSend);
      console.log(
        "🎬 DEMO: Sent auth (will show 'invalid signature' in background, but we ignore it)",
      );
    } catch (err) {
      console.error("Failed to handle auth challenge:", err);
      // DEMO MODE: Even if it fails, mark as authenticated
      console.log("🎬 DEMO: Ignoring error, marking as authenticated anyway");
      setIsAuthenticated(true);
    }
  };

  // Send message and wait for response
  const sendMessage = useCallback(
    (message: string, requestId?: number): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          // DEMO MODE: Resolve with dummy response instead of rejecting
          console.log(
            "🎬 DEMO: WebSocket not connected, returning dummy response",
          );
          resolve({ payload: { success: true } });
          return;
        }

        const id = requestId || generateRequestId();
        pendingRequests.current.set(id, resolve);

        ws.send(message);

        // Timeout after 5 seconds (shorter for demo)
        setTimeout(() => {
          if (pendingRequests.current.has(id)) {
            pendingRequests.current.delete(id);
            // DEMO MODE: Resolve with dummy response instead of rejecting
            console.log("🎬 DEMO: Request timeout, returning dummy response");
            resolve({ payload: { success: true } });
          }
        }, 5000);
      });
    },
    [ws],
  );

  // Register message handler
  const onMessage = useCallback(
    (type: MessageType, handler: (message: any) => void) => {
      messageHandlers.current.set(type, handler);
      return () => messageHandlers.current.delete(type);
    },
    [],
  );

  // Disconnect
  const disconnect = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
      setIsConnected(false);
      setIsAuthenticated(false);
      setActiveSession(null);
    }
  }, [ws]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [ws]);

  return {
    connect,
    disconnect,
    sendMessage,
    onMessage,
    isConnected,
    isAuthenticated,
    activeSession,
    error,
  };
};
