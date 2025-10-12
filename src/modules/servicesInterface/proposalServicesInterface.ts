import {
  PublicKey,
  SystemProgram,
} from "@solana/web3.js";

import * as anchor from "@coral-xyz/anchor";
import { 
  TOKEN_2022_PROGRAM_ID, 
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

import { VoteRecord, VoteChoice, ProposalInfo } from "../types/types";
import {
  getStakingPoolPda,
  getProgramAuthorityPda,
  getUserStakePda,
  getGovernancePda,
  getProposalPda,
  getProposalEscrowPda,
  getVoteRecordPda,
} from "../utils/getPDAs";
import { getProgram } from "../utils/getProgram";
import { getProposalTypeEnum } from "../utils/helpers";

// Types for better type safety
interface ProposalAccount {
  proposalId: number;
  title: string;
  description: string;
  proposer: string;
  status: string;
  proposalType: string;
  votingPeriodDays: number;
  createdAt: number;
  votingEndsAt: number;
  finalizedAt: number;
  executedAt: number;
  timelockEnd: number;
  yesVotes: number;
  noVotes: number;
  abstainVotes: number;
  totalVoters: number;
  depositAmount: number;
  depositRefunded: boolean;
  publicKey: string;
}

interface GetAllProposalsResponse {
  success: boolean;
  count: number;
  proposals: ProposalAccount[];
}

// === Create Initialize Proposal Escrow Transaction (Admin only) ===
export async function createInitializeProposalEscrowTransaction(adminPublicKey: PublicKey) {
  const { program, connection } = getProgram();

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposalEscrow] = getProposalEscrowPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .initializeProposalEscrow()
      .accounts({
        admin: adminPublicKey,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        proposalEscrow: proposalEscrow,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .transaction();

    transaction.feePayer = adminPublicKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Initialize proposal escrow transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        proposalEscrow: proposalEscrow.toString(),
        programAuthority: programAuthority.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating initialize proposal escrow transaction:", error);
    return { 
      success: false, 
      message: `Error creating initialize proposal escrow transaction: ${error.message || error}` 
    };
  }
}

// === Create Proposal Transaction ===
export async function createProposalTransaction(
  userPublicKey: string,
  proposalId: number,
  title: string,
  description: string,
  proposalType: number,
  executionData: number[],
  votingPeriod: number
) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposerStakingAccount] = getUserStakePda(program.programId, userPubKey);
  const [proposerGovernanceAccount] = getGovernancePda(program.programId, userPubKey);
  const [proposalAccount] = getProposalPda(program.programId, proposalId);
  const [depositEscrowAccount] = getProposalEscrowPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Get proposer's token account
  const proposerTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    userPubKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .createProposal(
        new anchor.BN(proposalId),
        title,
        description,
        getProposalTypeEnum(proposalType),
        Buffer.from(executionData),
        votingPeriod
      )
      .accounts({
        proposer: userPubKey,
        proposerStakingAccount: proposerStakingAccount,
        proposerGovernanceAccount: proposerGovernanceAccount,
        proposalAccount: proposalAccount,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        proposerTokenAccount: proposerTokenAccount,
        depositEscrowAccount: depositEscrowAccount,
        depositTokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Create proposal transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        proposalAccount: proposalAccount.toString(),
        proposerStakingAccount: proposerStakingAccount.toString(),
        proposerGovernanceAccount: proposerGovernanceAccount.toString(),
        proposerTokenAccount: proposerTokenAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating proposal transaction:", error);
    return { 
      success: false, 
      message: `Error creating proposal transaction: ${error.message || error}` 
    };
  }
}

// === Create Cast Vote Transaction ===
export async function createCastVoteTransaction(
  userPublicKey: string,
  proposalId: number,
  voteChoice: VoteChoice
) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  // Get all required PDAs
  const [userStakingAccount] = getUserStakePda(program.programId, userPubKey);
  const [governanceAccount] = getGovernancePda(program.programId, userPubKey);
  const [proposalAccount] = getProposalPda(program.programId, proposalId);
  const [voteRecord] = getVoteRecordPda(program.programId, proposalId, userPubKey);

  // Convert VoteChoice enum to the format expected by Anchor
  let voteChoiceAnchor: any;
  switch (voteChoice) {
    case VoteChoice.Yes:
      voteChoiceAnchor = { yes: {} };
      break;
    case VoteChoice.No:
      voteChoiceAnchor = { no: {} };
      break;
    case VoteChoice.Abstain:
      voteChoiceAnchor = { abstain: {} };
      break;
    default:
      throw new Error("Invalid vote choice");
  }

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .castVote(voteChoiceAnchor)
      .accounts({
        voter: userPubKey,
        userStakingAccount: userStakingAccount,
        governanceAccount: governanceAccount,
        proposalAccount: proposalAccount,
        voteRecord: voteRecord,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Cast vote transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        voteRecord: voteRecord.toString(),
        proposalAccount: proposalAccount.toString(),
        userStakingAccount: userStakingAccount.toString(),
        governanceAccount: governanceAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating cast vote transaction:", error);
    return { 
      success: false, 
      message: `Error creating cast vote transaction: ${error.message || error}` 
    };
  }
}

