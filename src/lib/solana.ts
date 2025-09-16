export type SolanaCluster = 'mainnet-beta' | 'devnet' | 'testnet';

export function getCluster(): SolanaCluster {
  const cluster = (import.meta.env.VITE_SOLANA_CLUSTER as SolanaCluster | undefined) || 'mainnet-beta';
  return cluster;
}

export function getClusterRpcUrl(): string {
  const cluster = getCluster();
  switch (cluster) {
    case 'devnet':
      return 'https://api.devnet.solana.com';
    case 'testnet':
      return 'https://api.testnet.solana.com';
    case 'mainnet-beta':
    default:
      return 'https://api.mainnet-beta.solana.com';
  }
}

