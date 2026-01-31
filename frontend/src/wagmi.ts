import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygonAmoy } from "wagmi/chains";

export const config = getDefaultConfig({
  appName: "Synapse AI",
  projectId: "YOUR_PROJECT_ID", // TODO: User should replace this, or I can use a placeholder
  chains: [polygonAmoy],
  ssr: false,
});
