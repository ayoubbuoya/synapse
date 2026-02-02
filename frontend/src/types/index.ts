export interface Chat {
  id: string;
  title: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  tokens_used?: number;
  cost_usdc?: string;
}

export interface CreateChatRequest {
  wallet_address: string;
  title?: string;
}

export interface SendMessageRequest {
  content: string;
}
