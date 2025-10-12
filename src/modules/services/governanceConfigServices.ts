import {
  Keypair,
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import {
  getGovernanceConfigPda,
} from "../utils/getPDAs";
import { getProgram } from "../utils/getProgram";

// ============================================================================
// GOVERNANCE CONFIG MODULE
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
