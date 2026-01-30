import { ConnectButton } from '@rainbow-me/rainbowkit';
import { motion } from 'framer-motion';

export function Landing() {
    return (
        <div className="min-h-screen bg-dark-bg flex flex-col items-center justify-center relative overflow-hidden">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[100px]" />
            </div>

            <div className="z-10 text-center space-y-8 p-4">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                >
                    <h1 className="text-6xl md:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-purple-400 tracking-tight">
                        Synapse
                    </h1>
                    <p className="mt-4 text-xl text-dark-muted max-w-lg mx-auto">
                        Your decentralized gateway to advanced AI intelligence.
                        Secure, private, and always available.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4, duration: 0.5 }}
                    className="flex justify-center"
                >
                    <div className="p-1 bg-gradient-to-r from-brand-500 to-purple-500 rounded-xl">
                        <div className="bg-dark-bg p-2 rounded-[10px]">
                            <ConnectButton />
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