export async function getProposalInfo(proposalId: number) {
  const { program } = getProgram();
  const [proposalAccount] = getProposalPda(program.programId, proposalId);

  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    
    return {
      success: true,
      data: {
        proposalId: proposalData.proposalId,
        title: proposalData.title,
        description: proposalData.description,
        proposer: proposalData.proposer.toString(),
        proposalType: proposalData.proposalType,
        status: proposalData.status,
        votingPeriodDays: proposalData.votingPeriodDays,
        createdAt: Number(proposalData.createdAt),
        votingEndsAt: Number(proposalData.votingEndsAt),
        finalizedAt: Number(proposalData.finalizedAt),
        executedAt: Number(proposalData.executedAt),
        timelockEnd: Number(proposalData.timelockEnd),
        votes: {
          yes: Number(proposalData.yesVotes),
          no: Number(proposalData.noVotes),
          abstain: Number(proposalData.abstainVotes),
        },
        totalVoters: proposalData.totalVoters,
        depositAmount: Number(proposalData.depositAmount) / 1_000_000,
        depositRefunded: proposalData.depositRefunded,
        proposalAccount: proposalAccount.toString(),
      }
    };
  } catch (error) {
    console.error(`Error fetching proposal #${proposalId}:`, error);
    return { success: false, error: `Proposal #${proposalId} does not exist` };
  }
}

export async function getAllProposals(maxProposalId: number = 10) {
  const { program } = getProgram();
  const proposals = [];

  for (let i = 0; i <= maxProposalId; i++) {
    try {
      const [proposalAccount] = getProposalPda(program.programId, i);
      const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
      
      proposals.push({
        proposalId: i,
        title: proposalData.title,
        proposer: proposalData.proposer.toString(),
        status: proposalData.status,
        votingEndsAt: Number(proposalData.votingEndsAt),
        totalVotes: Number(proposalData.yesVotes) + 
                    Number(proposalData.noVotes) + 
                    Number(proposalData.abstainVotes),
      });
    } catch (error: any) {
      // Proposal doesn't exist, skip
      continue;
    }
  }

  return {
    success: true,
    count: proposals.length,
    proposals,
  };
}

export async function getAllProposalsUsingGPA(): Promise<GetAllProposalsResponse> {
  const { program } = getProgram();

  try {
    console.log('📥 Fetching all proposals using getProgramAccounts...');
    
    // Fetch all proposal accounts at once
    const proposals = await program.account.proposalAccount.all();

    console.log(`✅ Found ${proposals.length} proposals`);

    const formattedProposals: ProposalAccount[] = proposals.map(({ account, publicKey }) => {
      // Use type assertion with your existing ProposalInfo type
      const proposalData = account as unknown as ProposalInfo;
      
      return {
        publicKey: publicKey.toString(),
        proposalId: Number(proposalData.proposalId),
        title: proposalData.title,
        description: proposalData.description,
        proposer: proposalData.proposer.toString(),
        status: Object.keys(proposalData.status)[0],
        proposalType: Object.keys(proposalData.proposalType)[0],
        votingPeriodDays: proposalData.votingPeriodDays,
        createdAt: Number(proposalData.createdAt),
        votingEndsAt: Number(proposalData.votingEndsAt),
        finalizedAt: Number(proposalData.finalizedAt),
        executedAt: Number(proposalData.executedAt),
        timelockEnd: Number(proposalData.timelockEnd),
        yesVotes: Number(proposalData.yesVotes),
        noVotes: Number(proposalData.noVotes),
        abstainVotes: Number(proposalData.abstainVotes),
        totalVoters: proposalData.totalVoters,
        depositAmount: Number(proposalData.depositAmount),
        depositRefunded: proposalData.depositRefunded,
      };
    });

    // Sort by proposal ID (ascending)
    formattedProposals.sort((a, b) => a.proposalId - b.proposalId);

    return {
      success: true,
      count: formattedProposals.length,
      proposals: formattedProposals,
    };
  } catch (error) {
    console.error('❌ Error fetching proposals:', error);
    throw error;
  }
}

