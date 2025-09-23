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

const STAKING_POOL_SEED = "staking_pool";
const PROGRAM_AUTHORITY_SEED = "program_authority";

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

// === Initialize Staking Pool ===
export async function initializeStakingPool() {
  const { program, adminKeypair } = getProgram();

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);
  
  try {
    const tx = await program.methods
      .initializeStakingPool()
      .accounts({
        admin: adminKeypair.publicKey,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([adminKeypair])
      .rpc();

    console.log(`Staking pool initialized. Transaction: ${tx}`);

    return {
      transactionId: tx,
      adminPublicKey: adminKeypair.publicKey,
      stakingPool: stakingPool,
      programAuthority: programAuthority,
      tokenMint: tokenMint,
      tokenMintAddress: tokenMintAddress,
    };
  } catch (error) {
    console.error("Error initializing staking pool:", error);
    throw error;
  }
}
