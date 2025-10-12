import { Keypair } from "@solana/web3.js";

// Helper function to get mock wallet keypair by wallet number (1-10)
export const getMockWalletKeypair = (walletNumber: number) => {
  if (walletNumber < 1 || walletNumber > 10) {
    throw new Error("Wallet number must be between 1 and 10");
  }
  const walletFile = require(`../config/ZSNIPE_wallet_${walletNumber}.json`);
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
