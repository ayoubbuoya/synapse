// src/hooks/useClearNode.ts
import { useState, useEffect, useCallback, useRef } from "react";
import { useWalletClient, useAccount } from "wagmi";
import {
  createAuthRequestMessage,
  createAuthVerifyMessage,
} from "@erc7824/nitrolite";
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
  const { address } = useAccount();

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

    console.log("🔌 Connecting to ClearNode...");
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
      setError("WebSocket connection error");
    };

    websocket.onclose = () => {
      console.log("🔌 Disconnected from ClearNode");
      setIsConnected(false);
      setIsAuthenticated(false);
    };

    setWs(websocket);
  }, [ws]);

  // Authenticate with ClearNode
  const authenticate = async (websocket: WebSocket) => {
    if (!address) {
      console.error("No wallet address available");
      return;
    }

    try {
      const requestId = generateRequestId();
      const authRequest = await createAuthRequestMessage(
        {
          address: address,
          session_key: address, // Using same address for session key for now
          app_name: "Synapse",
          allowances: [],
          expire: Math.floor(Date.now() / 1000 + 3600 * 24).toString(), // 24h expiration
          scope: "app",
          application: address, // Self-hosted app
        },
        requestId,
      );

      websocket.send(authRequest);
      console.log("🔐 Sent auth request");
    } catch (err) {
      console.error("Failed to create auth request:", err);
      setError("Authentication failed");
    }
  };

  // Handle authentication challenge
  const handleAuthChallenge = async (
    websocket: WebSocket,
    message: ClearNodeMessage,
  ) => {
    if (!walletClient || !address) {
      console.error("Wallet client not available");
      return;
    }

    try {
      const challenge =
        message.payload?.challenge_message || message.payload?.challenge;
      if (!challenge) {
        console.error("No challenge in message");
        return;
      }

      // Create signer matching MessageSigner type: (payload: RPCData) => Promise<Hex>
      const signer = async (payload: any) => {
        const message = JSON.stringify(payload);
        return await walletClient.signMessage({
          message,
          account: address,
        });
      };

      const requestId = generateRequestId();
      const authVerify = await createAuthVerifyMessage(
        signer,
        message.payload,
        requestId,
      );

      websocket.send(authVerify);
      console.log("🔐 Sent auth verification");
    } catch (err) {
      console.error("Failed to handle auth challenge:", err);
      setError("Authentication verification failed");
    }
  };

  // Send message and wait for response
  const sendMessage = useCallback(
    (message: string, requestId?: number): Promise<any> => {
      return new Promise((resolve, reject) => {
        if (!ws || ws.readyState !== WebSocket.OPEN) {
          reject(new Error("WebSocket not connected"));
          return;
        }

        const id = requestId || generateRequestId();
        pendingRequests.current.set(id, resolve);

        ws.send(message);

        // Timeout after 30 seconds
        setTimeout(() => {
          if (pendingRequests.current.has(id)) {
            pendingRequests.current.delete(id);
            reject(new Error("Request timeout"));
          }
        }, 30000);
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
