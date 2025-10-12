import {
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import * as anchor from "@coral-xyz/anchor";

import { GovernanceAccount, UserStakingAccount } from "../types/types";
import {
  getUserStakePda,
  getGovernancePda,
} from "../utils/getPDAs";
import { getProgram } from "../utils/getProgram";
import { getMockWalletKeypair } from "../utils/mockWallets";
import { 
  MIN_STAKE_DURATION_FOR_VOTING
} from "../utils/constants";

// ============================================================================
// GOVERNANCE MODULE
// ============================================================================

// === Initialize Governance Account ===
export async function initializeGovernanceAccount(userKeypair?: Keypair) {
  const { program, adminKeypair } = getProgram();
  const staker = userKeypair || adminKeypair;

  console.log(`Initializing governance account for user: ${staker.publicKey.toString()}`);

  const [governanceAccount] = getGovernancePda(program.programId, staker.publicKey);

  console.log(`Governance Account PDA: ${governanceAccount.toString()}`);

  try {
    // Check if governance account already exists
    try {
      await program.account.governanceAccount.fetch(governanceAccount);
      console.log("Governance account already exists");
      return {
        success: true,
        message: "Governance account already exists",
        governanceAccount: governanceAccount,
        userPublicKey: staker.publicKey,
      };
    } catch (error) {
      // Account doesn't exist, proceed with initialization
    }

    const tx = await program.methods
      .initializeGovernanceAccount()
      .accounts({
        staker: staker.publicKey,
        governanceAccount: governanceAccount,
        systemProgram: SystemProgram.programId,
      })
      .signers([staker])
      .rpc();

    console.log(`Governance account initialized successfully!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      governanceAccount: governanceAccount,
      userPublicKey: staker.publicKey,
    };
  } catch (error) {
    console.error("Error initializing governance account:", error);
    throw error;
  }
}

// === Calculate Voting Power ===
export async function calculateVotingPower(userKeypair?: Keypair) {
  const { program, adminKeypair } = getProgram();
  const staker = userKeypair || adminKeypair;

  console.log(`Calculating voting power for user: ${staker.publicKey.toString()}`);

  const [userStakingAccount] = getUserStakePda(program.programId, staker.publicKey);
  const [governanceAccount] = getGovernancePda(program.programId, staker.publicKey);

  try {
    const tx = await program.methods
      .calculateVotingPower()
      .accounts({
        staker: staker.publicKey,
        userStakingAccount: userStakingAccount,
        governanceAccount: governanceAccount,
      })
      .signers([staker])
      .rpc();

    console.log(`Voting power calculated successfully!`);
    console.log(`Transaction: ${tx}`);

    // Fetch the updated governance account to get the cached voting power
    const govAccount = await program.account.governanceAccount.fetch(governanceAccount) as GovernanceAccount;
    const votingPower = govAccount.votingPowerCache.toNumber();

    console.log(`Cached voting power: ${votingPower}`);

    return {
      success: true,
      transactionId: tx,
      votingPower: votingPower,
      governanceAccount: governanceAccount,
      userPublicKey: staker.publicKey,
    };
  } catch (error) {
    console.error("Error calculating voting power:", error);
    throw error;
  }
}

// === Client-side Voting Power Calculation (for preview) ===
export function calculateHybridVotingPower(stakeAmount: number, stakeDurationDays: number): number {
  // Convert micro-tokens to tokens
  const tokens = stakeAmount / 1_000_000;
  
  let basePower: number;
  if (tokens <= 100_000) {
    basePower = tokens;
  } else {
    basePower = 100_000 + Math.floor(Math.sqrt(tokens - 100_000));
  }

  let timeMultiplier: number;
  if (stakeDurationDays <= 30) {
    timeMultiplier = 100;
  } else if (stakeDurationDays <= 90) {
    timeMultiplier = 120;
  } else if (stakeDurationDays <= 365) {
    timeMultiplier = 150;
  } else {
    timeMultiplier = 200;
  }

  return Math.floor((basePower * timeMultiplier) / 100);
}

// === Check Voting Eligibility ===
export async function checkVotingEligibility(userKeypair?: Keypair) {
  const { program, adminKeypair } = getProgram();
  const staker = userKeypair || adminKeypair;

  console.log(`Checking voting eligibility for user: ${staker.publicKey.toString()}`);

  const [userStakingAccount] = getUserStakePda(program.programId, staker.publicKey);

  try {
    const stakingInfo = await program.account.userStakingAccount.fetch(userStakingAccount) as UserStakingAccount;
    const currentTime = Math.floor(Date.now() / 1000);
    const stakeTimestamp = stakingInfo.timestamp.toNumber();
    const stakeDurationSeconds = currentTime - stakeTimestamp;
    const stakeDurationDays = Math.floor(stakeDurationSeconds / (24 * 60 * 60));

    const isEligible = stakeDurationSeconds >= MIN_STAKE_DURATION_FOR_VOTING;
    const stakedAmount = stakingInfo.stakedAmount.toNumber();

    console.log(`=== Voting Eligibility Check ===`);
    console.log(`Staked Amount: ${stakedAmount}`);
    console.log(`Stake Duration: ${stakeDurationDays} days`);
    console.log(`Minimum Required: 30 days`);
    console.log(`Eligible to Vote: ${isEligible}`);

    if (isEligible) {
      const votingPower = calculateHybridVotingPower(stakedAmount, stakeDurationDays);
      console.log(`Estimated Voting Power: ${votingPower}`);
    }

    return {
      success: true,
      isEligible: isEligible,
      stakedAmount: stakedAmount,
      stakeDurationDays: stakeDurationDays,
      minimumDaysRequired: 30,
      estimatedVotingPower: isEligible ? calculateHybridVotingPower(stakedAmount, stakeDurationDays) : 0,
      userPublicKey: staker.publicKey,
    };
  } catch (error: any) {
    console.error("Error checking voting eligibility:", error);
    if (error.message && error.message.includes("Account does not exist")) {
      return {
        success: false,
        isEligible: false,
        message: "User has not staked any tokens yet",
        userPublicKey: staker.publicKey,
      };
    }
    throw error;
  }
}

// === Get Governance Account Info ===
export async function getGovernanceAccountInfo(userKeypair?: Keypair) {
  const { program, adminKeypair } = getProgram();
  const staker = userKeypair || adminKeypair;
  const [governanceAccount] = getGovernancePda(program.programId, staker.publicKey);

  try {
    const govInfo = await program.account.governanceAccount.fetch(governanceAccount) as GovernanceAccount;
    const currentTime = Math.floor(Date.now() / 1000);
    const isLocked = govInfo.stakeLockEnd.toNumber() > currentTime;

    console.log("=== Governance Account Information ===");
    console.log(`Staker: ${govInfo.staker.toString()}`);
    console.log(`Participation Count: ${govInfo.participationCount}`);
    console.log(`Last Vote: ${govInfo.lastVoteTimestamp.toNumber() > 0 ? new Date(govInfo.lastVoteTimestamp.toNumber() * 1000) : 'Never'}`);
    console.log(`Stake Lock End: ${govInfo.stakeLockEnd.toNumber() > 0 ? new Date(govInfo.stakeLockEnd.toNumber() * 1000) : 'Not locked'}`);
    console.log(`Currently Locked: ${isLocked}`);
    console.log(`Voting Power Cache: ${govInfo.votingPowerCache.toString()}`);
    console.log(`Created At: ${new Date(govInfo.createdAt.toNumber() * 1000)}`);

    return {
      success: true,
      governanceInfo: {
        staker: govInfo.staker,
        participationCount: govInfo.participationCount,
        lastVoteTimestamp: govInfo.lastVoteTimestamp.toNumber(),
        stakeLockEnd: govInfo.stakeLockEnd.toNumber(),
        isCurrentlyLocked: isLocked,
        votingPowerCache: govInfo.votingPowerCache.toNumber(),
        createdAt: govInfo.createdAt.toNumber(),
      },
      governanceAccount: governanceAccount,
      userPublicKey: staker.publicKey,
    };
  } catch (error: any) {
    console.error("Error fetching governance account info:", error);
    if (error.message && error.message.includes("Account does not exist")) {
      console.log("Governance account doesn't exist for this user");
      return {
        success: false,
        message: "Governance account not initialized",
        userPublicKey: staker.publicKey,
      };
    }
    throw error;
  }
}

// === Get Complete User Governance Data ===
export async function getCompleteUserGovernanceData(userKeypair?: Keypair) {
  const { adminKeypair } = getProgram();
  const staker = userKeypair || adminKeypair;

  console.log(`Fetching complete governance data for user: ${staker.publicKey.toString()}`);

  try {
    const eligibility = await checkVotingEligibility(staker);
    let governanceInfo = null;
    
    try {
      const govResult = await getGovernanceAccountInfo(staker);
      if (govResult.success) {
        governanceInfo = govResult.governanceInfo;
      }
    } catch (error) {
      // Governance account doesn't exist
    }

    return {
      success: true,
      userPublicKey: staker.publicKey,
      eligibility: eligibility,
      governanceAccount: governanceInfo,
      summary: {
        canVote: eligibility.isEligible,
        hasGovernanceAccount: governanceInfo !== null,
        isTokensLocked: governanceInfo ? governanceInfo.isCurrentlyLocked : false,
        votingPower: eligibility.estimatedVotingPower || 0,
        participationCount: governanceInfo ? governanceInfo.participationCount : 0,
      }
    };
  } catch (error) {
    console.error("Error fetching complete governance data:", error);
    throw error;
  }
}

// === Bulk Operations ===
export async function bulkInitGovernanceAccounts(walletNumbers?: number[]) {
  const targetWallets = walletNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = [];

  console.log(`Bulk initializing governance accounts for wallets: ${targetWallets.join(', ')}`);

  for (const walletNum of targetWallets) {
    try {
      const wallet = getMockWalletKeypair(walletNum);
      const result = await initializeGovernanceAccount(wallet);
      results.push({
        walletNumber: walletNum,
        success: true,
        transactionId: result.transactionId,
        message: result.message || 'Governance account initialized',
      });
    } catch (error: any) {
      results.push({
        walletNumber: walletNum,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    success: true,
    operation: 'bulk_init_governance',
    results: results,
  };
}

// === Helper: Calculate Voting Power Calculations ===
export async function bulkCalculateVotingPower(walletNumbers?: number[]) {
  const targetWallets = walletNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = [];

  console.log(`Bulk calculating voting power for wallets: ${targetWallets.join(', ')}`);

  for (const walletNum of targetWallets) {
    try {
      const wallet = getMockWalletKeypair(walletNum);
      const result = await calculateVotingPower(wallet);
      results.push({
        walletNumber: walletNum,
        success: true,
        transactionId: result.transactionId,
        votingPower: result.votingPower,
      });
    } catch (error: any) {
      results.push({
        walletNumber: walletNum,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    success: true,
    operation: 'bulk_calculate_voting_power',
    results: results,
  };
}