export async function getVoteRecord(proposalId: number, userPublicKey: string) {
  const { program } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);
  const [voteRecord] = getVoteRecordPda(program.programId, proposalId, userPubKey);

  try {
    const voteData = await program.account.voteRecord.fetch(voteRecord) as VoteRecord;
    
    const voteChoice = Object.keys(voteData.voteChoice)[0];
    
    return {
      success: true,
      data: {
        voter: voteData.voter.toString(),
        proposalId: voteData.proposalId.toString(),
        voteChoice: voteChoice,
        votingPower: voteData.votingPower.toString(),
        votedAt: voteData.votedAt.toNumber(),
        votedAtDate: new Date(voteData.votedAt.toNumber() * 1000).toISOString(),
      },
      voteRecordAddress: voteRecord.toString(),
    };
  } catch (error: any) {
    console.error("Error fetching vote record:", error);
    return { success: false, error: 'User has not voted on this proposal' };
  }
}

// === Create Finalize Proposal Transaction ===
export async function createFinalizeProposalTransaction(
  userPublicKey: string,
  proposalId: number
) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposalAccount] = getProposalPda(program.programId, proposalId);
  const [depositEscrowAccount] = getProposalEscrowPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Get proposer's token account for potential deposit refund
  // We need to fetch the proposal first to get the proposer
  let proposerTokenAccount: PublicKey;
  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    proposerTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      new PublicKey(proposalData.proposer),
      false,
      TOKEN_2022_PROGRAM_ID
    );
  } catch (error: any) {
    throw new Error(`Proposal #${proposalId} does not exist`);
  }

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .finalizeProposal()
      .accounts({
        finalizer: userPubKey,
        proposalAccount: proposalAccount,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        depositEscrowAccount: depositEscrowAccount,
        proposerTokenAccount: proposerTokenAccount,
        tokenMint: tokenMintAddress,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Finalize proposal transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        proposalAccount: proposalAccount.toString(),
        stakingPool: stakingPool.toString(),
        programAuthority: programAuthority.toString(),
        depositEscrowAccount: depositEscrowAccount.toString(),
        proposerTokenAccount: proposerTokenAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating finalize proposal transaction:", error);
    return { 
      success: false, 
      message: `Error creating finalize proposal transaction: ${error.message || error}` 
    };
  }
}

// === Get Proposal Finalization Status ===
export async function getProposalFinalizationStatus(proposalId: number) {
  const { program } = getProgram();
  const [proposalAccount] = getProposalPda(program.programId, proposalId);

  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const currentTime = Math.floor(Date.now() / 1000);
    const status = Object.keys(proposalData.status)[0];

    // Convert BN to number
    const votingEndsAtNum = typeof proposalData.votingEndsAt === 'number' 
      ? proposalData.votingEndsAt 
      : Number(proposalData.votingEndsAt);
    
    const finalizedAtNum = typeof proposalData.finalizedAt === 'number'
      ? proposalData.finalizedAt
      : Number(proposalData.finalizedAt);

    const canFinalize = 
      status === 'active' && 
      currentTime >= votingEndsAtNum &&
      finalizedAtNum === 0;

    const timeUntilVotingEnds = votingEndsAtNum - currentTime;
    const isVotingEnded = timeUntilVotingEnds <= 0;

    return {
      success: true,
      data: {
        proposalId: proposalId,
        currentStatus: status,
        canFinalize: canFinalize,
        votingEnded: isVotingEnded,
        alreadyFinalized: finalizedAtNum !== 0,
        votingEndsAt: votingEndsAtNum,
        finalizedAt: finalizedAtNum !== 0 ? finalizedAtNum : null,
        timeUntilVotingEnds: !isVotingEnded ? timeUntilVotingEnds : 0,
        votes: {
          yes: proposalData.yesVotes.toString(),
          no: proposalData.noVotes.toString(),
          abstain: proposalData.abstainVotes.toString(),
          totalVoters: proposalData.totalVoters,
        },
      }
    };
  } catch (error: any) {
    console.error("Error fetching proposal finalization status:", error);
    if (error.message && error.message.includes("Account does not exist")) {
      return { 
        success: false, 
        error: `Proposal #${proposalId} does not exist` 
      };
    }
    return { 
      success: false, 
      error: error.message || 'Failed to fetch proposal finalization status' 
    };
  }
}
