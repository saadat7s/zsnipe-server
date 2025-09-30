import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  SystemProgram,
  Transaction
} from "@solana/web3.js";

import * as anchor from "@coral-xyz/anchor";
import { 
  createMint,
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  TOKEN_2022_PROGRAM_ID, 
  createAssociatedTokenAccountInstruction, 
  getAssociatedTokenAddressSync 
} from "@solana/spl-token";

import { StakingPool, UserStakingAccount } from "../types";

// Helper function to get the program
export const getProgram = () => {
  const idl = require("./idl.json");
  const walletKeypair = require("./ZSNIPE_Admin-wallet-keypair.json");

  const adminKeypair = Keypair.fromSecretKey(new Uint8Array(walletKeypair));
  const adminPublicKey = adminKeypair.publicKey;

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const programId = new PublicKey(
    "629dBzrHwL12uJS1nN8VyomiWgRTtVWqdmSUJLcpxjyu"
  );

  const provider = new anchor.AnchorProvider(
    connection,
    new anchor.Wallet(adminKeypair),
    anchor.AnchorProvider.defaultOptions()
  );
  anchor.setProvider(provider);

  return {
    program: new anchor.Program(idl, programId, provider),
    adminPublicKey,
    adminKeypair,
    connection,    
  };
};


// Helper function to get mock wallet keypair by wallet number (1-10)
export const getMockWalletKeypair = (walletNumber: number) => {
  if (walletNumber < 1 || walletNumber > 10) {
    throw new Error("Wallet number must be between 1 and 10");
  }
  const walletFile = require(`./ZSNIPE_wallet_${walletNumber}.json`);
  return Keypair.fromSecretKey(new Uint8Array(walletFile));
};

// Helper function to get all mock wallets
export const getAllMockWallets = () => {
  const wallets = [];
  for (let i = 1; i <= 10; i++) {
    try {
      const keypair = getMockWalletKeypair(i);
      wallets.push({
        walletNumber: i,
        publicKey: keypair.publicKey,
        keypair: keypair
      });
    } catch (error) {
      console.warn(`Could not load wallet ${i}:`, error);
    }
  }
  return wallets;
};

// Seeds from smart contract
const STAKING_POOL_SEED = "staking_poolV2";
const PROGRAM_AUTHORITY_SEED = "program_authority";
const USER_STAKE_SEED = "user_stake";
const ESCROW_SEED = "escrow";
const GOVERNANCE_SEED = "governance";


const PROPOSAL_SEED = "proposal";
const PROPOSAL_ESCROW_SEED = "proposal_escrow";

// // Governance constants
const MIN_STAKE_DURATION_FOR_VOTING = 30 * 24 * 60 * 60; // 30 days in seconds
// // Proposal configuration constants
// export const MIN_STAKE_TO_PROPOSE = 10_000_000_000; // 10,000 ZSNIPE tokens (with 6 decimals)
// export const MIN_STAKE_DURATION_TO_PROPOSE = 30 * 24 * 60 * 60; // 30 days in seconds
// export const PROPOSAL_DEPOSIT_AMOUNT = 1_000_000_000; // 1,000 ZSNIPE tokens (with 6 decimals)

// TEMPORARY TEST VALUES - Change back for production!
export const MIN_STAKE_TO_PROPOSE = 100_000_000; // 100 ZSNIPE (was 10,000)
export const MIN_STAKE_DURATION_TO_PROPOSE = 1 * 24 * 60 * 60; // 1 day (was 30)
export const PROPOSAL_DEPOSIT_AMOUNT = 100_000_000; // 100 ZSNIPE (was 1,000)

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

// Helper function to get proposal PDA
export function getProposalPda(programId: PublicKey, proposalId: number): [PublicKey, number] {
  const proposalIdBuffer = Buffer.alloc(8);
  proposalIdBuffer.writeBigUInt64LE(BigInt(proposalId));
  
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PROPOSAL_SEED), proposalIdBuffer],
    programId
  );
}

// Helper function to get proposal escrow PDA
export function getProposalEscrowPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(PROPOSAL_ESCROW_SEED)],
    programId
  );
}

// Types for governance accounts
export interface GovernanceAccount {
  staker: PublicKey;
  participationCount: number;
  lastVoteTimestamp: anchor.BN;
  stakeLockEnd: anchor.BN;
  votingPowerCache: anchor.BN;
  createdAt: anchor.BN;
  bump: number;
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
  // Base power calculation (linear up to 100K, then quadratic)
  let basePower: number;
  if (stakeAmount <= 100_000) {
    basePower = stakeAmount;
  } else {
    basePower = 100_000 + Math.floor(Math.sqrt(stakeAmount - 100_000));
  }

  // Time multiplier based on stake duration
  let timeMultiplier: number;
  if (stakeDurationDays <= 30) {
    timeMultiplier = 100; // 1.0x
  } else if (stakeDurationDays <= 90) {
    timeMultiplier = 120; // 1.2x
  } else if (stakeDurationDays <= 365) {
    timeMultiplier = 150; // 1.5x
  } else {
    timeMultiplier = 200; // 2.0x maximum
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

    return stakingInfo;
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
        stakedAmount: stakingInfo?.stakedAmount?.toNumber() || 0,
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
  votingPeriod: number, // 3, 7, or 14 days
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
  if (![3, 7, 14].includes(votingPeriod)) {
    throw new Error("Voting period must be 3, 7, or 14 days");
  }

  console.log("All validations passed, creating proposal...");

  try {
    const tx = await program.methods
      .createProposal(
        new anchor.BN(proposalId),
        title,
        description,
        { text: {} }, // ProposalType enum - adjust based on proposalType param
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