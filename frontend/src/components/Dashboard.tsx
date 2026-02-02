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
    const {
        isYellowReady,
        initYellow,
        balance,
        approveTokens,
        depositFunds,
        createChannelWithSession,
        closeChannelAndSession,
        activeChannel,
        isClearNodeReady,
        isLoading,
        error
    } = useYellow();
    const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [sessionAmount, setSessionAmount] = useState<string>("10");
    const [showSessionModal, setShowSessionModal] = useState(false);


    // Step 1: Initialize Yellow Layer (After Wallet Connect)
    const handleInitLayer = async () => {
        await initYellow();
    };

    // Start a new session (create channel)
    const handleStartSession = async () => {
        try {
            const amount = parseFloat(sessionAmount);
            if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid amount");
                return;
            }

            // First approve tokens
            await approveTokens(amount);

            // Then deposit
            await depositFunds(amount);

            // Create channel and session
            await createChannelWithSession(amount);

            setShowSessionModal(false);
            alert(`Session started with ${amount} USDC!`);
        } catch (error: any) {
            alert(`Failed to start session: ${error?.message || "Unknown error"}`);
        }
    };

    // End the current session (close channel)
    const handleEndSession = async () => {
        if (!confirm("Are you sure you want to end this session? The channel will be closed and settled on-chain.")) {
            return;
        }

        try {
            await closeChannelAndSession();
            alert("Session ended successfully!");
        } catch (error: any) {
            alert(`Failed to end session: ${error?.message || "Unknown error"}`);
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
                                {/* ClearNode Status */}
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${isClearNodeReady ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                    <div className={`w-2 h-2 rounded-full ${isClearNodeReady ? 'bg-green-400' : 'bg-yellow-400'} animate-pulse`}></div>
                                    <span>{isClearNodeReady ? 'ClearNode' : 'Connecting...'}</span>
                                </div>

                                {/* Balance Display */}
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-dark-surface rounded-lg border border-dark-border">
                                    <span className="text-sm text-dark-muted">Balance:</span>
                                    <span className="text-sm font-semibold text-brand-400">{balance} USDC</span>
                                </div>

                                {/* Session Status & Controls */}
                                {activeChannel ? (
                                    <>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg">
                                            <span className="text-sm text-purple-300">Session:</span>
                                            <span className="text-sm font-semibold text-purple-400">{activeChannel.currentBalance} USDC</span>
                                            <span className="text-xs text-purple-400/60">v{activeChannel.stateVersion}</span>
                                        </div>
                                        <button
                                            onClick={handleEndSession}
                                            disabled={isLoading}
                                            className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                                        >
                                            End Session
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setShowSessionModal(true)}
                                        disabled={isLoading || !isClearNodeReady}
                                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Start Session
                                    </button>
                                )}
                            </>
                        )}
                        <ConnectButton accountStatus="avatar" chainStatus="icon" />
                    </div>
                </header>

                {/* Session Modal */}
                {showSessionModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowSessionModal(false)}>
                        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 w-96 max-w-[90vw]" onClick={e => e.stopPropagation()}>
                            <h2 className="text-xl font-bold mb-2">Start Chat Session</h2>
                            <p className="text-sm text-dark-muted mb-4">
                                Create a state channel for instant, gasless AI chat payments
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm text-dark-muted mb-2">Session Amount (USDC)</label>
                                    <input
                                        type="number"
                                        value={sessionAmount}
                                        onChange={(e) => setSessionAmount(e.target.value)}
                                        className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg focus:outline-none focus:border-brand-400"
                                        placeholder="10"
                                        step="0.01"
                                        min="0"
                                    />
                                    <p className="text-xs text-dark-muted mt-1">
                                        This creates a channel. You'll pay gas only twice: open & close.
                                    </p>
                                </div>
                                {error && (
                                    <div className="text-red-400 text-sm">{error}</div>
                                )}
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowSessionModal(false)}
                                        className="flex-1 px-4 py-2 bg-dark-bg hover:bg-dark-border text-dark-text rounded-lg transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleStartSession}
                                        disabled={isLoading}
                                        className="flex-1 px-4 py-2 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                                    >
                                        {isLoading ? "Creating..." : "Start Session"}
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
