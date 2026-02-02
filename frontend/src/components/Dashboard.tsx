import { useState, useEffect } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Sidebar } from './Sidebar';
import { ChatInterface } from './ChatInterface';
import { Sparkles, Menu } from 'lucide-react';
import { useChats } from '../hooks/useChat';
import { useYellow } from '../hooks/useYellow';

interface DashboardProps {
    address: string;
}

export function Dashboard({ address }: DashboardProps) {
    const { isYellowReady, initYellow, balance, approveTokens, depositFunds, isLoading, error } = useYellow();
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [depositAmount, setDepositAmount] = useState<string>("10");
    const [showDepositModal, setShowDepositModal] = useState(false);


    // Step 1: Initialize Yellow Layer (After Wallet Connect)
    const handleInitLayer = async () => {
        await initYellow();
    };

    // Handle deposit flow
    const handleDeposit = async () => {
        try {
            const amount = parseFloat(depositAmount);
            if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid amount");
                return;
            }

            // First approve tokens
            await approveTokens(amount);

            // Then deposit
            await depositFunds(amount);

            setShowDepositModal(false);
            alert(`Successfully deposited ${amount} USDC!`);
        } catch (error: any) {
            alert(`Deposit failed: ${error?.message || "Unknown error"}`);
        }
    };


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
                    <div className="flex items-center gap-3">
                        {!isYellowReady ? (
                            <button
                                onClick={handleInitLayer}
                                disabled={isLoading}
                                className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                {isLoading ? "Initializing..." : "Initialize Yellow"}
                            </button>
                        ) : (
                            <>
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-surface rounded-lg border border-dark-border">
                                    <span className="text-sm text-dark-muted">Balance:</span>
                                    <span className="text-sm font-semibold text-brand-400">{balance} USDC</span>
                                </div>
                                <button
                                    onClick={() => setShowDepositModal(true)}
                                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium transition-colors"
                                >
                                    Deposit
                                </button>
                            </>
                        )}
                        <ConnectButton accountStatus="avatar" chainStatus="icon" />
                    </div>
                </header>

                {/* Deposit Modal */}
                {showDepositModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDepositModal(false)}>
                        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 w-96 max-w-[90vw]" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-bold mb-4">Deposit USDC</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-dark-muted mb-2">Amount (USDC)</label>
                                    <input
                                        type="number"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:border-brand-400"
                                        placeholder="10"
                                        step="0.01"
                                        min="0"
                                    />
                                </div>
                                {error && (
                                    <div className="text-red-400 text-sm">{error}</div>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowDepositModal(false)}
                                        className="flex-1 px-4 py-2 bg-dark-bg hover:bg-dark-border text-dark-text rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleDeposit}
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                                    >
                                        {isLoading ? "Processing..." : "Deposit"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

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
