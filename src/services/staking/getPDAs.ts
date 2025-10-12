import { PublicKey } from "@solana/web3.js";

// Seeds from smart contract
const STAKING_POOL_SEED = "staking_poolV3";
const PROGRAM_AUTHORITY_SEED = "program_authorityV1";
const USER_STAKE_SEED = "user_stakeV1";
const ESCROW_SEED = "escrowV1";
const GOVERNANCE_SEED = "governanceV1";
const PROPOSAL_SEED = "proposalV1";
const PROPOSAL_ESCROW_SEED = "proposal_escrowV1";
const VOTE_SEED = "voteV1";
const TREASURY_SEED = "treasuryV1";
const GOVERNANCE_CONFIG_SEED = "governance_configV1";

// Helper functions for PDA derivation
export function getStakingPoolPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(STAKING_POOL_SEED)],
    programId
  );
}

export function getProgramAuthorityPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PROGRAM_AUTHORITY_SEED)],
    programId
  );
}

export function getUserStakePda(programId: PublicKey, userPublicKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(USER_STAKE_SEED), userPublicKey.toBuffer()],
    programId
  );
}

export function getEscrowTokenAccountPda(programId: PublicKey, stakingPool: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(ESCROW_SEED), stakingPool.toBuffer()],
    programId
  );
}

export function getGovernancePda(programId: PublicKey, userPublicKey: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(GOVERNANCE_SEED), userPublicKey.toBuffer()],
    programId
  );
}

export function getGovernanceConfigPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(GOVERNANCE_CONFIG_SEED)],
    programId
  );
} 

export function getProposalPda(programId: PublicKey, proposalId: number): [PublicKey, number] {
  const proposalIdBuffer = Buffer.alloc(8);
  proposalIdBuffer.writeBigUInt64LE(BigInt(proposalId));
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PROPOSAL_SEED), proposalIdBuffer],
    programId
  );
}

export function getProposalEscrowPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PROPOSAL_ESCROW_SEED)],
    programId
  );
}

export function getTreasuryPda(programId: PublicKey, stakingPool: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(TREASURY_SEED), stakingPool.toBuffer()],
    programId
  );
}

export function getVoteRecordPda(
  programId: PublicKey, 
  proposalId: number, 
  voterPublicKey: PublicKey
): [PublicKey, number] {
  const proposalIdBuffer = Buffer.alloc(8);
  proposalIdBuffer.writeBigUInt64LE(BigInt(proposalId));
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from(VOTE_SEED), proposalIdBuffer, voterPublicKey.toBuffer()],
    programId
  );
}

// Export all seeds for reference
export const SEEDS = {
  STAKING_POOL_SEED,
  PROGRAM_AUTHORITY_SEED,
  USER_STAKE_SEED,
  ESCROW_SEED,
  GOVERNANCE_SEED,
  PROPOSAL_SEED,
  PROPOSAL_ESCROW_SEED,
  VOTE_SEED,
  TREASURY_SEED,
  GOVERNANCE_CONFIG_SEED,
} as const;
