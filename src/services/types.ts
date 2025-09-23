// types.ts - TypeScript interfaces for your Anchor program

import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

// === Program Account Interfaces ===

export interface StakingPool {
  authority: PublicKey;
  authorityBump: number;
  initializer: PublicKey;
  totalStakedAmount: BN;
  mintAddress: PublicKey;
  escrowAccount: PublicKey;
  bump: number;
  createdAt: BN;
  isActive: boolean;
  tokenPriceUsdMicro: BN;
  priceLastUpdated: BN;
}

export interface UserStakingAccount {
  staker: PublicKey;
  stakedAmount: BN;
  timestamp: BN;
  lastUpdated: BN;
  bump: number;
}

// === Function Return Types ===

export interface InitializePoolResult {
  success: true;
  transactionId: string;
  adminPublicKey: PublicKey;
  stakingPool: PublicKey;
  programAuthority: PublicKey;
  escrowTokenAccount: PublicKey;
  tokenMint: string;
  tokenMintAddress: PublicKey;
}

export interface InitializePoolError {
  error: string;
  stakingPool: PublicKey;
  programAuthority: PublicKey;
}

export interface StakeResult {
  transactionId: string;
  userStakingAccount: PublicKey;
  amount: number;
}

export interface UnstakeResult {
  transactionId: string;
  amount: number;
}

// === Error Handling Types ===

export interface AnchorError {
  error?: {
    errorCode?: {
      code: string | number;
      name: string;
    };
    errorMessage?: string;
  };
  logs?: string[];
  message?: string;
  name?: string;
}

// === Utility Types ===

export interface ProgramAccounts {
  program: any; // Anchor Program type
  adminPublicKey: PublicKey;
  adminKeypair: any; // Keypair type
  connection: any; // Connection type
}

export interface AccountInfo {
  name: string;
  pubkey: PublicKey;
  exists?: boolean;
  owner?: PublicKey;
  lamports?: number;
  dataLength?: number;
}