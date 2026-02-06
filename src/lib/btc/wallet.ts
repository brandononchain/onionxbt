/**
 * OnionXBT Bitcoin Wallet Management
 * HD Wallet for receiving payments (on-chain + Lightning)
 */

import * as bitcoin from 'bitcoinjs-lib'
import * as bip39 from 'bip39'
import BIP32Factory from 'bip32'
import * as ecc from 'tiny-secp256k1'

const bip32 = BIP32Factory(ecc)

export interface WalletConfig {
  network: 'mainnet' | 'testnet'
  mnemonic?: string
  xpub?: string
}

export interface DerivedAddress {
  address: string
  path: string
  index: number
}

export class OnionWallet {
  private network: bitcoin.Network
  private root: ReturnType<typeof bip32.fromSeed> | null = null
  private xpub: string | null = null
  private addressIndex: number = 0

  constructor(config: WalletConfig) {
    this.network = config.network === 'mainnet' 
      ? bitcoin.networks.bitcoin 
      : bitcoin.networks.testnet

    if (config.mnemonic) {
      this.initFromMnemonic(config.mnemonic)
    } else if (config.xpub) {
      this.xpub = config.xpub
    }
  }

  /**
   * Generate a new wallet with mnemonic
   */
  static generateWallet(network: 'mainnet' | 'testnet' = 'mainnet'): {
    mnemonic: string
    wallet: OnionWallet
  } {
    const mnemonic = bip39.generateMnemonic(256) // 24 words
    const wallet = new OnionWallet({ network, mnemonic })
    return { mnemonic, wallet }
  }

  private initFromMnemonic(mnemonic: string) {
    const seed = bip39.mnemonicToSeedSync(mnemonic)
    this.root = bip32.fromSeed(seed, this.network)
    
    // BIP84 path for native segwit: m/84'/0'/0'
    const coinType = this.network === bitcoin.networks.bitcoin ? 0 : 1
    const accountPath = `m/84'/${coinType}'/0'`
    const account = this.root.derivePath(accountPath)
    this.xpub = account.neutered().toBase58()
  }

  /**
   * Generate a new receiving address for a user
   */
  deriveAddress(index?: number): DerivedAddress {
    const idx = index ?? this.addressIndex++
    
    // External chain (receiving): m/84'/0'/0'/0/index
    const path = `m/84'/0'/0'/0/${idx}`
    
    if (this.root) {
      const child = this.root.derivePath(path)
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: child.publicKey,
        network: this.network,
      })
      
      return {
        address: address!,
        path,
        index: idx,
      }
    }
    
    throw new Error('Wallet not initialized')
  }

  /**
   * Get the xpub for watch-only operations
   */
  getXpub(): string | null {
    return this.xpub
  }

  /**
   * Validate a Bitcoin address
   */
  static validateAddress(address: string, network: 'mainnet' | 'testnet' = 'mainnet'): boolean {
    try {
      const net = network === 'mainnet' 
        ? bitcoin.networks.bitcoin 
        : bitcoin.networks.testnet
      bitcoin.address.toOutputScript(address, net)
      return true
    } catch {
      return false
    }
  }
}

/**
 * Payment tracking for users
 */
export interface UserPayment {
  id: string
  userId: string
  type: 'onchain' | 'lightning'
  address?: string  // BTC address for onchain
  invoice?: string  // BOLT11 invoice for lightning
  amount: number    // satoshis
  status: 'pending' | 'confirmed' | 'expired'
  createdAt: Date
  confirmedAt?: Date
  txid?: string
}

export interface UserBalance {
  userId: string
  balance: number  // satoshis
  totalDeposited: number
  totalSpent: number
  lastUpdated: Date
}
