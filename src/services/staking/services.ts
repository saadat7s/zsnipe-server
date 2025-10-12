import {
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction
} from "@solana/web3.js";

import * as anchor from "@coral-xyz/anchor";
import { 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  TOKEN_2022_PROGRAM_ID, 
  createAssociatedTokenAccountInstruction, 
  getAssociatedTokenAddressSync 
} from "@solana/spl-token";

import { StakingPool, UserStakingAccount, GovernanceAccount, VoteRecord, VoteChoice } from "../types";
import {
  getStakingPoolPda,
  getProgramAuthorityPda,
  getUserStakePda,
  getEscrowTokenAccountPda,
  getGovernancePda,
  getGovernanceConfigPda,
  getProposalPda,
  getProposalEscrowPda,
  getTreasuryPda,
  getVoteRecordPda,
} from "./getPDAs";
import { getProgram } from "./getProgram";
import { getMockWalletKeypair, getAllMockWallets } from "./mockWallets";





// // Governance constants
const MIN_STAKE_DURATION_FOR_VOTING = 0 * 86400; // 30 days in seconds
// // Proposal configuration constants
// export const MIN_STAKE_TO_PROPOSE = 10_000_000_000; // 10,000 ZSNIPE tokens (with 6 decimals)
// export const MIN_STAKE_DURATION_TO_PROPOSE = 30 * 24 * 60 * 60; // 30 days in seconds
// export const PROPOSAL_DEPOSIT_AMOUNT = 1_000_000_000; // 1,000 ZSNIPE tokens (with 6 decimals)

// TEMPORARY TEST VALUES - Change back for production!
export const MIN_STAKE_TO_PROPOSE = 100_000_000; // 100 ZSNIPE (was 10,000)
export const MIN_STAKE_DURATION_TO_PROPOSE = 0 * 86400; // 1 day (was 30)
export const PROPOSAL_DEPOSIT_AMOUNT = 100_000_000; // 100 ZSNIPE (was 1,000)


function getProposalTypeEnum(proposalType: number) {
  switch (proposalType) {
    case 0: return { text: {} };
    case 1: return { treasuryTransfer: {} };
    case 2: return { parameterUpdate: {} };
    default: throw new Error(`Invalid proposal type: ${proposalType}`);
  }
}





