import {
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import * as anchor from "@coral-xyz/anchor";
import { 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  TOKEN_2022_PROGRAM_ID, 
  getAssociatedTokenAddressSync,
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

// === Initialize Staking Pool (Admin only) ===
export async function createInitializeStakingPoolTransaction(adminPublicKey: PublicKey) {
  const { program, connection } = getProgram()

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(program.programId, stakingPool);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .initializeStakingPool()
      .accounts({
        admin: adminPublicKey,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        escrowTokenAccount: escrowTokenAccount,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .transaction();

    transaction.feePayer = adminPublicKey;  
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Initialize staking pool transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        stakingPool: stakingPool.toString(),
        programAuthority: programAuthority.toString(),
        escrowTokenAccount: escrowTokenAccount.toString(),
        tokenMint: tokenMintAddress.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating initialize staking pool transaction:", error);
    return { 
      success: false, 
      message: `Error creating initialize staking pool transaction: ${error.message || error}` 
    };
  }
}

// === Create Stake Tokens Transaction ===
export async function createStakeTokensTransaction(userPublicKey: string, amount: number) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [userStakingAccount] = getUserStakePda(program.programId, userPubKey);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(program.programId, stakingPool);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Get user's token account (associated token account)
  const stakerTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    userPubKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .stake(new anchor.BN(amount * Math.pow(10, 6)))
      .accounts({
        staker: userPubKey,
        stakingPool: stakingPool,
        userStakingAccount: userStakingAccount,
        programAuthority: programAuthority,
        escrowTokenAccount: escrowTokenAccount,
        stakerTokenAccount: stakerTokenAccount,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPubKey;

    return {
      success: true,
      message: "Stake tokens transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        userStakingAccount: userStakingAccount.toString(),
        stakingPool: stakingPool.toString(),
        escrowTokenAccount: escrowTokenAccount.toString(),
        stakerTokenAccount: stakerTokenAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating stake tokens transaction:", error);
    return { 
      success: false, 
      message: `Error creating stake tokens transaction: ${error.message || error}` 
    };
  }
}

// === Create Unstake Tokens Transaction ===
export async function createUnstakeTokensTransaction(userPublicKey: string, amount: number) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [userStakingAccount] = getUserStakePda(program.programId, userPubKey);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(program.programId, stakingPool);
  const [governanceAccount] = getGovernancePda(program.programId, userPubKey);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Get user's token account (associated token account)
  const stakerTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    userPubKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const accounts: any = {
      staker: userPubKey,
      stakingPool: stakingPool,
      userStakingAccount: userStakingAccount,
      programAuthority: programAuthority,
      escrowTokenAccount: escrowTokenAccount,
      stakerTokenAccount: stakerTokenAccount,
      tokenMint: tokenMintAddress,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    };

    // Add governance account (it may or may not exist)
    accounts.governanceAccount = governanceAccount;

    const transaction = await program.methods
      .unstake(new anchor.BN(amount * Math.pow(10, 6)))
      .accounts(accounts)
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Unstake tokens transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        userStakingAccount: userStakingAccount.toString(),
        stakingPool: stakingPool.toString(),
        escrowTokenAccount: escrowTokenAccount.toString(),
        stakerTokenAccount: stakerTokenAccount.toString(),
        governanceAccount: governanceAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating unstake tokens transaction:", error);
    return { 
      success: false, 
      message: `Error creating unstake tokens transaction: ${error.message || error}` 
    };
  }
}

// === Get Account Information (Read-only functions) ===
export async function getStakingPoolInfo() {
  const { program } = getProgram();
  const [stakingPool] = getStakingPoolPda(program.programId);

  try {
    const poolInfo = await program.account.stakingPool.fetch(stakingPool) as StakingPool;
    
    return {
      success: true,
      data: {
        authority: poolInfo.authority.toString(),
        initializer: poolInfo.initializer.toString(),
        totalStakedAmount: poolInfo.totalStakedAmount.toString(),
        mintAddress: poolInfo.mintAddress.toString(),
        escrowAccount: poolInfo.escrowAccount.toString(),
        isActive: poolInfo.isActive,
        tokenPriceUsdMicro: poolInfo.tokenPriceUsdMicro.toString(),
        createdAt: poolInfo.createdAt.toNumber(),
        priceLastUpdated: poolInfo.priceLastUpdated.toNumber(),
      }
    };
  } catch (error: any) {
    console.error("Error fetching staking pool info:", error);
    return { success: false, error: error.message || 'Failed to fetch staking pool info' };
  }
}

export async function getUserStakingInfo(userPublicKey: string) {
  const { program } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);
  const [userStakingAccount] = getUserStakePda(program.programId, userPubKey);

  try {
    const stakingInfo = await program.account.userStakingAccount.fetch(userStakingAccount) as UserStakingAccount;
    console.log("stakingInfo", stakingInfo.stakedAmount.toNumber()/1_000_000);
    return {
      success: true,
      data: {
        staker: stakingInfo.staker.toString(),
        stakedAmount: stakingInfo.stakedAmount.toNumber()/1_000_000,
        timestamp: stakingInfo.timestamp.toNumber(),
        lastUpdated: stakingInfo.lastUpdated.toNumber(),
        bump: stakingInfo.bump,
      }
    };
  } catch (error: any) {
    console.error("Error fetching user staking info:", error);
    return { success: false, error: 'User has not staked yet or account does not exist' };
  }
}

// === Check User Token Balance ===
export async function checkUserTokenBalance(userPublicKey: string) {
  const { connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  const userTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    userPubKey,
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
        success: true,
        data: {
          balance: tokenBalance.uiAmount,
          decimals: tokenBalance.decimals,
          tokenAccount: userTokenAccount.toString(),
          tokenMint: tokenMintAddress.toString(),
          userPublicKey: userPubKey.toString()
        }
      };
    } else {
      console.log("User token account doesn't exist");
      return {
        success: true,
        data: {
          balance: 0,
          rawBalance: "0",
          decimals: 6,
          tokenAccount: userTokenAccount.toString(),
          tokenMint: tokenMintAddress.toString(),
          userPublicKey: userPubKey.toString(),
          message: "Token account does not exist - user has no tokens"
        }
      };
    }
  } catch (error: any) {
    console.error("Error checking user token balance:", error);
    return { 
      success: false, 
      error: error.message || 'Failed to check user token balance' 
    };
  }
}
