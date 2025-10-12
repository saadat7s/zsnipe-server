import {
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import * as anchor from "@coral-xyz/anchor";
import { 
  TOKEN_2022_PROGRAM_ID, 
  getAssociatedTokenAddressSync 
} from "@solana/spl-token";

import {
  getStakingPoolPda,
  getProgramAuthorityPda,
  getTreasuryPda,
} from "../utils/getPDAs";
import { getProgram } from "../utils/getProgram";
import { getTreasuryAccount } from "../utils/helpers";

// ============================================================================
// TREASURY MODULE
// ============================================================================

// === Initialize Treasury ===
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

// === Fund Treasury ===
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

// === Get Admin Treasury Account (for treasury transfers) ===
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

// === Get Treasury Account Info ===
export async function getTreasuryAccountInfo() {
  const treasuryAccount = await getTreasuryAccount();

  return {
    success: true,
    data: {
      address: treasuryAccount.address,
      publicKey: treasuryAccount.publicKey,
    }
  };
}