// === Initialize Staking Pool ===
export async function initializeStakingPool() {
  const { program, adminKeypair } = getProgram();

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(program.programId, stakingPool);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);
  
  
  console.log("Initializing staking pool...");
  console.log(`Staking Pool PDA: ${stakingPool.toString()}`);
  console.log(`Program Authority PDA: ${programAuthority.toString()}`);
  console.log(`Escrow Token Account PDA: ${escrowTokenAccount.toString()}`);
  console.log(`Token Mint: ${tokenMintAddress.toString()}`);
  
  try {
    const tx = await program.methods
      .initializeStakingPool()
      .accounts({
        admin: adminKeypair.publicKey,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        escrowTokenAccount: escrowTokenAccount,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .signers([adminKeypair])
      .rpc();

    console.log(`Staking pool initialized successfully!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      adminPublicKey: adminKeypair.publicKey,
      stakingPool: stakingPool,
      programAuthority: programAuthority,
      escrowTokenAccount: escrowTokenAccount,
      tokenMint: tokenMint,
      tokenMintAddress: tokenMintAddress,
    };
  } catch (error) {
    console.error("Error initializing staking pool:", error);
    throw error;
  }
}

// Add to helpers.ts
export async function initializeTreasury() {
  const { program, adminKeypair } = getProgram();

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [treasuryAccount] = getTreasuryPda(program.programId, stakingPool);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  console.log("Initializing treasury account...");
  console.log(`Treasury PDA: ${treasuryAccount.toString()}`);
  console.log(`Program Authority: ${programAuthority.toString()}`);

  try {
    const tx = await program.methods
      .initializeTreasury()
      .accounts({
        admin: adminKeypair.publicKey,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        treasuryAccount: treasuryAccount,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([adminKeypair])
      .rpc();

    console.log("✅ Treasury initialized successfully!");
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      treasuryAccount: treasuryAccount.toString(),
      programAuthority: programAuthority.toString(),
    };
  } catch (error) {
    console.error("Error initializing treasury:", error);
    throw error;
  }
}

  

// === Stake Tokens ===
export async function stakeTokens(amount: number, userKeypair?: Keypair) {
  const { program, connection, adminKeypair } = getProgram();
  const staker = userKeypair || adminKeypair;
  console.log(`Staking ${amount} tokens for user: ${staker.publicKey.toString()}`);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [userStakingAccount] = getUserStakePda(program.programId, staker.publicKey);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(program.programId, stakingPool);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Get user's token account (associated token account)
  const stakerTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    staker.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  console.log(`User Token Account: ${stakerTokenAccount.toString()}`);
  console.log(`User Staking Account PDA: ${userStakingAccount.toString()}`);
  console.log(`Escrow Token Account: ${escrowTokenAccount.toString()}`);

  // Check if user token account exists, create if needed
  try {
    const accountInfo = await connection.getAccountInfo(stakerTokenAccount);
    if (!accountInfo) {
      console.log("Creating user token account...");
      
      const createAccountIx = createAssociatedTokenAccountInstruction(
        staker.publicKey, // payer
        stakerTokenAccount,    // account to create
        staker.publicKey, // owner
        tokenMintAddress,      // mint
        TOKEN_2022_PROGRAM_ID, // token program
        ASSOCIATED_TOKEN_PROGRAM_ID
      );

      const transaction = new Transaction().add(createAccountIx);
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [staker]
      );

      console.log(`User token account created: ${signature}`);
    }
  } catch (error) {
    console.error("Error ensuring user token account:", error);
    throw error;
  }

  try {

    
    const tx = await program.methods
      .stake(new anchor.BN(amount * Math.pow(10, 6)))
      .accounts({
        staker: staker.publicKey,
        stakingPool: stakingPool,
        userStakingAccount: userStakingAccount,
        programAuthority: programAuthority,
        escrowTokenAccount: escrowTokenAccount,
        stakerTokenAccount: stakerTokenAccount,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([staker])
      .rpc();

    console.log(`Successfully staked ${amount} tokens!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      amount: amount,
      userPublicKey: staker.publicKey,
      userStakingAccount: userStakingAccount,
    };
  } catch (error) {
    console.error("Error staking tokens:", error);
    throw error;
  }
}

// === Unstake Tokens ===
export async function unstakeTokens(amount: number, userKeypair?: Keypair) {
  const { program, adminKeypair } = getProgram();
  const staker = userKeypair || adminKeypair;

  console.log(`Unstaking ${amount} tokens for user: ${staker.publicKey.toString()}`);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [userStakingAccount] = getUserStakePda(program.programId, staker.publicKey);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(program.programId, stakingPool);
  const [governanceAccount] = getGovernancePda(program.programId, staker.publicKey);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Get user's token account (associated token account)
  const stakerTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    staker.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  console.log(`User Token Account: ${stakerTokenAccount.toString()}`);
  console.log(`User Staking Account PDA: ${userStakingAccount.toString()}`);
  console.log(`Escrow Token Account: ${escrowTokenAccount.toString()}`);

  // Check if user has enough staked tokens
  try {
    const userStakingInfo = await program.account.userStakingAccount.fetch(userStakingAccount) as UserStakingAccount;
    const stakedAmount = userStakingInfo.stakedAmount.toNumber();
    
    if (stakedAmount < amount) {
      throw new Error(`Insufficient staked balance. User has ${stakedAmount} staked, trying to unstake ${amount}`);
    }
    
    console.log(`User has ${stakedAmount} tokens staked, unstaking ${amount}`);
  } catch (error: any) {
    if (error.message.includes("Account does not exist")) {
      throw new Error("User has not staked any tokens yet");
    }
    throw error;
  }

  // Check if governance account exists (optional)
  let hasGovernanceAccount = false;
  try {
    await program.account.governanceAccount.fetch(governanceAccount);
    hasGovernanceAccount = true;
  } catch (error) {
    // No governance account, which is fine
  }

  try {
    const accounts: any = {
      staker: staker.publicKey,
      stakingPool: stakingPool,
      userStakingAccount: userStakingAccount,
      programAuthority: programAuthority,
      escrowTokenAccount: escrowTokenAccount,
      stakerTokenAccount: stakerTokenAccount,
      tokenMint: tokenMintAddress,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    };

    // Add governance account if it exists
    if (hasGovernanceAccount) {
      accounts.governanceAccount = governanceAccount;
    }

    const tx = await program.methods
      .unstake(new anchor.BN(amount * Math.pow(10, 6)))
      .accounts(accounts)
      .signers([staker])
      .rpc();

    console.log(`Successfully unstaked ${amount} tokens!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      amount: amount,
      userPublicKey: staker.publicKey,
      userStakingAccount: userStakingAccount,
    };
  } catch (error) {
    console.error("Error unstaking tokens:", error);
    throw error;
  }
}

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

// === Get Staking Pool Info ===
export async function getStakingPoolInfo() {
  const { program } = getProgram();
  const [stakingPool] = getStakingPoolPda(program.programId);

  try {
    const poolInfo = await program.account.stakingPool.fetch(stakingPool) as StakingPool;
    
    console.log("=== Staking Pool Information ===");
    console.log(`Authority: ${poolInfo.authority.toString()}`);
    console.log(`Initializer: ${poolInfo.initializer.toString()}`);
    console.log(`Total Staked Amount: ${poolInfo.totalStakedAmount.toString()}`);
    console.log(`Token Mint: ${poolInfo.mintAddress.toString()}`);
    console.log(`Escrow Account: ${poolInfo.escrowAccount.toString()}`);
    console.log(`Is Active: ${poolInfo.isActive}`);
    console.log(`Token Price (micro-USD): ${poolInfo.tokenPriceUsdMicro.toString()}`);
    console.log(`Created At: ${new Date(poolInfo.createdAt.toNumber() * 1000)}`);
    console.log(`Price Last Updated: ${new Date(poolInfo.priceLastUpdated.toNumber() * 1000)}`);

    return poolInfo;
  } catch (error) {
    console.error("Error fetching staking pool info:", error);
    throw error;
  }
}

// === Get User Staking Info ===
export async function getUserStakingInfo(userKeypair?: Keypair) {
  const { program, adminKeypair } = getProgram();
  const staker = userKeypair || adminKeypair;
  const [userStakingAccount] = getUserStakePda(program.programId, staker.publicKey);

  try {
    const stakingInfo = await program.account.userStakingAccount.fetch(userStakingAccount) as UserStakingAccount;
    
    console.log("=== User Staking Information ===");
    console.log(`Staker: ${stakingInfo.staker.toString()}`);
    console.log(`Staked Amount: ${stakingInfo.stakedAmount.toString()}`);
    console.log(`Staked At: ${new Date(stakingInfo.timestamp.toNumber() * 1000)}`);
    console.log(`Last Updated: ${new Date(stakingInfo.lastUpdated.toNumber() * 1000)}`);

    // Return properly serialized data
    return {
      staker: stakingInfo.staker.toString(),
      stakedAmount: stakingInfo.stakedAmount.toNumber()/1_000_000,
      timestamp: stakingInfo.timestamp.toNumber(),
      lastUpdated: stakingInfo.lastUpdated.toNumber(),
      bump: stakingInfo.bump,
    };
  } catch (error) {
    console.error("Error fetching user staking info:", error);
    console.error("User might not have staked yet or account doesn't exist");
    return null;
  }
}

// === Check Balances ===
export async function checkUserTokenBalance(userKeypair?: Keypair) {
  const { connection, adminKeypair } = getProgram();
  const staker = userKeypair || adminKeypair;
  
  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  const userTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    staker.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  try {
    const accountInfo = await connection.getParsedAccountInfo(userTokenAccount);
    
    if (accountInfo.value) {
      const tokenBalance = (accountInfo.value.data as any).parsed.info.tokenAmount;
      console.log(`User token balance: ${tokenBalance.uiAmount} tokens`);
      console.log(`Raw amount: ${tokenBalance.amount}`);
      return {
        balance: tokenBalance.uiAmount,
        rawBalance: tokenBalance.amount,
        decimals: tokenBalance.decimals
      };
    } else {
      console.log("User token account doesn't exist");
      return null;
    }
  } catch (error) {
    console.error("Error checking user token balance:", error);
    return null;
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

// === Utility Functions for Mock Wallets ===
export async function getAllWalletsStatus() {
  console.log("Fetching status for all mock wallets...");
  const wallets = getAllMockWallets();
  const results = [];

  for (const wallet of wallets) {
    try {
      const balance = await checkUserTokenBalance(wallet.keypair);
      const stakingInfo = await getUserStakingInfo(wallet.keypair);
      const eligibility = await checkVotingEligibility(wallet.keypair);
      let governanceInfo = null;

      try {
        const govResult = await getGovernanceAccountInfo(wallet.keypair);
        if (govResult.success) {
          governanceInfo = govResult.governanceInfo;
        }
      } catch (error) {
        // Governance account doesn't exist
      }

      results.push({
        walletNumber: wallet.walletNumber,
        publicKey: wallet.publicKey.toString(),
        tokenBalance: balance?.balance || 0,
        stakedAmount: stakingInfo?.stakedAmount || 0, // Already a number, no .toNumber()
        canVote: eligibility.isEligible,
        stakeDuration: eligibility.stakeDurationDays || 0,
        votingPower: eligibility.estimatedVotingPower || 0,
        hasGovernanceAccount: governanceInfo !== null,
        isTokensLocked: governanceInfo ? governanceInfo.isCurrentlyLocked : false,
        participationCount: governanceInfo ? governanceInfo.participationCount : 0,
      });
    } catch (error: any) {
      results.push({
        walletNumber: wallet.walletNumber,
        publicKey: wallet.publicKey.toString(),
        error: error.message,
      });
    }
  }

  return {
    success: true,
    totalWallets: wallets.length,
    wallets: results,
  };
}
// === Bulk Operations ===
export async function bulkStakeTokens(amount: number, walletNumbers?: number[]) {
  const targetWallets = walletNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = [];

  console.log(`Bulk staking ${amount} tokens for wallets: ${targetWallets.join(', ')}`);

  for (const walletNum of targetWallets) {
    try {
      const wallet = getMockWalletKeypair(walletNum);
      const result = await stakeTokens(amount, wallet);
      results.push({
        walletNumber: walletNum,
        success: true,
        transactionId: result.transactionId,
        amount: amount,
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
    operation: 'bulk_stake',
    amount: amount,
    results: results,
  };
}

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

// === Initialize Proposal Escrow (One-time setup) ===
export async function initializeProposalEscrow() {
  const { program, adminKeypair } = getProgram();

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposalEscrow] = getProposalEscrowPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  console.log("Initializing proposal escrow account...");
  console.log(`Proposal Escrow PDA: ${proposalEscrow.toString()}`);
  console.log(`Program Authority: ${programAuthority.toString()}`);

  try {
    const tx = await program.methods
      .initializeProposalEscrow()
      .accounts({
        admin: adminKeypair.publicKey,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        proposalEscrow: proposalEscrow,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([adminKeypair])
      .rpc();

    console.log("✅ Proposal escrow initialized successfully!");
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      proposalEscrow: proposalEscrow,
      programAuthority: programAuthority,
    };
  } catch (error) {
    console.error("Error initializing proposal escrow:", error);
    throw error;
  }
}

// === Create Proposal ===
export async function createProposal(
  proposalId: number,
  title: string,
  description: string,
  proposalType: number, // 0=Text, 1=TreasuryTransfer, 2=ParameterUpdate
  executionData: number[], // Array of bytes
  votingPeriod: number, // 0 (short), 1 (medium), or 2 (long)
  userKeypair?: Keypair
) {
  const { program, connection, adminKeypair } = getProgram();
  const proposer = userKeypair || adminKeypair;

  console.log(`Creating proposal #${proposalId} by ${proposer.publicKey.toString()}`);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposerStakingAccount] = getUserStakePda(program.programId, proposer.publicKey);
  const [proposerGovernanceAccount] = getGovernancePda(program.programId, proposer.publicKey);
  const [proposalAccount] = getProposalPda(program.programId, proposalId);
  const [depositEscrowAccount] = getProposalEscrowPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Get proposer's token account
  const proposerTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    proposer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // Validate proposer meets requirements
  try {
    const stakingInfo = await program.account.userStakingAccount.fetch(proposerStakingAccount) as UserStakingAccount;
    const stakedAmount = stakingInfo.stakedAmount.toNumber();
    const stakeDuration = Math.floor(Date.now() / 1000) - stakingInfo.timestamp.toNumber();

    console.log(`Proposer staked amount: ${stakedAmount / 1_000_000} ZSNIPE`);
    console.log(`Stake duration: ${Math.floor(stakeDuration / 86400)} days`);

    if (stakedAmount < MIN_STAKE_TO_PROPOSE) {
      throw new Error(
        `Insufficient stake. Need ${MIN_STAKE_TO_PROPOSE / 1_000_000} ZSNIPE, have ${stakedAmount / 1_000_000}`
      );
    }

    if (stakeDuration < MIN_STAKE_DURATION_TO_PROPOSE) {
      throw new Error(
        `Insufficient stake duration. Need 30 days, have ${Math.floor(stakeDuration / 86400)} days`
      );
    }
  } catch (error: any) {
    if (error.message.includes("Account does not exist")) {
      throw new Error("User must stake tokens before creating proposals");
    }
    throw error;
  }

  // Check governance account exists
  try {
    await program.account.governanceAccount.fetch(proposerGovernanceAccount);
  } catch (error) {
    throw new Error("User must initialize governance account before creating proposals");
  }

  // Validate inputs
  if (title.length > 100) {
    throw new Error("Title too long (max 100 characters)");
  }
  if (description.length > 1000) {
    throw new Error("Description too long (max 1000 characters)");
  }
  if (executionData.length > 500) {
    throw new Error("Execution data too large (max 500 bytes)");
  }
  if (![0, 1, 2].includes(votingPeriod)) {
    throw new Error("Voting period must be 0 (short), 1 (medium), or 2 (long)");
  }

  console.log("All validations passed, creating proposal...");

  try {
    const tx = await program.methods
      .createProposal(
        new anchor.BN(proposalId),
        title,
        description,
        getProposalTypeEnum(proposalType), // ProposalType enum - adjust based on proposalType param
        Buffer.from(executionData),
        votingPeriod
      )
      .accounts({
        proposer: proposer.publicKey,
        proposerStakingAccount: proposerStakingAccount,
        proposerGovernanceAccount: proposerGovernanceAccount,
        proposalAccount: proposalAccount,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        proposerTokenAccount: proposerTokenAccount,
        depositEscrowAccount: depositEscrowAccount,
        depositTokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([proposer])
      .rpc();

    console.log(`✅ Proposal #${proposalId} created successfully!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      proposalId: proposalId,
      proposalAccount: proposalAccount,
      title: title,
      proposer: proposer.publicKey,
    };
  } catch (error) {
    console.error("Error creating proposal:", error);
    throw error;
  }
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

// === Get Proposal Info ===
export async function getProposalInfo(proposalId: number) {
  const { program } = getProgram();
  const [proposalAccount] = getProposalPda(program.programId, proposalId);

  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    
    console.log(`=== Proposal #${proposalId} Information ===`);
    console.log(`Title: ${proposalData.title}`);
    console.log(`Description: ${proposalData.description}`);
    console.log(`Proposer: ${proposalData.proposer.toString()}`);
    console.log(`Status: ${JSON.stringify(proposalData.status)}`);
    console.log(`Type: ${JSON.stringify(proposalData.proposalType)}`);
    console.log(`Created: ${new Date(Number(proposalData.createdAt) * 1000)}`);
    console.log(`Voting Ends: ${new Date(Number(proposalData.votingEndsAt) * 1000)}`);
    console.log(`Voting Period: ${proposalData.votingPeriodDays} days`);
    console.log(`Yes Votes: ${proposalData.yesVotes.toString()}`);
    console.log(`No Votes: ${proposalData.noVotes.toString()}`);
    console.log(`Abstain Votes: ${proposalData.abstainVotes.toString()}`);
    console.log(`Total Voters: ${proposalData.totalVoters}`);
    console.log(`Deposit: ${proposalData.depositAmount / 1_000_000} ZSNIPE`);
    console.log(`Deposit Refunded: ${proposalData.depositRefunded}`);

    return {
      success: true,
      proposalId: proposalData.proposalId,
      title: proposalData.title,
      description: proposalData.description,
      proposer: proposalData.proposer.toString(),
      proposalType: proposalData.proposalType,
      status: proposalData.status,
      votingPeriodDays: proposalData.votingPeriodDays,
      createdAt: Number(proposalData.createdAt),
      votingEndsAt: Number(proposalData.votingEndsAt),
      finalizedAt: Number(proposalData.finalizedAt),
      executedAt: Number(proposalData.executedAt),
      timelockEnd: Number(proposalData.timelockEnd),
      votes: {
        yes: Number(proposalData.yesVotes),
        no: Number(proposalData.noVotes),
        abstain: Number(proposalData.abstainVotes),
      },
      totalVoters: proposalData.totalVoters,
      depositAmount: Number(proposalData.depositAmount) / 1_000_000,
      depositRefunded: proposalData.depositRefunded,
      proposalAccount: proposalAccount.toString(),
      executionData: proposalData.executionData, // Add this line
    };
  } catch (error) {
    console.error(`Error fetching proposal #${proposalId}:`, error);
    throw error;
  }
}

// === List All Proposals (helper function) ===
export async function getAllProposals(maxProposalId: number = 10) {
  const { program } = getProgram();
  const proposals = [];

  console.log(`Fetching proposals 0-${maxProposalId}...`);

  for (let i = 0; i <= maxProposalId; i++) {
    try {
      const [proposalAccount] = getProposalPda(program.programId, i);
      const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
      
      proposals.push({
        proposalId: i,
        title: proposalData.title,
        proposer: proposalData.proposer.toString(),
        status: proposalData.status,
        votingEndsAt: Number(proposalData.votingEndsAt),
        totalVotes: Number(proposalData.yesVotes) + 
                    Number(proposalData.noVotes) + 
                    Number(proposalData.abstainVotes),
      });
    } catch (error) {
      // Proposal doesn't exist, skip
      continue;
    }
  }

  return {
    success: true,
    count: proposals.length,
    proposals,
  };
}

// === Cast Vote ===
export async function castVote(
  proposalId: number,
  voteChoice: VoteChoice,
  userKeypair?: Keypair
) {

  const { program, adminKeypair } = getProgram();
  const voter = userKeypair || adminKeypair;

  console.log(`Casting vote on proposal #${proposalId} by ${voter.publicKey.toString()}`);
  console.log(`Vote choice: ${VoteChoice[voteChoice]}`);

    // Get all required PDAs
    const [userStakingAccount] = getUserStakePda(program.programId, voter.publicKey);
    const [governanceAccount] = getGovernancePda(program.programId, voter.publicKey);
    const [proposalAccount] = getProposalPda(program.programId, proposalId);
    const [voteRecord] = getVoteRecordPda(program.programId, proposalId, voter.publicKey);

      // Pre-flight checks
  try {
    // Check if user has staked
    const stakingInfo = await program.account.userStakingAccount.fetch(userStakingAccount) as UserStakingAccount;
    const stakeDuration = Math.floor(Date.now() / 1000) - stakingInfo.timestamp.toNumber();
    const stakeDurationDays = Math.floor(stakeDuration / 86400);

    console.log(`Stake duration: ${stakeDurationDays} days`);

    if (stakeDuration < 0 * 86400) { // Using test value of 1 day
      throw new Error(`Insufficient stake duration. Need 1 day, have ${stakeDurationDays} days`);
    }
  } catch (error: any) {
    if (error.message.includes("Account does not exist")) {
      throw new Error("User must stake tokens before voting");
    }
    throw error;
  }

    // Check if governance account exists and has voting power
    try {
      const govAccount = await program.account.governanceAccount.fetch(governanceAccount) as GovernanceAccount;
      
      if (govAccount.votingPowerCache.toNumber() === 0) {
        throw new Error("Voting power not calculated. Call calculate_voting_power first");
      }
  
      console.log(`Voting power: ${govAccount.votingPowerCache.toString()}`);
    } catch (error: any) {
      if (error.message.includes("Account does not exist")) {
        throw new Error("Governance account not initialized. Initialize governance account first");
      }
      throw error;
    }

      // Check if proposal exists and is active
  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const status = Object.keys(proposalData.status)[0];
    
    if (status !== 'active') {
      throw new Error(`Proposal is not active. Current status: ${status}`);
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime >= proposalData.votingEndsAt) {
      throw new Error("Voting period has ended");
    }

    console.log(`Proposal status: Active`);
    console.log(`Voting ends at: ${new Date(proposalData.votingEndsAt * 1000)}`);
  } catch (error: any) {
    if (error.message.includes("Account does not exist")) {
      throw new Error(`Proposal #${proposalId} does not exist`);
    }
    throw error;
  }

    // Check if user already voted
    try {
      await program.account.voteRecord.fetch(voteRecord) as VoteRecord;
      throw new Error("You have already voted on this proposal. Vote changes are not allowed.");
    } catch (error: any) {
      if (!error.message.includes("Account does not exist")) {
        // If it's not "account doesn't exist", it means they already voted
        throw error;
      }
      // If account doesn't exist, that's good - user hasn't voted yet
    }

      // Convert VoteChoice enum to the format expected by Anchor
  let voteChoiceAnchor: any;
  switch (voteChoice) {
    case VoteChoice.Yes:
      voteChoiceAnchor = { yes: {} };
      break;
    case VoteChoice.No:
      voteChoiceAnchor = { no: {} };
      break;
    case VoteChoice.Abstain:
      voteChoiceAnchor = { abstain: {} };
      break;
    default:
      throw new Error("Invalid vote choice");
  }

  console.log("All validations passed, casting vote...");

  try {
    const tx = await program.methods
      .castVote(voteChoiceAnchor)
      .accounts({
        voter: voter.publicKey,
        userStakingAccount: userStakingAccount,
        governanceAccount: governanceAccount,
        proposalAccount: proposalAccount,
        voteRecord: voteRecord,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

      console.log(`✅ Vote cast successfully!`);
      console.log(`Transaction: ${tx}`);

         // Fetch updated proposal to show vote counts
    const updatedProposal = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;

    return {
      success: true,
      transactionId: tx,
      proposalId: proposalId,
      voteChoice: VoteChoice[voteChoice],
      voter: voter.publicKey.toString(),
      voteRecord: voteRecord.toString(),
      updatedVotes: {
        yes: updatedProposal.yesVotes.toString(),
        no: updatedProposal.noVotes.toString(),
        abstain: updatedProposal.abstainVotes.toString(),
        totalVoters: updatedProposal.totalVoters
      }
    };
  } catch (error) {
    console.error("Error casting vote:", error);
    throw error;
  }
}

export async function getVoteRecord(
  proposalId: number,
  userKeypair?: Keypair
) {
  const { program, adminKeypair } = getProgram();
  const voter = userKeypair || adminKeypair;

  const [voteRecord] = getVoteRecordPda(program.programId, proposalId, voter.publicKey);

  try {
    const voteData = await program.account.voteRecord.fetch(voteRecord) as VoteRecord;
    
    const voteChoice = Object.keys(voteData.voteChoice)[0];
    
    console.log(`=== Vote Record for Proposal #${proposalId} ===`);
    console.log(`Voter: ${voteData.voter.toString()}`);
    console.log(`Vote Choice: ${voteChoice}`);
    console.log(`Voting Power Used: ${voteData.votingPower.toString()}`);
    console.log(`Voted At: ${new Date(voteData.votedAt.toNumber() * 1000)}`);
    return {
      success: true,
      voteRecord: {
        voter: voteData.voter.toString(),
        proposalId: voteData.proposalId.toString(),
        voteChoice: voteChoice,
        votingPower: voteData.votingPower.toString(),
        votedAt: voteData.votedAt.toNumber(),
        votedAtDate: new Date(voteData.votedAt.toNumber() * 1000).toISOString(),
      },
      voteRecordAddress: voteRecord.toString(),
    };
  } catch (error: any) {
    if (error.message && error.message.includes("Account does not exist")) {
      return {
        success: false,
        message: "User has not voted on this proposal",
        voter: voter.publicKey.toString(),
        proposalId: proposalId,
      };
    }
    console.error("Error fetching vote record:", error);
    throw error;
  }
}

export async function bulkCastVote(
  proposalId: number,
  voteChoice: VoteChoice,
  walletNumbers?: number[]
) {
  const targetWallets = walletNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = [];

  console.log(`Bulk casting ${VoteChoice[voteChoice]} votes on proposal #${proposalId} for wallets: ${targetWallets.join(', ')}`);

  for (const walletNum of targetWallets) {
    try {
      const wallet = getMockWalletKeypair(walletNum);
      const result = await castVote(proposalId, voteChoice, wallet);
      results.push({
        walletNumber: walletNum,
        success: true,
        transactionId: result.transactionId,
        voteChoice: VoteChoice[voteChoice],
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
    operation: 'bulk_cast_vote',
    proposalId: proposalId,
    voteChoice: VoteChoice[voteChoice],
    results: results,
  };
}

// Add this to your helpers.ts file

// === Finalize Proposal ===
export async function finalizeProposal(
  proposalId: number,
  userKeypair?: Keypair
) {
  const { program, adminKeypair } = getProgram();
  const finalizer = userKeypair || adminKeypair;

  console.log(`Finalizing proposal #${proposalId} by ${finalizer.publicKey.toString()}`);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposalAccount] = getProposalPda(program.programId, proposalId);
  const [depositEscrowAccount] = getProposalEscrowPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Pre-flight checks
  try {
    // Check if proposal exists
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const status = Object.keys(proposalData.status)[0];

    // Convert BN to numbers FIRST
    const votingEndsAtNum = typeof proposalData.votingEndsAt === 'number' 
      ? proposalData.votingEndsAt 
      : Number(proposalData.votingEndsAt);

    const finalizedAtNum = typeof proposalData.finalizedAt === 'number'
      ? proposalData.finalizedAt
      : Number(proposalData.finalizedAt);

    console.log(`Proposal status: ${status}`);
    console.log(`Voting ends at: ${new Date(votingEndsAtNum * 1000)}`);

    // Check if proposal is still active
    if (status !== 'active') {
      throw new Error(`Proposal is not active. Current status: ${status}`);
    }

    // Check if voting period has ended
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < votingEndsAtNum) {  // Use converted number
      const timeRemaining = votingEndsAtNum - currentTime;
      const hoursRemaining = Math.floor(timeRemaining / 3600);
      const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
      throw new Error(
        `Voting period has not ended yet. ${hoursRemaining}h ${minutesRemaining}m remaining`
      );
    }

// Check if already finalized
if (finalizedAtNum !== 0) {  // Use converted number
  throw new Error("Proposal has already been finalized");
}

    // Get proposer's token account for potential deposit refund
    const proposerTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      new PublicKey(proposalData.proposer),
      false,
      TOKEN_2022_PROGRAM_ID
    );

    console.log("All validations passed, finalizing proposal...");
    console.log(`Vote counts - Yes: ${proposalData.yesVotes.toString()}, No: ${proposalData.noVotes.toString()}, Abstain: ${proposalData.abstainVotes.toString()}`);

    try {
      const tx = await program.methods
        .finalizeProposal()
        .accounts({
          finalizer: finalizer.publicKey,
          proposalAccount: proposalAccount,
          stakingPool: stakingPool,
          programAuthority: programAuthority,
          depositEscrowAccount: depositEscrowAccount,
          proposerTokenAccount: proposerTokenAccount,
          tokenMint: tokenMintAddress,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([finalizer])
        .rpc();

      console.log(`✅ Proposal #${proposalId} finalized successfully!`);
      console.log(`Transaction: ${tx}`);

// Fetch updated proposal to show final results
    const updatedProposal = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const finalStatus = Object.keys(updatedProposal.status)[0];

    // Convert BN to numbers
    const finalizedAtNum = typeof updatedProposal.finalizedAt === 'number'
      ? updatedProposal.finalizedAt
      : Number(updatedProposal.finalizedAt);

    const timelockEndNum = typeof updatedProposal.timelockEnd === 'number'
      ? updatedProposal.timelockEnd
      : Number(updatedProposal.timelockEnd);

    console.log(`Final status: ${finalStatus}`);
    console.log(`Finalized at: ${new Date(finalizedAtNum * 1000)}`);

    if (finalStatus === 'passed') {
      console.log(`Timelock ends at: ${new Date(timelockEndNum * 1000)}`);
    }

    if (updatedProposal.depositRefunded) {
      console.log(`Deposit refunded: ${updatedProposal.depositAmount / 1_000_000} ZSNIPE`);
    }

    return {
      success: true,
      transactionId: tx,
      proposalId: proposalId,
      finalStatus: finalStatus,
      finalizedAt: finalizedAtNum,  // Use converted number
      timelockEnd: timelockEndNum !== 0 ? timelockEndNum : null,  // Use converted number
      depositRefunded: updatedProposal.depositRefunded,
      votes: {
        yes: updatedProposal.yesVotes.toString(),
        no: updatedProposal.noVotes.toString(),
        abstain: updatedProposal.abstainVotes.toString(),
        totalVoters: updatedProposal.totalVoters,
      },
    };
    } catch (error) {
      console.error("Error finalizing proposal:", error);
      throw error;
    }
  } catch (error: any) {
    if (error.message && error.message.includes("Account does not exist")) {
      throw new Error(`Proposal #${proposalId} does not exist`);
    }
    throw error;
  }
}

// === Get Proposal Finalization Status (helper) ===
export async function getProposalFinalizationStatus(proposalId: number) {
  const { program } = getProgram();
  const [proposalAccount] = getProposalPda(program.programId, proposalId);

  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const currentTime = Math.floor(Date.now() / 1000);
    const status = Object.keys(proposalData.status)[0];

    // CRITICAL FIX: Convert BN to number
    const votingEndsAtNum = typeof proposalData.votingEndsAt === 'number' 
      ? proposalData.votingEndsAt 
      : Number(proposalData.votingEndsAt);
    
    const finalizedAtNum = typeof proposalData.finalizedAt === 'number'
      ? proposalData.finalizedAt
      : Number(proposalData.finalizedAt);

    const canFinalize = 
      status === 'active' && 
      currentTime >= votingEndsAtNum &&
      finalizedAtNum === 0;

    const timeUntilVotingEnds = votingEndsAtNum - currentTime;
    const isVotingEnded = timeUntilVotingEnds <= 0;

    console.log(`=== Finalization Status for Proposal #${proposalId} ===`);
    console.log(`Current Status: ${status}`);
    console.log(`Voting Ended: ${isVotingEnded}`);
    console.log(`Already Finalized: ${finalizedAtNum !== 0}`);
    console.log(`Can Finalize: ${canFinalize}`);

    if (!isVotingEnded) {
      const hoursRemaining = Math.floor(timeUntilVotingEnds / 3600);
      const minutesRemaining = Math.floor((timeUntilVotingEnds % 3600) / 60);
      console.log(`Time until voting ends: ${hoursRemaining}h ${minutesRemaining}m`);
    }

    return {
      success: true,
      proposalId: proposalId,
      currentStatus: status,
      canFinalize: canFinalize,
      votingEnded: isVotingEnded,
      alreadyFinalized: finalizedAtNum !== 0,
      votingEndsAt: votingEndsAtNum,
      finalizedAt: finalizedAtNum !== 0 ? finalizedAtNum : null,
      timeUntilVotingEnds: !isVotingEnded ? timeUntilVotingEnds : 0,
      votes: {
        yes: proposalData.yesVotes.toString(),
        no: proposalData.noVotes.toString(),
        abstain: proposalData.abstainVotes.toString(),
        totalVoters: proposalData.totalVoters,
      },
    };
  } catch (error: any) {
    if (error.message && error.message.includes("Account does not exist")) {
      throw new Error(`Proposal #${proposalId} does not exist`);
    }
    throw error;
  }
}

// Add this after the finalizeProposal function

// === Execute Proposal ===
export async function executeProposal(
  proposalId: number,
  userKeypair?: Keypair,
  treasuryAccount?: PublicKey,
  recipientAccount?: PublicKey,
  governanceConfigPda?: PublicKey
) {
  const { program, adminKeypair } = getProgram();
  const executor = userKeypair || adminKeypair;

  console.log(`Executing proposal #${proposalId} by ${executor.publicKey.toString()}`);

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposalAccount] = getProposalPda(program.programId, proposalId);
  const [depositEscrowAccount] = getProposalEscrowPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const status = Object.keys(proposalData.status)[0];
    const proposalType = Object.keys(proposalData.proposalType)[0];

    // Convert BN to numbers
    const timelockEndNum = typeof proposalData.timelockEnd === 'number'
      ? proposalData.timelockEnd
      : Number(proposalData.timelockEnd);

    const executedAtNum = typeof proposalData.executedAt === 'number'
      ? proposalData.executedAt
      : Number(proposalData.executedAt);

    console.log(`Proposal status: ${status}`);
    console.log(`Proposal type: ${proposalType}`);
    console.log(`Timelock ends at: ${new Date(timelockEndNum * 1000)}`);

    if (status !== 'passed') {
      throw new Error(`Proposal has not passed. Current status: ${status}`);
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < timelockEndNum) {
      const timeRemaining = timelockEndNum - currentTime;
      const hoursRemaining = Math.floor(timeRemaining / 3600);
      const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
      throw new Error(
        `Timelock has not expired yet. ${hoursRemaining}h ${minutesRemaining}m remaining`
      );
    }

    if (executedAtNum !== 0) {
      throw new Error("Proposal has already been executed");
    }

    const proposerTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      new PublicKey(proposalData.proposer),
      false,
      TOKEN_2022_PROGRAM_ID
    );

    console.log("All validations passed, executing proposal...");

    // BUILD BASE ACCOUNTS - Required for all proposal types
    const [governanceConfig] = getGovernanceConfigPda(program.programId);

    const accounts: any = {
      executor: executor.publicKey,
      proposalAccount: proposalAccount,
      stakingPool: stakingPool,
      programAuthority: programAuthority,
      depositEscrowAccount: depositEscrowAccount,
      proposerTokenAccount: proposerTokenAccount,
      depositTokenMint: tokenMintAddress,
      tokenProgramForDeposit: TOKEN_2022_PROGRAM_ID,
      governanceConfig: governanceConfig,
        // Explicitly set optional accounts to null for non-treasury proposals
      treasuryAccount: null,
      recipientAccount: null,
      tokenMint: null,
      tokenProgram: null,
    };

    // Only override with actual values for treasury transfers
    if (proposalType === 'treasuryTransfer') {
      if (!treasuryAccount || !recipientAccount) {
        throw new Error("Treasury and recipient accounts required for TreasuryTransfer proposals");
      }
      accounts.treasuryAccount = treasuryAccount;
      accounts.recipientAccount = recipientAccount;
      accounts.tokenMint = tokenMintAddress;
      accounts.tokenProgram = TOKEN_2022_PROGRAM_ID;
    }
    // For 'parameterUpdate' and 'text' proposals, don't add treasury-specific accounts

    try {
      const tx = await program.methods
        .executeProposal()
        .accounts(accounts)
        .signers([executor])
        .rpc();

      console.log(`✅ Proposal #${proposalId} executed successfully!`);
      console.log(`Transaction: ${tx}`);

      const updatedProposal = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
      const finalStatus = Object.keys(updatedProposal.status)[0];

      const executedAtNum = typeof updatedProposal.executedAt === 'number'
        ? updatedProposal.executedAt
        : Number(updatedProposal.executedAt);

      console.log(`Final status: ${finalStatus}`);
      console.log(`Executed at: ${new Date(executedAtNum * 1000)}`);
      console.log(`Deposit refunded: ${updatedProposal.depositRefunded ? 'Yes' : 'No'}`);

      return {
        success: true,
        transactionId: tx,
        proposalId: proposalId,
        finalStatus: finalStatus,
        executedAt: executedAtNum,
        depositRefunded: updatedProposal.depositRefunded,
        depositAmount: updatedProposal.depositAmount / 1_000_000,
      };
    } catch (error) {
      console.error("Error executing proposal:", error);
      throw error;
    }
  } catch (error: any) {
    if (error.message && error.message.includes("Account does not exist")) {
      throw new Error(`Proposal #${proposalId} does not exist`);
    }
    throw error;
  }
}
// === Get Proposal Execution Status (helper) ===
export async function getProposalExecutionStatus(proposalId: number) {
  const { program } = getProgram();
  const [proposalAccount] = getProposalPda(program.programId, proposalId);

  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const currentTime = Math.floor(Date.now() / 1000);
    const status = Object.keys(proposalData.status)[0];

    // Convert BN to numbers
    const timelockEndNum = typeof proposalData.timelockEnd === 'number'
      ? proposalData.timelockEnd
      : Number(proposalData.timelockEnd);

    const executedAtNum = typeof proposalData.executedAt === 'number'
      ? proposalData.executedAt
      : Number(proposalData.executedAt);

    const canExecute =
      status === 'passed' &&
      currentTime >= timelockEndNum &&
      executedAtNum === 0;

    const timeUntilTimelockEnds = timelockEndNum - currentTime;
    const isTimelockExpired = timeUntilTimelockEnds <= 0;

    console.log(`=== Execution Status for Proposal #${proposalId} ===`);
    console.log(`Current Status: ${status}`);
    console.log(`Timelock Expired: ${isTimelockExpired}`);
    console.log(`Already Executed: ${executedAtNum !== 0}`);
    console.log(`Can Execute: ${canExecute}`);

    if (!isTimelockExpired && status === 'passed') {
      const hoursRemaining = Math.floor(timeUntilTimelockEnds / 3600);
      const minutesRemaining = Math.floor((timeUntilTimelockEnds % 3600) / 60);
      console.log(`Time until timelock expires: ${hoursRemaining}h ${minutesRemaining}m`);
    }

    return {
      success: true,
      proposalId: proposalId,
      currentStatus: status,
      canExecute: canExecute,
      timelockExpired: isTimelockExpired,
      alreadyExecuted: executedAtNum !== 0,
      timelockEnd: timelockEndNum,
      executedAt: executedAtNum !== 0 ? executedAtNum : null,
      timeUntilTimelockEnds: !isTimelockExpired ? timeUntilTimelockEnds : 0,
    };
  } catch (error: any) {
    if (error.message && error.message.includes("Account does not exist")) {
      throw new Error(`Proposal #${proposalId} does not exist`);
    }
    throw error;
  }
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

// === Get Complete Proposal Lifecycle Status ===
export async function getCompleteProposalStatus(proposalId: number) {
  const { program } = getProgram();
  const [proposalAccount] = getProposalPda(program.programId, proposalId);

  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const currentTime = Math.floor(Date.now() / 1000);
    const status = Object.keys(proposalData.status)[0];
    const proposalType = Object.keys(proposalData.proposalType)[0];

    // Convert all BN values
    const createdAtNum = Number(proposalData.createdAt);
    const votingEndsAtNum = Number(proposalData.votingEndsAt);
    const finalizedAtNum = Number(proposalData.finalizedAt);
    const executedAtNum = Number(proposalData.executedAt);
    const timelockEndNum = Number(proposalData.timelockEnd);

    const lifecycle = {
      phase: status,
      isVotingActive: status === 'active' && currentTime < votingEndsAtNum,
      isVotingEnded: currentTime >= votingEndsAtNum,
      isFinalized: finalizedAtNum !== 0,
      isTimelockActive: status === 'passed' && currentTime < timelockEndNum,
      isTimelockExpired: currentTime >= timelockEndNum,
      isExecuted: executedAtNum !== 0,
      canFinalize: status === 'active' && currentTime >= votingEndsAtNum && finalizedAtNum === 0,
      canExecute: status === 'passed' && currentTime >= timelockEndNum && executedAtNum === 0,
    };

    return {
      success: true,
      proposalId: proposalId,
      title: proposalData.title,
      proposer: proposalData.proposer.toString(),
      type: proposalType,
      status: status,
      lifecycle: lifecycle,
      timestamps: {
        created: createdAtNum,
        votingEnds: votingEndsAtNum,
        finalized: finalizedAtNum || null,
        timelockEnd: timelockEndNum || null,
        executed: executedAtNum || null,
      },
      votes: {
        yes: Number(proposalData.yesVotes),
        no: Number(proposalData.noVotes),
        abstain: Number(proposalData.abstainVotes),
        totalVoters: proposalData.totalVoters,
      },
      deposit: {
        amount: Number(proposalData.depositAmount) / 1_000_000,
        refunded: proposalData.depositRefunded,
      },
    };
  } catch (error: any) {
    if (error.message && error.message.includes("Account does not exist")) {
      throw new Error(`Proposal #${proposalId} does not exist`);
    }
    throw error;
  }
}



// ============================================================================
// GOVERNANCE CONFIG INITIALIZATION
// ============================================================================

export async function initializeGovernanceConfig(userKeypair?: Keypair) {
  const { program, adminKeypair } = getProgram();
  const authority = userKeypair || adminKeypair;

  console.log(`Initializing governance config by ${authority.publicKey.toString()}`);

  const [governanceConfig] = getGovernanceConfigPda(program.programId);

  console.log(`Governance Config PDA: ${governanceConfig.toString()}`);

  try {
    // Check if already initialized
    try {
      await program.account.governanceConfig.fetch(governanceConfig);
      console.log("Governance config already exists");
      return {
        success: true,
        message: "Governance config already initialized",
        governanceConfig: governanceConfig.toString(),
        authority: authority.publicKey.toString(),
      };
    } catch (error) {
      // Doesn't exist, proceed with initialization
    }

    const tx = await program.methods
      .initializeGovernanceConfig()
      .accounts({
        authority: authority.publicKey,
        governanceConfig: governanceConfig,
        systemProgram: SystemProgram.programId,
      })
      .signers([authority])
      .rpc();

    console.log(`✅ Governance config initialized successfully!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      governanceConfig: governanceConfig.toString(),
      authority: authority.publicKey.toString(),
    };
  } catch (error: any) {
    console.error("Error initializing governance config:", error);
    return {
      success: false,
      error: error.message || "Failed to initialize governance config",
    };
  }
}

// ============================================================================
// EXECUTION DATA BUILDERS
// ============================================================================

export function buildTextExecutionData(metadata?: string): number[] {
  if (!metadata) return [];
  const encoder = new TextEncoder();
  return Array.from(encoder.encode(metadata));
}

export function buildTreasuryTransferExecutionData(
  recipientAddress: string,
  amountMicroTokens: number
): number[] {
  if (!recipientAddress || amountMicroTokens <= 0) {
    throw new Error("Invalid treasury transfer parameters");
  }

  const recipientPubkey = new PublicKey(recipientAddress);
  const recipientBytes = Array.from(recipientPubkey.toBytes());

  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(BigInt(amountMicroTokens));
  const amountBytes = Array.from(amountBuffer);

  return [...recipientBytes, ...amountBytes];
}

export function buildParameterUpdateExecutionData(
  parameterId: number,
  newValue: number
): number[] {
  if (![0, 1, 2].includes(parameterId)) {
    throw new Error("Parameter ID must be 0 (Quorum), 1 (Threshold), or 2 (Timelock)");
  }

  // Validate ranges
  if (parameterId === 0 && (newValue < 1 || newValue > 100)) {
    throw new Error("Quorum percentage must be between 1 and 100");
  }
  if (parameterId === 1 && (newValue < 51 || newValue > 100)) {
    throw new Error("Passing threshold must be between 51 and 100");
  }
  if (parameterId === 2 && newValue > 30 * 86400) {
    throw new Error("Timelock duration must be <= 30 days (2592000 seconds)");
  }

  const parameterIdByte = [parameterId];
  const valueBuffer = Buffer.alloc(8);
  valueBuffer.writeBigUInt64LE(BigInt(newValue));
  const valueBytes = Array.from(valueBuffer);

  return [...parameterIdByte, ...valueBytes];
}

// ============================================================================
// TEXT PROPOSAL EXECUTION
// ============================================================================

export async function executeTextProposal(
  proposalId: number,
  userKeypair?: Keypair
) {
  try {
    console.log(`\n📝 Executing Text Proposal #${proposalId}...`);

    const statusCheck = await getProposalExecutionStatus(proposalId);
    if (!statusCheck.canExecute) {
      return {
        success: false,
        proposalId,
        error: "Proposal not ready for execution",
        status: statusCheck,
      };
    }

    const result = await executeProposal(proposalId, userKeypair);

    console.log(`✅ Text proposal executed successfully`);
    return {
      ...result, // Spread result first
      type: 'text', // Then add/override specific properties
    };
  } catch (error: any) {
    console.error(`❌ Error executing text proposal:`, error.message);
    return {
      success: false,
      type: 'text',
      proposalId,
      error: error.message,
    };
  }
}
// ============================================================================
// TREASURY TRANSFER EXECUTION
// ============================================================================

export async function executeTreasuryTransferProposal(
  proposalId: number,
  treasuryAccountAddress: string,
  recipientAccountAddress: string,
  userKeypair?: Keypair
) {
  try {
    console.log(`\n💰 Executing Treasury Transfer Proposal #${proposalId}...`);
    console.log(`   Treasury (input): ${treasuryAccountAddress}`);
    console.log(`   Recipient (input): ${recipientAccountAddress}`);

    const statusCheck = await getProposalExecutionStatus(proposalId);
    if (!statusCheck.canExecute) {
      return {
        success: false,
        proposalId,
        error: "Proposal not ready for execution",
        status: statusCheck,
      };
    }

    const proposalInfo = await getProposalInfo(proposalId);
    const proposalType = Object.keys(proposalInfo.proposalType)[0];
    if (proposalType !== 'treasuryTransfer') {
      return {
        success: false,
        proposalId,
        error: `Invalid proposal type. Expected 'treasuryTransfer', got '${proposalType}'`,
      };
    }

    const { program, connection } = getProgram();

    const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
    if (!tokenMint) {
      throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
    }
    const tokenMintAddress = new PublicKey(tokenMint);

    // If the provided addresses are wallets, convert to ATAs for Token-2022; if already token accounts, keep them
    const resolveToken2022Account = async (address: string): Promise<PublicKey> => {
      const pub = new PublicKey(address);
      const acct = await connection.getAccountInfo(pub);
      if (acct && acct.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        return pub;
      }
      return getAssociatedTokenAddressSync(
        tokenMintAddress,
        pub,
        false,
        TOKEN_2022_PROGRAM_ID
      );
    };

    const treasuryAccount = await resolveToken2022Account(treasuryAccountAddress);
    const recipientAccount = await resolveToken2022Account(recipientAccountAddress);

    console.log(`   Resolved Treasury ATA: ${treasuryAccount.toString()}`);
    console.log(`   Resolved Recipient ATA: ${recipientAccount.toString()}`);

    const result = await executeProposal(
      proposalId,
      userKeypair,
      treasuryAccount,
      recipientAccount
    );

    console.log(`✅ Treasury transfer executed successfully`);
    return {
      ...result, // Spread result first
      type: 'treasuryTransfer', // Then add/override specific properties
      treasury: treasuryAccountAddress,
      recipient: recipientAccountAddress,
    };
  } catch (error: any) {
    console.error(`❌ Error executing treasury transfer:`, error.message);
    return {
      success: false,
      type: 'treasuryTransfer',
      proposalId,
      error: error.message,
    };
  }
}
// ============================================================================
// PARAMETER UPDATE EXECUTION
// ============================================================================

export async function executeParameterUpdateProposal(
  proposalId: number,
  userKeypair?: Keypair
) {
  try {
    console.log(`\n⚙️  Executing Parameter Update Proposal #${proposalId}...`);

    const statusCheck = await getProposalExecutionStatus(proposalId);
    if (!statusCheck.canExecute) {
      return {
        success: false,
        proposalId,
        error: "Proposal not ready for execution",
        status: statusCheck,
      };
    }

    const proposalInfo = await getProposalInfo(proposalId);
    const proposalType = Object.keys(proposalInfo.proposalType)[0];
    if (proposalType !== 'parameterUpdate') {
      return {
        success: false,
        proposalId,
        error: `Invalid proposal type. Expected 'parameterUpdate', got '${proposalType}'`,
      };
    }

    const { program } = getProgram();
    const [governanceConfig] = getGovernanceConfigPda(program.programId);

    console.log(`   Governance Config: ${governanceConfig.toString()}`);

    const result = await executeProposal(
      proposalId,
      userKeypair,
      undefined,
      undefined,
      governanceConfig
    );

    console.log(`✅ Parameter update executed successfully`);
    return {
      ...result, // Spread result first
      type: 'parameterUpdate', // Then add/override specific properties
      governanceConfig: governanceConfig.toString(),
    };
  } catch (error: any) {
    console.error(`❌ Error executing parameter update:`, error.message);
    return {
      success: false,
      type: 'parameterUpdate',
      proposalId,
      error: error.message,
    };
  }
}


// ============================================================================
// SMART EXECUTION (AUTO-DETECT TYPE)
// ============================================================================

export async function executeProposalSmart(
  proposalId: number,
  options: {
    userKeypair?: Keypair;
    treasuryAccount?: string;
    recipientAccount?: string;
  } = {}
) {
  try {
    console.log(`\n🤖 Smart Execution for Proposal #${proposalId}...`);

    const proposalInfo = await getProposalInfo(proposalId);
    const proposalType = Object.keys(proposalInfo.proposalType)[0];

    console.log(`   Detected type: ${proposalType}`);

    switch (proposalType) {
      case 'text':
        return await executeTextProposal(proposalId, options.userKeypair);

      case 'treasuryTransfer':
        if (!options.treasuryAccount || !options.recipientAccount) {
          return {
            success: false,
            proposalId,
            error: 'Treasury and recipient accounts required for treasury transfer',
          };
        }
        return await executeTreasuryTransferProposal(
          proposalId,
          options.treasuryAccount,
          options.recipientAccount,
          options.userKeypair
        );

      case 'parameterUpdate':
        return await executeParameterUpdateProposal(proposalId, options.userKeypair);

      default:
        return {
          success: false,
          proposalId,
          error: `Unknown proposal type: ${proposalType}`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      proposalId,
      error: error.message,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function getExecutionReadinessReport(proposalId: number) {
  try {
    const [statusCheck, proposalInfo] = await Promise.all([
      getProposalExecutionStatus(proposalId),
      getProposalInfo(proposalId),
    ]);

    const proposalType = Object.keys(proposalInfo.proposalType)[0];

    const report = {
      proposalId,
      title: proposalInfo.title,
      type: proposalType,
      currentStatus: statusCheck.currentStatus,
      canExecute: statusCheck.canExecute,
      checks: {
        isPassed: statusCheck.currentStatus === 'passed',
        timelockExpired: statusCheck.timelockExpired,
        notAlreadyExecuted: !statusCheck.alreadyExecuted,
      },
      timeline: {
        timelockEnd: statusCheck.timelockEnd,
        timelockEndDate: new Date(statusCheck.timelockEnd * 1000).toISOString(),
        timeUntilExecutable: statusCheck.timeUntilTimelockEnds,
        hoursUntilExecutable: Math.ceil(statusCheck.timeUntilTimelockEnds / 3600),
        isExecutableNow: statusCheck.canExecute,
      },
      requiredAccounts: getRequiredAccountsForType(proposalType),
      votes: proposalInfo.votes,
    };

    console.log('\n📊 Execution Readiness Report');
    console.log('================================');
    console.log(`Proposal #${proposalId}: ${proposalInfo.title}`);
    console.log(`Type: ${proposalType}`);
    console.log(`Status: ${statusCheck.currentStatus}`);
    console.log(`Can Execute: ${report.canExecute ? '✅ YES' : '❌ NO'}`);

    if (!report.canExecute) {
      if (!report.checks.isPassed) {
        console.log(`   ❌ Proposal has not passed`);
      }
      if (!report.checks.timelockExpired) {
        console.log(`   ⏳ Timelock expires in ${report.timeline.hoursUntilExecutable} hours`);
      }
      if (!report.checks.notAlreadyExecuted) {
        console.log(`   ❌ Proposal already executed`);
      }
    }

    return {
      success: true,
      ...report,
    };
  } catch (error: any) {
    console.error(`❌ Error generating readiness report:`, error.message);
    return {
      success: false,
      proposalId,
      error: error.message,
    };
  }
}

function getRequiredAccountsForType(proposalType: string): string[] {
  switch (proposalType) {
    case 'text':
      return ['None - text proposals require no additional accounts'];
    case 'treasuryTransfer':
      return ['treasuryAccount', 'recipientAccount'];
    case 'parameterUpdate':
      return ['governanceConfig (automatically derived)'];
    default:
      return ['Unknown proposal type'];
  }
}

export async function bulkExecuteReadyProposals(
  maxProposalId: number = 10,
  userKeypair?: Keypair
) {
  console.log(`\n🔄 Bulk Executing Ready Proposals (0-${maxProposalId})...`);

  const results = [];

  for (let proposalId = 0; proposalId <= maxProposalId; proposalId++) {
    try {
      const statusCheck = await getProposalExecutionStatus(proposalId);

      if (statusCheck.canExecute) {
        console.log(`\n   Found executable proposal #${proposalId}`);
        const result = await executeProposalSmart(proposalId, { userKeypair });
        results.push(result);
      }
    } catch (error) {
      // Proposal doesn't exist, skip
      continue;
    }
  }

  console.log(`\n✅ Bulk execution complete. Executed ${results.length} proposals.`);

  return {
    success: true,
    executedCount: results.length,
    results,
  };
}

export async function getExecutionSchedule(maxProposalId: number = 10) {
  console.log(`\n📅 Getting Execution Schedule (0-${maxProposalId})...`);

  const schedule = [];

  for (let proposalId = 0; proposalId <= maxProposalId; proposalId++) {
    try {
      const statusCheck = await getProposalExecutionStatus(proposalId);
      const proposalInfo = await getProposalInfo(proposalId);

      if (statusCheck.currentStatus === 'passed' && !statusCheck.alreadyExecuted) {
        schedule.push({
          proposalId,
          title: proposalInfo.title,
          canExecuteNow: statusCheck.canExecute,
          timelockEnd: statusCheck.timelockEnd,
          executableAt: new Date(statusCheck.timelockEnd * 1000).toISOString(),
          hoursUntilExecutable: Math.ceil(statusCheck.timeUntilTimelockEnds / 3600),
        });
      }
    } catch (error) {
      // Proposal doesn't exist, skip
      continue;
    }
  }

  // Sort by execution time
  schedule.sort((a, b) => a.timelockEnd - b.timelockEnd);

  console.log('\n📋 Execution Schedule');
  console.log('=====================');
  schedule.forEach((item) => {
    const status = item.canExecuteNow
      ? '✅ Ready Now'
      : `⏳ ${item.hoursUntilExecutable}h`;
    console.log(`#${item.proposalId}: ${item.title.substring(0, 40)}... - ${status}`);
  });

  return {
    success: true,
    count: schedule.length,
    schedule,
  };
}

// ============================================================================
// HELPER: Get Admin Token Account (for treasury transfers)
// ============================================================================

export async function getAdminTreasuryAccount() {
  const { adminKeypair } = getProgram();
  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;

  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }

  const tokenMintAddress = new PublicKey(tokenMint);
  const adminTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    adminKeypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  return {
    address: adminTokenAccount.toString(),
    publicKey: adminTokenAccount,
  };
}

export async function fundTreasury(amount: number) {
  const { program, connection, adminKeypair } = getProgram();

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [treasuryAccount] = getTreasuryPda(program.programId, stakingPool);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Admin's token account
  const adminTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    adminKeypair.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  console.log(`Funding treasury with ${amount} ZSNIPE...`);
  console.log(`From: ${adminTokenAccount.toString()}`);
  console.log(`To: ${treasuryAccount.toString()}`);

  // Use standard SPL token transfer
  const { transfer } = await import("@solana/spl-token");
  
  try {
    const signature = await transfer(
      connection,
      adminKeypair,
      adminTokenAccount,
      treasuryAccount,
      adminKeypair,
      amount * 1_000_000,
      [],
      undefined,
      TOKEN_2022_PROGRAM_ID
    );

    console.log(`✅ Treasury funded successfully!`);
    console.log(`Transaction: ${signature}`);

    return {
      success: true,
      transactionId: signature,
      amount: amount,
      treasuryAccount: treasuryAccount.toString(),
    };
  } catch (error) {
    console.error("Error funding treasury:", error);
    throw error;
  }
}


export async function getTreasuryAccount() {
  const { program } = getProgram();
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [treasuryAccount] = getTreasuryPda(program.programId, stakingPool);

  return {
    address: treasuryAccount.toString(),
    publicKey: treasuryAccount,
  };
}

// ============================================================================
// DECODE EXECUTION DATA (for previewing what a proposal will do)
// ============================================================================

export function decodeTreasuryTransferExecutionData(executionData: number[]) {
  if (executionData.length !== 40) {
    throw new Error(`Invalid treasury transfer data length: ${executionData.length}`);
  }

  const recipientBytes = executionData.slice(0, 32);
  const recipient = new PublicKey(Buffer.from(recipientBytes));

  const amountBytes = Buffer.from(executionData.slice(32, 40));
  const amount = Number(amountBytes.readBigUInt64LE(0));

  return {
    recipient: recipient.toString(),
    amountMicroTokens: amount,
    amountTokens: amount / 1_000_000,
  };
}

export function decodeParameterUpdateExecutionData(executionData: number[]) {
  if (executionData.length !== 9) {
    throw new Error(`Invalid parameter update data length: ${executionData.length}`);
  }

  const parameterId = executionData[0];
  const valueBytes = Buffer.from(executionData.slice(1, 9));
  const value = Number(valueBytes.readBigUInt64LE(0));

  const paramNames = [
    "Quorum Percentage",
    "Passing Threshold",
    "Timelock Duration (seconds)",
  ];
  const paramName = paramNames[parameterId] || "Unknown";

  return {
    parameterId,
    parameterName: paramName,
    newValue: value,
  };
}

export async function getProposalExecutionPreview(proposalId: number) {
  try {
    const proposalInfo = await getProposalInfo(proposalId);
    const proposalType = Object.keys(proposalInfo.proposalType)[0];
    const executionData = proposalInfo.executionData; // Now this property exists

    const preview: any = {
      proposalId,
      title: proposalInfo.title,
      type: proposalType,
      status: Object.keys(proposalInfo.status)[0],
    };

    if (proposalType === 'treasuryTransfer' && executionData && executionData.length > 0) {
      const decoded = decodeTreasuryTransferExecutionData(executionData);
      preview.action = {
        type: 'Transfer tokens from treasury',
        recipient: decoded.recipient,
        amount: `${decoded.amountTokens} ZSNIPE (${decoded.amountMicroTokens} micro-tokens)`,
      };
    } else if (proposalType === 'parameterUpdate' && executionData && executionData.length > 0) {
      const decoded = decodeParameterUpdateExecutionData(executionData);
      preview.action = {
        type: 'Update governance parameter',
        parameter: decoded.parameterName,
        newValue: decoded.newValue,
      };
    } else if (proposalType === 'text') {
      preview.action = {
        type: 'No on-chain execution',
        note: 'Text proposal is for signaling only',
      };
    }

    return { success: true, ...preview };
  } catch (error: any) {
    return { success: false, proposalId, error: error.message };
  }
}