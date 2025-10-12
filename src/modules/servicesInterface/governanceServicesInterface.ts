import {
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import { GovernanceAccount, UserStakingAccount } from "../types/types";
import {
  getUserStakePda,
  getGovernancePda,
} from "../utils/getPDAs";
import { getProgram } from "../utils/getProgram";
import { 
  MIN_STAKE_DURATION_FOR_VOTING,
} from "../utils/constants";

// === Create Initialize Governance Account Transaction ===
export async function createInitializeGovernanceAccountTransaction(userPublicKey: string) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  const [governanceAccount] = getGovernancePda(program.programId, userPubKey);

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .initializeGovernanceAccount()
      .accounts({
        staker: userPubKey,
        governanceAccount: governanceAccount,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Initialize governance account transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        governanceAccount: governanceAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating initialize governance account transaction:", error);
    return { 
      success: false, 
      message: `Error creating initialize governance account transaction: ${error.message || error}` 
    };
  }
}

// === Create Calculate Voting Power Transaction ===
export async function createCalculateVotingPowerTransaction(userPublicKey: string) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  const [userStakingAccount] = getUserStakePda(program.programId, userPubKey);
  const [governanceAccount] = getGovernancePda(program.programId, userPubKey);

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .calculateVotingPower()
      .accounts({
        staker: userPubKey,
        userStakingAccount: userStakingAccount,
        governanceAccount: governanceAccount,
      })
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Calculate voting power transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        userStakingAccount: userStakingAccount.toString(),
        governanceAccount: governanceAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating calculate voting power transaction:", error);
    return { 
      success: false, 
      message: `Error creating calculate voting power transaction: ${error.message || error}` 
    };
  }
}

export async function getGovernanceAccountInfo(userPublicKey: string) {
  const { program } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);
  const [governanceAccount] = getGovernancePda(program.programId, userPubKey);

  try {
    const govInfo = await program.account.governanceAccount.fetch(governanceAccount) as GovernanceAccount;
    const currentTime = Math.floor(Date.now() / 1000);
    const isLocked = govInfo.stakeLockEnd.toNumber() > currentTime;

    return {
      success: true,
      data: {
        staker: govInfo.staker.toString(),
        participationCount: govInfo.participationCount,
        lastVoteTimestamp: govInfo.lastVoteTimestamp.toNumber(),
        stakeLockEnd: govInfo.stakeLockEnd.toNumber(),
        isCurrentlyLocked: isLocked,
        votingPowerCache: govInfo.votingPowerCache.toNumber(),
        createdAt: govInfo.createdAt.toNumber(),
      }
    };
  } catch (error: any) {
    console.error("Error fetching governance account info:", error);
    return { success: false, error: 'Governance account not initialized' };
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
export async function checkVotingEligibility(userPublicKey: string) {
  const { program } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);
  const [userStakingAccount] = getUserStakePda(program.programId, userPubKey);

  try {
    const stakingInfo = await program.account.userStakingAccount.fetch(userStakingAccount) as UserStakingAccount;
    const currentTime = Math.floor(Date.now() / 1000);
    const stakeTimestamp = stakingInfo.timestamp.toNumber();
    const stakeDurationSeconds = currentTime - stakeTimestamp;
    const stakeDurationDays = Math.floor(stakeDurationSeconds / (24 * 60 * 60));

    const isEligible = stakeDurationSeconds >= MIN_STAKE_DURATION_FOR_VOTING;
    const stakedAmount = stakingInfo.stakedAmount.toNumber();

    return {
      success: true,
      data: {
        isEligible: isEligible,
        stakedAmount: stakedAmount,
        stakeDurationDays: stakeDurationDays,
        minimumDaysRequired: 30,
        estimatedVotingPower: isEligible ? calculateHybridVotingPower(stakedAmount, stakeDurationDays) : 0,
      }
    };
  } catch (error: any) {
    console.error("Error checking voting eligibility:", error);
    if (error.message && error.message.includes("Account does not exist")) {
      return {
        success: false,
        data: {
          isEligible: false,
          message: "User has not staked any tokens yet",
        }
      };
    }
    return { success: false, error: error.message || 'Failed to check voting eligibility' };
  }
}
