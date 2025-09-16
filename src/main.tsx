
  import { createRoot } from "react-dom/client";
  import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
  import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
  import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
  import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
  import App from "./app/App";
  import "./index.css";
  import "./styles/tokens.css";
  import "@solana/wallet-adapter-react-ui/styles.css";
  import { getClusterRpcUrl } from "./lib/solana";
  import { AuthProvider } from "./lib/AuthContext";

  const endpoint = getClusterRpcUrl();
  const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

  createRoot(document.getElementById("root")!).render(
    <AuthProvider>
      <ConnectionProvider endpoint={endpoint}>
        <WalletProvider wallets={wallets} autoConnect={false}>
          <WalletModalProvider>
            <App />
          </WalletModalProvider>
        </WalletProvider>
      </ConnectionProvider>
    </AuthProvider>
  );
  