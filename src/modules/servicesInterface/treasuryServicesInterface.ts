import {
  PublicKey,
  SystemProgram,
  Transaction
} from "@solana/web3.js";

import { 
  TOKEN_2022_PROGRAM_ID, 
  getAssociatedTokenAddressSync,
  createTransferInstruction
} from "@solana/spl-token";

import {
  getStakingPoolPda,
  getProgramAuthorityPda,
  getTreasuryPda,
} from "../utils/getPDAs";
import { getProgram } from "../utils/getProgram";
import { getTreasuryAccount } from "../utils/helpers";

// === Initialize Treasury (Admin only) ===
export async function createInitializeTreasuryTransaction(adminPublicKey: PublicKey) {
  const { program, connection } = getProgram();

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [treasuryAccount] = getTreasuryPda(program.programId, stakingPool);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .initializeTreasury()
      .accounts({
        admin: adminPublicKey,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        treasuryAccount: treasuryAccount,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .transaction();

    transaction.feePayer = adminPublicKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Initialize treasury transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        treasuryAccount: treasuryAccount.toString(),
        programAuthority: programAuthority.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating initialize treasury transaction:", error);
    return { 
      success: false, 
      message: `Error creating initialize treasury transaction: ${error.message || error}` 
    };
  }
}

// === Fund Treasury (Admin only) ===
export async function createFundTreasuryTransaction(adminPublicKey: PublicKey, amountTokens: number) {
  const { program, connection } = getProgram();

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [treasuryAccount] = getTreasuryPda(program.programId, stakingPool);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Admin's token account
  const adminTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    adminPublicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");
    const amount = BigInt(Math.floor(amountTokens * 1_000_000));

    const ix = createTransferInstruction(
      adminTokenAccount,
      treasuryAccount,
      adminPublicKey,
      Number(amount),
      [],
      TOKEN_2022_PROGRAM_ID
    );

    const tx = new Transaction().add(ix);
    tx.feePayer = adminPublicKey;
    tx.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Fund treasury transaction created successfully!",
      transaction: tx.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        adminTokenAccount: adminTokenAccount.toString(),
        treasuryAccount: treasuryAccount.toString(),
        tokenMint: tokenMintAddress.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating fund treasury transaction:", error);
    return { 
      success: false, 
      message: `Error creating fund treasury transaction: ${error.message || error}` 
    };
  }
}

// === Get Treasury Account (read-only) ===
export async function getTreasuryAccountInterface() {
  const treasuryAccount = await getTreasuryAccount();

  return {
    success: true,
    data: {
      address: treasuryAccount.address,
    }
  };
}
