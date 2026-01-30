import axios from "axios";
import type { Chat, CreateChatRequest, Message, SendMessageRequest } from "../types";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const ChatService = {
  createChat: async (data: CreateChatRequest): Promise<Chat> => {
    const response = await api.post<Chat>("/chat", data);
    return response.data;
  },

  getChats: async (walletAddress: string): Promise<Chat[]> => {
    const response = await api.get<Chat[]>("/chat", {
      params: { wallet_address: walletAddress },
    });
    return response.data;
  },

  getChatHistory: async (chatId: string): Promise<Message[]> => {
    const response = await api.get<Message[]>(`/chat/${chatId}`);
    return response.data;
  },

  sendMessage: async (chatId: string, content: string): Promise<Message> => {
    const response = await api.post<Message>(`/chat/${chatId}/message`, {
      content,
    } as SendMessageRequest);
    return response.data;
  },
};
