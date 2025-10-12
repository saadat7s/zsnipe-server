import {
  Connection,
  Keypair,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction
} from "@solana/web3.js";

import * as anchor from "@coral-xyz/anchor";
import { 
  ASSOCIATED_TOKEN_PROGRAM_ID, 
  TOKEN_2022_PROGRAM_ID, 
  getAssociatedTokenAddressSync,
  createTransferInstruction
} from "@solana/spl-token";

import { StakingPool, UserStakingAccount, GovernanceAccount, VoteRecord, VoteChoice, ProposalInfo } from "../types";
import {
  getStakingPoolPda,
  getProgramAuthorityPda,
  getUserStakePda,
  getEscrowTokenAccountPda,
  getGovernancePda,
  getGovernanceConfigPda,
  getProposalPda,
  getProposalEscrowPda,
  getTreasuryPda,
  getVoteRecordPda,
} from "./getPDAs";
import { getProgram } from "./getProgram";
import { 
  MIN_STAKE_DURATION_FOR_VOTING,
  MIN_STAKE_TO_PROPOSE,
  MIN_STAKE_DURATION_TO_PROPOSE,
  PROPOSAL_DEPOSIT_AMOUNT
} from "./constants";
import { 
  getProposalTypeEnum,
  buildTextExecutionData,
  buildTreasuryTransferExecutionData,
  buildParameterUpdateExecutionData
} from "./helpers";




