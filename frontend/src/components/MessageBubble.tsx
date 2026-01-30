import Markdown from 'react-markdown';
import { User, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Message } from '../types';

interface MessageBubbleProps {
    message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isUser = message.role === 'user';

    return (
        <div
            className={cn(
                "flex w-full gap-4 max-w-4xl mx-auto p-4 animate-fade-in",
                isUser ? "flex-row-reverse" : "flex-row"
            )}
        >
            <div
                className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-lg",
                    isUser ? "bg-brand-600 text-white" : "bg-purple-600 text-white"
                )}
            >
                {isUser ? <User className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>

            <div
                className={cn(
                    "flex-1 rounded-2xl p-4 shadow-sm text-sm md:text-base leading-relaxed overflow-hidden",
                    isUser
                        ? "bg-brand-600 text-white rounded-tr-sm"
                        : "bg-dark-surface text-dark-text border border-dark-border rounded-tl-sm ring-1 ring-white/5"
                )}
            >
                <div className="prose prose-invert prose-p:my-1 prose-pre:bg-dark-bg prose-pre:p-2 prose-pre:rounded-lg max-w-none">
                    <Markdown>
                        {message.content}
                    </Markdown>
                </div>
                <div className={cn("text-[10px] mt-2 opacity-50", isUser ? "text-brand-100" : "text-dark-muted")}>
                    {new Date(message.created_at).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
}
