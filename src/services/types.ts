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

export enum VoteChoice {
  Yes = 0,
  No = 1,
  Abstain = 2,
}

// Types for governance accounts
export interface GovernanceAccount {
  staker: PublicKey;
  participationCount: number;
  lastVoteTimestamp: BN;
  stakeLockEnd: BN;
  votingPowerCache: BN;
  createdAt: BN;
  bump: number;
}

export interface VoteRecord {
  voter: PublicKey;            // 32 bytes
  proposalId: BN;       // 8 bytes
  voteChoice: VoteChoice;      // 1 byte  
  votingPower: BN;      // 8 bytes
  votedAt: BN;          // 8 bytes
  bump: number;                // 1 byte
}

export interface ProposalInfo {
  proposalId: number;                // u64
  proposer: string;                  // Pubkey as base58 string
  title: string;                     // up to 100 chars
  description: string;               // up to 500 chars
  proposalType: any;                 // ProposalType (enum, type depends on IDL)
  status: any;                       // ProposalStatus (enum, type depends on IDL)
  executionData: number[];           // Vec<u8>
  votingPeriodDays: number;          // u8
  createdAt: number;                 // i64 (unix timestamp)
  votingEndsAt: number;              // i64 (unix timestamp)
  finalizedAt: number;               // i64 (unix timestamp)
  executedAt: number;                // i64 (unix timestamp)
  timelockEnd: number;               // i64 (unix timestamp)
  yesVotes: number;                  // u64
  noVotes: number;                   // u64
  abstainVotes: number;              // u64
  totalVoters: number;               // u32
  depositAmount: number;             // u64 (in smallest unit, e.g. 1_000_000 = 1 ZSNIPE)
  depositRefunded: boolean;          // bool
  bump: number;                      // u8
  reserved: number[];                // [u8; 32]
  proposalAccount: string;           // PDA address as base58 string
}

export interface GovernanceConfig {
  authority: PublicKey;
  quorumPercentage: BN;
  passingThreshold: BN;
  timelockDuration: BN;
  minStakeToPropose: BN;
  proposalDeposit: BN;
  createdAt: BN;
  lastUpdated: BN;
  bump: number;
  reserved: number[];
}