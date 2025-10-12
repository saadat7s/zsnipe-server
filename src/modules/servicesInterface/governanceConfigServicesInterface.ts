import {
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import {
  getGovernanceConfigPda,
} from "../utils/getPDAs";
import { getProgram } from "../utils/getProgram";

// === Create Initialize Governance Config Transaction (Admin only) ===
export async function createInitializeGovernanceConfigTransaction(adminPublicKey: PublicKey) {
  const { program, connection } = getProgram();

  const [governanceConfig] = getGovernanceConfigPda(program.programId);

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .initializeGovernanceConfig()
      .accounts({
        admin: adminPublicKey,
        governanceConfig: governanceConfig,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction.feePayer = adminPublicKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Initialize governance config transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        governanceConfig: governanceConfig.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating initialize governance config transaction:", error);
    return { 
      success: false, 
      message: `Error creating initialize governance config transaction: ${error.message || error}` 
    };
  }
}
