import {
  Connection,
  Keypair,
  PublicKey,
} from "@solana/web3.js";

import * as anchor from "@coral-xyz/anchor";

// Helper function to get the program
export const getProgram = () => {
  // Clear the cached IDL - CRITICAL for updates
  delete require.cache[require.resolve("./idl.json")];
  const idl = require("./idl.json");
  const walletKeypair = require("./ZSNIPE_Admin-wallet-keypair.json");

  const adminKeypair = Keypair.fromSecretKey(new Uint8Array(walletKeypair));
  const adminPublicKey = adminKeypair.publicKey;

  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  const programId = new PublicKey(
    "758R2jFfces6Ue5B9rLmRrh8NesiU9dCtDa4bUSBpCMt"
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
