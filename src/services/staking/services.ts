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
  
  // Helper function to get user keypair from file
  export const getUserKeypair = () => {
    const userWalletKeypair = require("./user-keypair.json");
    return Keypair.fromSecretKey(new Uint8Array(userWalletKeypair));
  };
  
  const STAKING_POOL_SEED = "staking_poolV2";
  const PROGRAM_AUTHORITY_SEED = "program_authority";
  const USER_STAKE_SEED = "user_stake";
  const ESCROW_SEED = "escrow";
  
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
          escrowTokenAccount: escrowTokenAccount, // Added the escrow PDA
          tokenMint: tokenMintAddress,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID, // Required for token account creation
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
  export async function stakeTokens(amount: number) {
    const { program, connection, adminKeypair } = getProgram();
    const userKeypair = adminKeypair;
    console.log(`Staking ${amount} tokens for user: ${adminKeypair.publicKey.toString()}`);
  
    // Get all required PDAs
    const [stakingPool] = getStakingPoolPda(program.programId);
    const [programAuthority] = getProgramAuthorityPda(program.programId);
    const [userStakingAccount] = getUserStakePda(program.programId, userKeypair.publicKey);
    const [escrowTokenAccount] = getEscrowTokenAccountPda(program.programId, stakingPool);
  
    const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
    if (!tokenMint) {
      throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
    }
    const tokenMintAddress = new PublicKey(tokenMint);
  
    // Get user's token account (associated token account)
    const stakerTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      userKeypair.publicKey,
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
          userKeypair.publicKey, // payer
          stakerTokenAccount,    // account to create
          userKeypair.publicKey, // owner
          tokenMintAddress,      // mint
          TOKEN_2022_PROGRAM_ID, // token program
          ASSOCIATED_TOKEN_PROGRAM_ID
        );
  
        const transaction = new Transaction().add(createAccountIx);
        const signature = await sendAndConfirmTransaction(
          connection,
          transaction,
          [userKeypair]
        );
  
        console.log(`User token account created: ${signature}`);
      }
    } catch (error) {
      console.error("Error ensuring user token account:", error);
      throw error;
    }
  
    try {
      const tx = await program.methods
        .stake(new anchor.BN(amount))
        .accounts({
          staker: userKeypair.publicKey,
          stakingPool: stakingPool,
          userStakingAccount: userStakingAccount,
          programAuthority: programAuthority,
          escrowTokenAccount: escrowTokenAccount,
          stakerTokenAccount: stakerTokenAccount,
          tokenMint: tokenMintAddress,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([userKeypair])
        .rpc();
  
      console.log(`Successfully staked ${amount} tokens!`);
      console.log(`Transaction: ${tx}`);
  
      return {
        success: true,
        transactionId: tx,
        amount: amount,
        userPublicKey: userKeypair.publicKey,
        userStakingAccount: userStakingAccount,
      };
    } catch (error) {
      console.error("Error staking tokens:", error);
      throw error;
    }
  }

    // === Unstake Tokens ===
export async function unstakeTokens(amount: number) {
  const { program, adminKeypair } = getProgram();
  const userKeypair = adminKeypair; // Using admin as user for testing

  console.log(`Unstaking ${amount} tokens for user: ${userKeypair.publicKey.toString()}`);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [userStakingAccount] = getUserStakePda(program.programId, userKeypair.publicKey);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(program.programId, stakingPool);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Get user's token account (associated token account)
  const stakerTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    userKeypair.publicKey,
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

  try {
    const tx = await program.methods
      .unstake(new anchor.BN(amount))
      .accounts({
        staker: userKeypair.publicKey,
        stakingPool: stakingPool,
        userStakingAccount: userStakingAccount,
        programAuthority: programAuthority,
        escrowTokenAccount: escrowTokenAccount,
        stakerTokenAccount: stakerTokenAccount,
        tokenMint: tokenMintAddress,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([userKeypair])
      .rpc();

    console.log(`Successfully unstaked ${amount} tokens!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      amount: amount,
      userPublicKey: userKeypair.publicKey,
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
  export async function getUserStakingInfo(userPublicKey?: PublicKey) {
    const { program, adminKeypair } = getProgram();
    const targetUser = adminKeypair.publicKey;
    const [userStakingAccount] = getUserStakePda(program.programId, targetUser);
  
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
  export async function checkUserTokenBalance() {
    const { connection, adminKeypair } = getProgram();
    const userKeypair = adminKeypair;
    
    const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
    if (!tokenMint) {
      throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
    }
    const tokenMintAddress = new PublicKey(tokenMint);
  
    const userTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      userKeypair.publicKey,
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