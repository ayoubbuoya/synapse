import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChatService } from "../lib/api";
import { useYellow } from "./useYellow";

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
  const { updateChannelState, activeChannel } = useYellow();

  return useMutation({
    mutationFn: async ({
      chatId,
      content,
    }: {
      chatId: string;
      content: string;
    }) => {
      const response = await ChatService.sendMessage(chatId, content);

      // If there's an active channel and the AI response has a cost, update the channel state off-chain
      if (activeChannel && response.cost_usdc) {
        try {
          console.log(
            `💫 Updating channel state for ${response.cost_usdc} USDC (off-chain)`,
          );
          await updateChannelState(Number(response.cost_usdc));
          console.log(
            "✅ Channel state updated successfully (instant, no gas!)",
          );
        } catch (error) {
          console.error("Failed to update channel state:", error);
          // Don't fail the whole mutation if state update fails
          // The message was still sent successfully
        }
      }

      return response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["chat", variables.chatId] });
    },
  });
}
