import { useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { api } from '../lib/api';
import { useAuth } from '../lib/AuthContext';

type NonceResponse = { nonce: string };
type VerifyResponse = { idToken: string };

export default function WalletGate() {
  const wallet = useWallet();
  const { idToken, setIdToken, isAuthenticated } = useAuth();
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const address = useMemo(() => {
    if (!wallet.publicKey) return '';
    return wallet.publicKey.toBase58();
  }, [wallet.publicKey]);

  async function handleVerifyAccess() {
    setError(null);
    try {
      if (!wallet.publicKey) throw new Error('Connect a wallet to continue');
      if (!wallet.signMessage) throw new Error('Wallet does not support message signing');
      setIsVerifying(true);

      const { nonce } = await api.post<NonceResponse>('/auth/siwsNonce', {
        address: wallet.publicKey.toBase58(),
      });

      const message = new TextEncoder().encode(`onionxbt: sign-in with Solana\nnonce: ${nonce}`);
      const signature = await wallet.signMessage(message);

      const { idToken } = await api.post<VerifyResponse>('/auth/siwsVerify', {
        address: wallet.publicKey.toBase58(),
        signature: btoa(String.fromCharCode(...signature)),
        nonce,
      });

      setIdToken(idToken);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  }

  const ctaBg = '#C6FF3B';

  return (
    <div className="w-full max-w-md mx-auto p-4 rounded-md bg-neutral-900 border border-neutral-800 text-neutral-100">
      <div className="space-y-3 mb-4">
        <h2 className="text-lg font-semibold">Access Gate</h2>
        <p className="text-sm text-neutral-400">
          Privacy-first. No tracking. Tor-friendly. Your approval keeps memory on. Nothing is stored in your browser beyond this session.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-sm text-neutral-400">Wallet</span>
        <WalletMultiButton style={{ backgroundColor: 'transparent', border: '1px solid #333', color: '#fff' }} />
      </div>

      {address && (
        <div className="text-xs text-neutral-500 mb-3 break-all">{address}</div>
      )}

      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-neutral-400">Verify Access</span>
        <button
          onClick={handleVerifyAccess}
          disabled={!wallet.connected || isVerifying}
          className="px-3 py-2 text-black text-sm font-medium rounded disabled:opacity-50"
          style={{ backgroundColor: ctaBg }}
        >
          {isAuthenticated ? 'Verified' : (isVerifying ? 'Verifying…' : 'Verify Access')}
        </button>
      </div>

      {idToken && (
        <div className="mt-4 p-2 rounded bg-neutral-800 text-xs text-neutral-300">
          Firebase ID token is held in approved memory for this session.
        </div>
      )}

      {error && (
        <div className="mt-3 text-xs text-red-400">{error}</div>
      )}
    </div>
  );
}

