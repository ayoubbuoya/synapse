import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatService } from "../lib/api";

export function useChats(walletAddress: string | undefined) {
  return useQuery({
    queryKey: ["chats", walletAddress],
    queryFn: () =>
      walletAddress ? ChatService.getChats(walletAddress) : Promise.resolve([]),
    enabled: !!walletAddress,
  });
}

export function useChat(chatId: string | null) {
  return useQuery({
    queryKey: ["chat", chatId],
    queryFn: () =>
      chatId ? ChatService.getChatHistory(chatId) : Promise.resolve([]),
    enabled: !!chatId,
    refetchInterval: 5000, // Poll for updates occasionally
  });
}

export function useCreateChat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ChatService.createChat,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chats", variables.wallet_address],
      });
    },
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ chatId, content }: { chatId: string; content: string }) =>
      ChatService.sendMessage(chatId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat", variables.chatId] });
    },
  });
}
