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

import { StakingPool, UserStakingAccount } from "../types/types";
import {
  getStakingPoolPda,
  getProgramAuthorityPda,
  getUserStakePda,
  getEscrowTokenAccountPda,
  getGovernancePda,
} from "../utils/getPDAs";
import { getProgram } from "../utils/getProgram";
import { getMockWalletKeypair, getAllMockWallets } from "../utils/mockWallets";

// ============================================================================
// STAKING MODULE
// ============================================================================

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

// === Utility Functions for Mock Wallets ===
export async function getAllWalletsStatus() {
  console.log("Fetching status for all mock wallets...");
  const wallets = getAllMockWallets();
  const results = [];

  for (const wallet of wallets) {
    try {
      const balance = await checkUserTokenBalance(wallet.keypair);
      const stakingInfo = await getUserStakingInfo(wallet.keypair);
      
      results.push({
        walletNumber: wallet.walletNumber,
        publicKey: wallet.publicKey.toString(),
        tokenBalance: balance?.balance || 0,
        stakedAmount: stakingInfo?.stakedAmount || 0,
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