// === Initialize Staking Pool (Admin only) ===
export async function createInitializeStakingPoolTransaction(adminPublicKey: PublicKey) {
  const { program, connection } = getProgram()

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(program.programId, stakingPool);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .initializeStakingPool()
      .accounts({
        admin: adminPublicKey,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        escrowTokenAccount: escrowTokenAccount,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .transaction();

    transaction.feePayer = adminPublicKey;  
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Initialize staking pool transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        stakingPool: stakingPool.toString(),
        programAuthority: programAuthority.toString(),
        escrowTokenAccount: escrowTokenAccount.toString(),
        tokenMint: tokenMintAddress.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating initialize staking pool transaction:", error);
    return { 
      success: false, 
      message: `Error creating initialize staking pool transaction: ${error.message || error}` 
    };
  }
}

// === Create Stake Tokens Transaction ===
export async function 
createStakeTokensTransaction(userPublicKey: string, amount: number) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [userStakingAccount] = getUserStakePda(program.programId, userPubKey);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(program.programId, stakingPool);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Get user's token account (associated token account)
  const stakerTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    userPubKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  try {

    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .stake(new anchor.BN(amount * Math.pow(10, 6)))
      .accounts({
        staker: userPubKey,
        stakingPool: stakingPool,
        userStakingAccount: userStakingAccount,
        programAuthority: programAuthority,
        escrowTokenAccount: escrowTokenAccount,
        stakerTokenAccount: stakerTokenAccount,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .transaction();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userPubKey;

    return {
      success: true,
      message: "Stake tokens transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        userStakingAccount: userStakingAccount.toString(),
        stakingPool: stakingPool.toString(),
        escrowTokenAccount: escrowTokenAccount.toString(),
        stakerTokenAccount: stakerTokenAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating stake tokens transaction:", error);
    return { 
      success: false, 
      message: `Error creating stake tokens transaction: ${error.message || error}` 
    };
  }
}

// === Create Unstake Tokens Transaction ===
export async function createUnstakeTokensTransaction(userPublicKey: string, amount: number) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [userStakingAccount] = getUserStakePda(program.programId, userPubKey);
  const [escrowTokenAccount] = getEscrowTokenAccountPda(program.programId, stakingPool);
  const [governanceAccount] = getGovernancePda(program.programId, userPubKey);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  // Get user's token account (associated token account)
  const stakerTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    userPubKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const accounts: any = {
      staker: userPubKey,
      stakingPool: stakingPool,
      userStakingAccount: userStakingAccount,
      programAuthority: programAuthority,
      escrowTokenAccount: escrowTokenAccount,
      stakerTokenAccount: stakerTokenAccount,
      tokenMint: tokenMintAddress,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    };

    // Add governance account (it may or may not exist)
    accounts.governanceAccount = governanceAccount;

    const transaction = await program.methods
      .unstake(new anchor.BN(amount * Math.pow(10, 6)))
      .accounts(accounts)
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Unstake tokens transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        userStakingAccount: userStakingAccount.toString(),
        stakingPool: stakingPool.toString(),
        escrowTokenAccount: escrowTokenAccount.toString(),
        stakerTokenAccount: stakerTokenAccount.toString(),
        governanceAccount: governanceAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating unstake tokens transaction:", error);
    return { 
      success: false, 
      message: `Error creating unstake tokens transaction: ${error.message || error}` 
    };
  }
}

// === Create Initialize Governance Account Transaction ===
export async function createInitializeGovernanceAccountTransaction(userPublicKey: string) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  const [governanceAccount] = getGovernancePda(program.programId, userPubKey);

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .initializeGovernanceAccount()
      .accounts({
        staker: userPubKey,
        governanceAccount: governanceAccount,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Initialize governance account transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        governanceAccount: governanceAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating initialize governance account transaction:", error);
    return { 
      success: false, 
      message: `Error creating initialize governance account transaction: ${error.message || error}` 
    };
  }
}

// === Create Calculate Voting Power Transaction ===
export async function createCalculateVotingPowerTransaction(userPublicKey: string) {
  const { program, connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  const [userStakingAccount] = getUserStakePda(program.programId, userPubKey);
  const [governanceAccount] = getGovernancePda(program.programId, userPubKey);

  try {
    const { blockhash } = await connection.getLatestBlockhash("finalized");

    const transaction = await program.methods
      .calculateVotingPower()
      .accounts({
        staker: userPubKey,
        userStakingAccount: userStakingAccount,
        governanceAccount: governanceAccount,
      })
      .transaction();

    transaction.feePayer = userPubKey;
    transaction.recentBlockhash = blockhash;

    return {
      success: true,
      message: "Calculate voting power transaction created successfully!",
      transaction: transaction.serialize({ requireAllSignatures: false }).toString('base64'),
      accounts: {
        userStakingAccount: userStakingAccount.toString(),
        governanceAccount: governanceAccount.toString(),
      }
    };
  } catch (error: any) {
    console.error("Error creating calculate voting power transaction:", error);
    return { 
      success: false, 
      message: `Error creating calculate voting power transaction: ${error.message || error}` 
    };
  }
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

// === Get Account Information (Read-only functions) ===
export async function getStakingPoolInfo() {
  const { program } = getProgram();
  const [stakingPool] = getStakingPoolPda(program.programId);

  try {
    const poolInfo = await program.account.stakingPool.fetch(stakingPool) as StakingPool;
    
    return {
      success: true,
      data: {
        authority: poolInfo.authority.toString(),
        initializer: poolInfo.initializer.toString(),
        totalStakedAmount: poolInfo.totalStakedAmount.toString(),
        mintAddress: poolInfo.mintAddress.toString(),
        escrowAccount: poolInfo.escrowAccount.toString(),
        isActive: poolInfo.isActive,
        tokenPriceUsdMicro: poolInfo.tokenPriceUsdMicro.toString(),
        createdAt: poolInfo.createdAt.toNumber(),
        priceLastUpdated: poolInfo.priceLastUpdated.toNumber(),
      }
    };
  } catch (error: any) {
    console.error("Error fetching staking pool info:", error);
    return { success: false, error: error.message || 'Failed to fetch staking pool info' };
  }
}

export async function getUserStakingInfo(userPublicKey: string) {
  const { program } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);
  const [userStakingAccount] = getUserStakePda(program.programId, userPubKey);

  try {
    const stakingInfo = await program.account.userStakingAccount.fetch(userStakingAccount) as UserStakingAccount;
    console.log("stakingInfo", stakingInfo.stakedAmount.toNumber()/1_000_000);
    return {
      success: true,
      data: {
        staker: stakingInfo.staker.toString(),
        stakedAmount: stakingInfo.stakedAmount.toNumber()/1_000_000,
        timestamp: stakingInfo.timestamp.toNumber(),
        lastUpdated: stakingInfo.lastUpdated.toNumber(),
        bump: stakingInfo.bump,
      }
    };
  } catch (error: any) {
    console.error("Error fetching user staking info:", error);
    return { success: false, error: 'User has not staked yet or account does not exist' };
  }
}

export async function getGovernanceAccountInfo(userPublicKey: string) {
  const { program } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);
  const [governanceAccount] = getGovernancePda(program.programId, userPubKey);

  try {
    const govInfo = await program.account.governanceAccount.fetch(governanceAccount) as GovernanceAccount;
    const currentTime = Math.floor(Date.now() / 1000);
    const isLocked = govInfo.stakeLockEnd.toNumber() > currentTime;

    return {
      success: true,
      data: {
        staker: govInfo.staker.toString(),
        participationCount: govInfo.participationCount,
        lastVoteTimestamp: govInfo.lastVoteTimestamp.toNumber(),
        stakeLockEnd: govInfo.stakeLockEnd.toNumber(),
        isCurrentlyLocked: isLocked,
        votingPowerCache: govInfo.votingPowerCache.toNumber(),
        createdAt: govInfo.createdAt.toNumber(),
      }
    };
  } catch (error: any) {
    console.error("Error fetching governance account info:", error);
    return { success: false, error: 'Governance account not initialized' };
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

// === Client-side Voting Power Calculation (for preview) ===
export function calculateHybridVotingPower(stakeAmount: number, stakeDurationDays: number): number {
  // Convert micro-tokens to tokens
  const tokens = stakeAmount / 1_000_000;
  
  let basePower: number;
  if (tokens <= 100_000) {
    basePower = tokens;
  } else {
    basePower = 100_000 + Math.floor(Math.sqrt(tokens - 100_000));
  }

  let timeMultiplier: number;
  if (stakeDurationDays <= 30) {
    timeMultiplier = 100;
  } else if (stakeDurationDays <= 90) {
    timeMultiplier = 120;
  } else if (stakeDurationDays <= 365) {
    timeMultiplier = 150;
  } else {
    timeMultiplier = 200;
  }

  return Math.floor((basePower * timeMultiplier) / 100);
}

// === Check Voting Eligibility ===
export async function checkVotingEligibility(userPublicKey: string) {
  const { program } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);
  const [userStakingAccount] = getUserStakePda(program.programId, userPubKey);

  try {
    const stakingInfo = await program.account.userStakingAccount.fetch(userStakingAccount) as UserStakingAccount;
    const currentTime = Math.floor(Date.now() / 1000);
    const stakeTimestamp = stakingInfo.timestamp.toNumber();
    const stakeDurationSeconds = currentTime - stakeTimestamp;
    const stakeDurationDays = Math.floor(stakeDurationSeconds / (24 * 60 * 60));

    const isEligible = stakeDurationSeconds >= MIN_STAKE_DURATION_FOR_VOTING;
    const stakedAmount = stakingInfo.stakedAmount.toNumber();

    return {
      success: true,
      data: {
        isEligible: isEligible,
        stakedAmount: stakedAmount,
        stakeDurationDays: stakeDurationDays,
        minimumDaysRequired: 30,
        estimatedVotingPower: isEligible ? calculateHybridVotingPower(stakedAmount, stakeDurationDays) : 0,
      }
    };
  } catch (error: any) {
    console.error("Error checking voting eligibility:", error);
    if (error.message && error.message.includes("Account does not exist")) {
      return {
        success: false,
        data: {
          isEligible: false,
          message: "User has not staked any tokens yet",
        }
      };
    }
    return { success: false, error: error.message || 'Failed to check voting eligibility' };
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

// === Check User Token Balance ===
export async function checkUserTokenBalance(userPublicKey: string) {
  const { connection } = getProgram();
  const userPubKey = new PublicKey(userPublicKey);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  const userTokenAccount = getAssociatedTokenAddressSync(
    tokenMintAddress,
    userPubKey,
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
        success: true,
        data: {
          balance: tokenBalance.uiAmount,
          decimals: tokenBalance.decimals,
          tokenAccount: userTokenAccount.toString(),
          tokenMint: tokenMintAddress.toString(),
          userPublicKey: userPubKey.toString()
        }
      };
    } else {
      console.log("User token account doesn't exist");
      return {
        success: true,
        data: {
          balance: 0,
          rawBalance: "0",
          decimals: 6,
          tokenAccount: userTokenAccount.toString(),
          tokenMint: tokenMintAddress.toString(),
          userPublicKey: userPubKey.toString(),
          message: "Token account does not exist - user has no tokens"
        }
      };
    }
  } catch (error: any) {
    console.error("Error checking user token balance:", error);
    return { 
      success: false, 
      error: error.message || 'Failed to check user token balance' 
    };
  }
}

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
  const { program } = getProgram();
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [treasuryAccount] = getTreasuryPda(program.programId, stakingPool);

  return {
    success: true,
    data: {
      address: treasuryAccount.toString(),
    }
  };
}
