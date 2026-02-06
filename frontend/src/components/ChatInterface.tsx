import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useChat, useSendMessage } from '../hooks/useChat';
import { MessageBubble } from './MessageBubble';
import type { Message } from '../types';

interface ChatInterfaceProps {
    chatId: string;
    activeChannel?: any;
    updateChannelState?: (cost: number) => Promise<any>;
    userAddress?: string;
}

export function ChatInterface({ chatId, activeChannel, updateChannelState, userAddress }: ChatInterfaceProps) {
    const { data: history, isLoading } = useChat(chatId);
    const sendMessage = useSendMessage(activeChannel, updateChannelState);
    const [input, setInput] = useState('');
    const bottomRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [history, sendMessage.isPending]);

    const handleSend = () => {
        if (!input.trim() || sendMessage.isPending) return;

        sendMessage.mutate({ chatId, content: input });
        setInput('');
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Combine history with optimistic updates
    const displayMessages: Message[] = [...(history || [])];

    if (sendMessage.isPending && sendMessage.variables) {
        displayMessages.push({
            id: 'optimistic-user',
            role: 'user',
            content: sendMessage.variables.content,
            created_at: new Date().toISOString(),
        });
    }

    return (
        <div className="flex-1 flex flex-col h-full bg-dark-bg/95 relative">
            {/* Header/Title placeholder if needed */}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
                {isLoading && !history ? (
                    <div className="flex items-center justify-center h-full text-dark-muted">
                        Loading history...
                    </div>
                ) : displayMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
                        <div className="bg-dark-surface p-4 rounded-full">
                            <Sparkles className="w-8 h-8 text-brand-400" />
                        </div>
                        <p className="text-xl font-medium">Start a conversation with Synapse</p>
                    </div>
                ) : (
                    <>
                        {displayMessages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} userAddress={userAddress} />
                        ))}

                        {sendMessage.isPending && (
                            <div className="flex w-full gap-4 max-w-4xl mx-auto p-4 animate-fade-in flex-row">
                                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg animate-pulse">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <div className="bg-dark-surface border border-dark-border p-4 rounded-2xl rounded-tl-sm text-dark-muted text-sm flex items-center gap-2">
                                    <span className="flex gap-1">
                                        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce"></span>
                                    </span>
                                    Thinking...
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div ref={bottomRef} className="h-1" />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-dark-bg/80 backdrop-blur-lg border-t border-dark-border">
                <div className="max-w-4xl mx-auto relative flex gap-2">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..."
                        className="flex-1 bg-dark-surface border border-dark-border rounded-xl p-4 pr-12 text-dark-text placeholder:text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none h-[60px] max-h-[200px] shadow-inner font-sans scrollbar-hide"
                        rows={1}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || sendMessage.isPending}
                        className="absolute right-3 top-3 p-2 bg-brand-600 hover:bg-brand-500 text-white rounded-lg disabled:opacity-50 disabled:bg-dark-border transition-all"
                    >
                        <Send className="w-4 h-4" />
                    </button>
                </div>
                <div className="text-center text-[10px] text-dark-muted mt-2">
                    Synapse may produce inaccurate information. Verify important results.
                </div>
            </div>
        </div>
    );
}
