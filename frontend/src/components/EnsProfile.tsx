import { useEnsName, useEnsAvatar } from "wagmi";
import { mainnet } from "wagmi/chains";
import { User } from "lucide-react";
import { cn } from "../lib/utils";

interface EnsProfileProps {
    address: string;
    showAvatar?: boolean;
    showName?: boolean;
    className?: string;
    avatarClassName?: string;
    nameClassName?: string;
}

export function EnsProfile({
    address,
    showAvatar = true,
    showName = true,
    className,
    avatarClassName,
    nameClassName,
}: EnsProfileProps) {
    const { data: ensName } = useEnsName({
        address: address as `0x${string}`,
        chainId: mainnet.id,
    });

    const { data: ensAvatar } = useEnsAvatar({
        name: ensName!,
        chainId: mainnet.id,
        query: {
            enabled: !!ensName,
        },
    });

    const shortAddress = `${address.slice(0, 6)}...${address.slice(-4)}`;

    return (
        <div className={cn("flex items-center gap-2", className)}>
            {showAvatar && (
                <div
                    className={cn(
                        "w-8 h-8 rounded-full overflow-hidden flex items-center justify-center bg-brand-600 text-white shrink-0",
                        avatarClassName,
                    )}
                >
                    {ensAvatar ? (
                        <img
                            src={ensAvatar}
                            alt={ensName || address}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <User className="w-5 h-5" />
                    )}
                </div>
            )}
            {showName && (
                <span className={cn("font-medium truncate", nameClassName)}>
                    {ensName || shortAddress}
                </span>
            )}
        </div>
    );
}
