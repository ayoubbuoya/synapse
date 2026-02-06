import { Plus, MessageSquare, Loader2 } from 'lucide-react';
import { EnsProfile } from './EnsProfile';
import { useChats, useCreateChat } from '../hooks/useChat';
import { cn } from '../lib/utils';

interface SidebarProps {
    walletAddress: string;
    selectedChatId: string | null;
    onSelectChat: (id: string) => void;
}

export function Sidebar({ walletAddress, selectedChatId, onSelectChat }: SidebarProps) {
    const { data: chats, isLoading } = useChats(walletAddress);
    const createChat = useCreateChat();

    const handleNewChat = () => {
        createChat.mutate({ wallet_address: walletAddress, title: "New Chat" }, {
            onSuccess: (data) => {
                onSelectChat(data.id);
            }
        });
    };

    return (
        <div className="w-80 h-full border-r border-dark-border bg-dark-bg/50 backdrop-blur-md flex flex-col">
            <div className="p-4">
                <button
                    onClick={handleNewChat}
                    disabled={createChat.isPending}
                    className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-500 text-white p-3 rounded-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {createChat.isPending ? <Loader2 className="animate-spin w-5 h-5" /> : <Plus className="w-5 h-5" />}
                    New Chat
                </button>
            </div>

            <div className="flex-1 overflow-y-auto px-2 space-y-1">
                {isLoading ? (
                    <div className="flex justify-center p-4">
                        <Loader2 className="animate-spin w-6 h-6 text-brand-500" />
                    </div>
                ) : chats?.length === 0 ? (
                    <div className="text-center text-dark-muted p-4 text-sm">
                        No chats yet. Start a new conversation!
                    </div>
                ) : (
                    chats?.map((chat) => (
                        <button
                            key={chat.id}
                            onClick={() => onSelectChat(chat.id)}
                            className={cn(
                                "w-full text-left p-3 rounded-lg transition-colors flex items-center gap-3",
                                selectedChatId === chat.id
                                    ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                                    : "text-dark-muted hover:bg-dark-surface hover:text-dark-text"
                            )}
                        >
                            <MessageSquare className="w-5 h-5 shrink-0" />
                            <div className="truncate font-medium">
                                {chat.title || "Untitled Chat"}
                            </div>
                        </button>
                    ))
                )}
            </div>

            <div className="p-4 border-t border-dark-border">
                {/* User profile or settings could go here */}
                <div className="text-xs text-dark-muted text-center mb-2">
                    <EnsProfile address={walletAddress} className="justify-center" />
                </div>
                <div className="text-xs text-dark-muted text-center">
                    synapse v0.1.0
                </div>
            </div>
        </div>
    );
}
