import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { mainnet, polygon, optimism, arbitrum, base } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Synapse AI",
  projectId: "YOUR_PROJECT_ID", // TODO: User should replace this, or I can use a placeholder
  chains: [mainnet, polygon, optimism, arbitrum, base],
  ssr: false, // If using Next.js this matters, but for Vite it's less critical but good to know
});
