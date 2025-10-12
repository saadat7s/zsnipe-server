import {
  PublicKey,
} from "@solana/web3.js";

import { 
  TOKEN_2022_PROGRAM_ID, 
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import { ProposalInfo } from "../types/types";
import {
  getStakingPoolPda,
  getProgramAuthorityPda,
  getProposalPda,
  getProposalEscrowPda,
  getGovernanceConfigPda,
} from "../utils/getPDAs";
import { getProgram } from "../utils/getProgram";

// === Execute Proposal Transactions (Client-side) ===
export async function createExecuteTextProposalTransaction(
  userPublicKey: string,
  proposalId: number
) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposalAccount] = getProposalPda(program.programId, proposalId);
  const [depositEscrowAccount] = getProposalEscrowPda(program.programId);
  const [governanceConfig] = getGovernanceConfigPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Fetch proposer to compute proposer token account (for potential deposit refund path)
  let proposerTokenAccount: PublicKey;
  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    proposerTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      new PublicKey(proposalData.proposer),
      false,
      TOKEN_2022_PROGRAM_ID
    );
  } catch (e) {
    throw new Error(`Proposal #${proposalId} does not exist`);
  }

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .executeProposal()
      .accounts({
        executor: userPubKey,
        proposalAccount: proposalAccount,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        depositEscrowAccount: depositEscrowAccount,
        proposerTokenAccount: proposerTokenAccount,
        depositTokenMint: tokenMintAddress,
        tokenProgramForDeposit: TOKEN_2022_PROGRAM_ID,
        governanceConfig: governanceConfig,
        treasuryAccount: null,
        recipientAccount: null,
        tokenMint: null,
        tokenProgram: null,
      })
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Execute text proposal transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        proposalAccount: proposalAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating execute text proposal transaction:", error);
    return { success: false, message: error.message || 'Failed to create execute text proposal transaction' };
  }
}

export async function createExecuteTreasuryTransferTransaction(
  userPublicKey: string,
  proposalId: number,
  treasuryAccountOrWallet: string,
  recipientAccountOrWallet: string
) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposalAccount] = getProposalPda(program.programId, proposalId);
  const [depositEscrowAccount] = getProposalEscrowPda(program.programId);
  const [governanceConfig] = getGovernanceConfigPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // proposer token account
  let proposerTokenAccount: PublicKey;
  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    proposerTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      new PublicKey(proposalData.proposer),
      false,
      TOKEN_2022_PROGRAM_ID
    );
  } catch (e) {
    throw new Error(`Proposal #${proposalId} does not exist`);
  }

  // Resolve recipient/treasury to Token-2022 ATAs if wallets provided
  const resolveToken2022Account = async (address: string): Promise<PublicKey> => {
    const pub = new PublicKey(address);
    const acct = await connection.getAccountInfo(pub);
    if (acct && acct.owner.equals(TOKEN_2022_PROGRAM_ID)) return pub;
    return getAssociatedTokenAddressSync(tokenMintAddress, pub, false, TOKEN_2022_PROGRAM_ID);
  };

  const treasuryAccount = await resolveToken2022Account(treasuryAccountOrWallet);
  const recipientAccount = await resolveToken2022Account(recipientAccountOrWallet);

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .executeProposal()
      .accounts({
        executor: userPubKey,
        proposalAccount: proposalAccount,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        depositEscrowAccount: depositEscrowAccount,
        proposerTokenAccount: proposerTokenAccount,
        depositTokenMint: tokenMintAddress,
        tokenProgramForDeposit: TOKEN_2022_PROGRAM_ID,
        governanceConfig: governanceConfig,
        treasuryAccount: treasuryAccount,
        recipientAccount: recipientAccount,
        tokenMint: tokenMintAddress,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Execute treasury transfer transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        proposalAccount: proposalAccount.toString(),
        treasuryAccount: treasuryAccount.toString(),
        recipientAccount: recipientAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating execute treasury transfer transaction:", error);
    return { success: false, message: error.message || 'Failed to create execute treasury transfer transaction' };
  }
}

export async function createExecuteParameterUpdateTransaction(
  userPublicKey: string,
  proposalId: number
) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposalAccount] = getProposalPda(program.programId, proposalId);
  const [depositEscrowAccount] = getProposalEscrowPda(program.programId);
  const [governanceConfig] = getGovernanceConfigPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // proposer token account
  let proposerTokenAccount: PublicKey;
  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    proposerTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      new PublicKey(proposalData.proposer),
      false,
      TOKEN_2022_PROGRAM_ID
    );
  } catch {
    throw new Error(`Proposal #${proposalId} does not exist`);
  }

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .executeProposal()
      .accounts({
        executor: userPubKey,
        proposalAccount: proposalAccount,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        depositEscrowAccount: depositEscrowAccount,
        proposerTokenAccount: proposerTokenAccount,
        depositTokenMint: tokenMintAddress,
        tokenProgramForDeposit: TOKEN_2022_PROGRAM_ID,
        governanceConfig: governanceConfig,
        treasuryAccount: null,
        recipientAccount: null,
        tokenMint: null,
        tokenProgram: null,
      })
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Execute parameter update transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        proposalAccount: proposalAccount.toString(),
        governanceConfig: governanceConfig.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating execute parameter update transaction:", error);
    return { success: false, message: error.message || 'Failed to create execute parameter update transaction' };
  }
}

export async function createExecuteProposalSmartTransaction(
  userPublicKey: string,
  proposalId: number,
  opts?: { treasuryAccount?: string; recipientAccount?: string }
) {
  const { program } = getProgram();
  const [proposalAccount] = getProposalPda(program.programId, proposalId);
  const data = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
  const proposalType = Object.keys(data.proposalType)[0];

  if (proposalType === 'treasuryTransfer') {
    if (!opts?.treasuryAccount || !opts?.recipientAccount) {
      throw new Error('treasuryAccount and recipientAccount are required for treasury transfers');
    }
    return await createExecuteTreasuryTransferTransaction(
      userPublicKey,
      proposalId,
      opts.treasuryAccount,
      opts.recipientAccount
    );
  }
  if (proposalType === 'parameterUpdate') {
    return await createExecuteParameterUpdateTransaction(userPublicKey, proposalId);
  }
  return await createExecuteTextProposalTransaction(userPublicKey, proposalId);
}
