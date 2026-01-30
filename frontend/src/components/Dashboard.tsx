import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';
import { Sparkles, Menu } from 'lucide-react';
import { useChats } from '../hooks/useChat';

interface DashboardProps {
    address: string;
}

export function Dashboard({ address }: DashboardProps) {
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    // Auto-select first chat if none selected (optional, but good UX)
    const { data: chats } = useChats(address);
    useEffect(() => {
        if (!selectedChatId && chats && chats.length > 0) {
            setSelectedChatId(chats[0].id);
        }
    }, [chats, selectedChatId]);

    return (
        <div className="h-screen w-full flex bg-dark-bg text-dark-text overflow-hidden">
            {/* Mobile Menu Overlay */}
            {mobileMenuOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 md:hidden" onClick={() => setMobileMenuOpen(false)}>
                    <div className="h-full w-80 bg-dark-bg border-r border-dark-border" onClick={e => e.stopPropagation()}>
                        <Sidebar
                            walletAddress={address}
                            selectedChatId={selectedChatId}
                            onSelectChat={(id) => {
                                setSelectedChatId(id);
                                setMobileMenuOpen(false);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Sidebar (Desktop) */}
            <div className="hidden md:block h-full">
                <Sidebar
                    walletAddress={address}
                    selectedChatId={selectedChatId}
                    onSelectChat={setSelectedChatId}
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col h-full relative">
                {/* Header */}
                <header className="h-16 border-b border-dark-border flex items-center justify-between px-4 bg-dark-bg/50 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-2">
                        <button className="md:hidden p-2 -ml-2 hover:bg-dark-surface rounded-lg" onClick={() => setMobileMenuOpen(true)}>
                            <Menu className="w-5 h-5" />
                        </button>
                        <span className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-purple-400">
                            Synapse
                        </span>
                    </div>
                    <ConnectButton accountStatus="avatar" chainStatus="icon" />
                </header>

                <main className="flex-1 overflow-hidden relative">
                    {selectedChatId ? (
                        <ChatInterface chatId={selectedChatId} key={selectedChatId} />
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-6">
                            <div className="p-6 bg-dark-surface rounded-full shadow-2xl shadow-brand-900/20">
                                <Sparkles className="w-12 h-12 text-brand-400" />
                            </div>
                            <div className="space-y-2">
                                <h2 className="text-2xl font-bold">Welcome to Synapse</h2>
                                <p className="text-dark-muted max-w-md mx-auto">
                                    Select a chat from the sidebar or start a new conversation to begin your journey with decentralized AI.
                                </p>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
