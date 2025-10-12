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

import { UserStakingAccount, GovernanceAccount, VoteRecord, VoteChoice, ProposalInfo } from "../types/types";
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
import { getMockWalletKeypair } from "../utils/mockWallets";
import { 
  MIN_STAKE_TO_PROPOSE,
  MIN_STAKE_DURATION_TO_PROPOSE,
  PROPOSAL_DEPOSIT_AMOUNT
} from "../utils/constants";
import { getProposalTypeEnum } from "../utils/helpers";

// ============================================================================
// PROPOSAL MODULE
// ============================================================================



// === Initialize Proposal Escrow (One-time setup) ===
export async function initializeProposalEscrow() {
  const { program, adminKeypair } = getProgram();

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposalEscrow] = getProposalEscrowPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  console.log("Initializing proposal escrow account...");
  console.log(`Proposal Escrow PDA: ${proposalEscrow.toString()}`);
  console.log(`Program Authority: ${programAuthority.toString()}`);

  try {
    const tx = await program.methods
      .initializeProposalEscrow()
      .accounts({
        admin: adminKeypair.publicKey,
        stakingPool: stakingPool,
        programAuthority: programAuthority,
        proposalEscrow: proposalEscrow,
        tokenMint: tokenMintAddress,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      })
      .signers([adminKeypair])
      .rpc();

    console.log("✅ Proposal escrow initialized successfully!");
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      proposalEscrow: proposalEscrow,
      programAuthority: programAuthority,
    };
  } catch (error) {
    console.error("Error initializing proposal escrow:", error);
    throw error;
  }
}

// === Create Proposal ===
export async function createProposal(
  proposalId: number,
  title: string,
  description: string,
  proposalType: number, // 0=Text, 1=TreasuryTransfer, 2=ParameterUpdate
  executionData: number[], // Array of bytes
  votingPeriod: number, // 0 (short), 1 (medium), or 2 (long)
  userKeypair?: Keypair
) {
  const { program, connection, adminKeypair } = getProgram();
  const proposer = userKeypair || adminKeypair;

  console.log(`Creating proposal #${proposalId} by ${proposer.publicKey.toString()}`);

  // Get all required PDAs
  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposerStakingAccount] = getUserStakePda(program.programId, proposer.publicKey);
  const [proposerGovernanceAccount] = getGovernancePda(program.programId, proposer.publicKey);
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
    proposer.publicKey,
    false,
    TOKEN_2022_PROGRAM_ID
  );

  // Validate proposer meets requirements
  try {
    const stakingInfo = await program.account.userStakingAccount.fetch(proposerStakingAccount) as UserStakingAccount;
    const stakedAmount = stakingInfo.stakedAmount.toNumber();
    const stakeDuration = Math.floor(Date.now() / 1000) - stakingInfo.timestamp.toNumber();

    console.log(`Proposer staked amount: ${stakedAmount / 1_000_000} ZSNIPE`);
    console.log(`Stake duration: ${Math.floor(stakeDuration / 86400)} days`);

    if (stakedAmount < MIN_STAKE_TO_PROPOSE) {
      throw new Error(
        `Insufficient stake. Need ${MIN_STAKE_TO_PROPOSE / 1_000_000} ZSNIPE, have ${stakedAmount / 1_000_000}`
      );
    }

    if (stakeDuration < MIN_STAKE_DURATION_TO_PROPOSE) {
      throw new Error(
        `Insufficient stake duration. Need 30 days, have ${Math.floor(stakeDuration / 86400)} days`
      );
    }
  } catch (error: any) {
    if (error.message.includes("Account does not exist")) {
      throw new Error("User must stake tokens before creating proposals");
    }
    throw error;
  }

  // Check governance account exists
  try {
    await program.account.governanceAccount.fetch(proposerGovernanceAccount);
  } catch (error) {
    throw new Error("User must initialize governance account before creating proposals");
  }

  // Validate inputs
  if (title.length > 100) {
    throw new Error("Title too long (max 100 characters)");
  }
  if (description.length > 1000) {
    throw new Error("Description too long (max 1000 characters)");
  }
  if (executionData.length > 500) {
    throw new Error("Execution data too large (max 500 bytes)");
  }
  if (![0, 1, 2].includes(votingPeriod)) {
    throw new Error("Voting period must be 0 (short), 1 (medium), or 2 (long)");
  }

  console.log("All validations passed, creating proposal...");

  try {
    const tx = await program.methods
      .createProposal(
        new anchor.BN(proposalId),
        title,
        description,
        getProposalTypeEnum(proposalType), // ProposalType enum - adjust based on proposalType param
        Buffer.from(executionData),
        votingPeriod
      )
      .accounts({
        proposer: proposer.publicKey,
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
      .signers([proposer])
      .rpc();

    console.log(`✅ Proposal #${proposalId} created successfully!`);
    console.log(`Transaction: ${tx}`);

    return {
      success: true,
      transactionId: tx,
      proposalId: proposalId,
      proposalAccount: proposalAccount,
      title: title,
      proposer: proposer.publicKey,
    };
  } catch (error) {
    console.error("Error creating proposal:", error);
    throw error;
  }
}

// === Get Proposal Info ===
export async function getProposalInfo(proposalId: number) {
  const { program } = getProgram();
  const [proposalAccount] = getProposalPda(program.programId, proposalId);

  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    
    console.log(`=== Proposal #${proposalId} Information ===`);
    console.log(`Title: ${proposalData.title}`);
    console.log(`Description: ${proposalData.description}`);
    console.log(`Proposer: ${proposalData.proposer.toString()}`);
    console.log(`Status: ${JSON.stringify(proposalData.status)}`);
    console.log(`Type: ${JSON.stringify(proposalData.proposalType)}`);
    console.log(`Created: ${new Date(Number(proposalData.createdAt) * 1000)}`);
    console.log(`Voting Ends: ${new Date(Number(proposalData.votingEndsAt) * 1000)}`);
    console.log(`Voting Period: ${proposalData.votingPeriodDays} days`);
    console.log(`Yes Votes: ${proposalData.yesVotes.toString()}`);
    console.log(`No Votes: ${proposalData.noVotes.toString()}`);
    console.log(`Abstain Votes: ${proposalData.abstainVotes.toString()}`);
    console.log(`Total Voters: ${proposalData.totalVoters}`);
    console.log(`Deposit: ${proposalData.depositAmount / 1_000_000} ZSNIPE`);
    console.log(`Deposit Refunded: ${proposalData.depositRefunded}`);

    return {
      success: true,
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
      executionData: proposalData.executionData, // Add this line
    };
  } catch (error) {
    console.error(`Error fetching proposal #${proposalId}:`, error);
    throw error;
  }
}

// === List All Proposals (helper function) ===
export async function getAllProposals(maxProposalId: number = 10) {
  const { program } = getProgram();
  const proposals = [];

  console.log(`Fetching proposals 0-${maxProposalId}...`);

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
    } catch (error) {
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

// === Cast Vote ===
export async function castVote(
  proposalId: number,
  voteChoice: VoteChoice,
  userKeypair?: Keypair
) {

  const { program, adminKeypair } = getProgram();
  const voter = userKeypair || adminKeypair;

  console.log(`Casting vote on proposal #${proposalId} by ${voter.publicKey.toString()}`);
  console.log(`Vote choice: ${VoteChoice[voteChoice]}`);

    // Get all required PDAs
    const [userStakingAccount] = getUserStakePda(program.programId, voter.publicKey);
    const [governanceAccount] = getGovernancePda(program.programId, voter.publicKey);
    const [proposalAccount] = getProposalPda(program.programId, proposalId);
    const [voteRecord] = getVoteRecordPda(program.programId, proposalId, voter.publicKey);

      // Pre-flight checks
  try {
    // Check if user has staked
    const stakingInfo = await program.account.userStakingAccount.fetch(userStakingAccount) as UserStakingAccount;
    const stakeDuration = Math.floor(Date.now() / 1000) - stakingInfo.timestamp.toNumber();
    const stakeDurationDays = Math.floor(stakeDuration / 86400);

    console.log(`Stake duration: ${stakeDurationDays} days`);

    if (stakeDuration < 0 * 86400) { // Using test value of 1 day
      throw new Error(`Insufficient stake duration. Need 1 day, have ${stakeDurationDays} days`);
    }
  } catch (error: any) {
    if (error.message.includes("Account does not exist")) {
      throw new Error("User must stake tokens before voting");
    }
    throw error;
  }

    // Check if governance account exists and has voting power
    try {
      const govAccount = await program.account.governanceAccount.fetch(governanceAccount) as GovernanceAccount;
      
      if (govAccount.votingPowerCache.toNumber() === 0) {
        throw new Error("Voting power not calculated. Call calculate_voting_power first");
      }
  
      console.log(`Voting power: ${govAccount.votingPowerCache.toString()}`);
    } catch (error: any) {
      if (error.message.includes("Account does not exist")) {
        throw new Error("Governance account not initialized. Initialize governance account first");
      }
      throw error;
    }

      // Check if proposal exists and is active
  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const status = Object.keys(proposalData.status)[0];
    
    if (status !== 'active') {
      throw new Error(`Proposal is not active. Current status: ${status}`);
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime >= proposalData.votingEndsAt) {
      throw new Error("Voting period has ended");
    }

    console.log(`Proposal status: Active`);
    console.log(`Voting ends at: ${new Date(proposalData.votingEndsAt * 1000)}`);
  } catch (error: any) {
    if (error.message.includes("Account does not exist")) {
      throw new Error(`Proposal #${proposalId} does not exist`);
    }
    throw error;
  }

    // Check if user already voted
    try {
      await program.account.voteRecord.fetch(voteRecord) as VoteRecord;
      throw new Error("You have already voted on this proposal. Vote changes are not allowed.");
    } catch (error: any) {
      if (!error.message.includes("Account does not exist")) {
        // If it's not "account doesn't exist", it means they already voted
        throw error;
      }
      // If account doesn't exist, that's good - user hasn't voted yet
    }

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

  console.log("All validations passed, casting vote...");

  try {
    const tx = await program.methods
      .castVote(voteChoiceAnchor)
      .accounts({
        voter: voter.publicKey,
        userStakingAccount: userStakingAccount,
        governanceAccount: governanceAccount,
        proposalAccount: proposalAccount,
        voteRecord: voteRecord,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter])
      .rpc();

      console.log(`✅ Vote cast successfully!`);
      console.log(`Transaction: ${tx}`);

         // Fetch updated proposal to show vote counts
    const updatedProposal = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;

    return {
      success: true,
      transactionId: tx,
      proposalId: proposalId,
      voteChoice: VoteChoice[voteChoice],
      voter: voter.publicKey.toString(),
      voteRecord: voteRecord.toString(),
      updatedVotes: {
        yes: updatedProposal.yesVotes.toString(),
        no: updatedProposal.noVotes.toString(),
        abstain: updatedProposal.abstainVotes.toString(),
        totalVoters: updatedProposal.totalVoters
      }
    };
  } catch (error) {
    console.error("Error casting vote:", error);
    throw error;
  }
}

export async function getVoteRecord(
  proposalId: number,
  userKeypair?: Keypair
) {
  const { program, adminKeypair } = getProgram();
  const voter = userKeypair || adminKeypair;

  const [voteRecord] = getVoteRecordPda(program.programId, proposalId, voter.publicKey);

  try {
    const voteData = await program.account.voteRecord.fetch(voteRecord) as VoteRecord;
    
    const voteChoice = Object.keys(voteData.voteChoice)[0];
    
    console.log(`=== Vote Record for Proposal #${proposalId} ===`);
    console.log(`Voter: ${voteData.voter.toString()}`);
    console.log(`Vote Choice: ${voteChoice}`);
    console.log(`Voting Power Used: ${voteData.votingPower.toString()}`);
    console.log(`Voted At: ${new Date(voteData.votedAt.toNumber() * 1000)}`);
    return {
      success: true,
      voteRecord: {
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
    if (error.message && error.message.includes("Account does not exist")) {
      return {
        success: false,
        message: "User has not voted on this proposal",
        voter: voter.publicKey.toString(),
        proposalId: proposalId,
      };
    }
    console.error("Error fetching vote record:", error);
    throw error;
  }
}

export async function bulkCastVote(
  proposalId: number,
  voteChoice: VoteChoice,
  walletNumbers?: number[]
) {
  const targetWallets = walletNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const results = [];

  console.log(`Bulk casting ${VoteChoice[voteChoice]} votes on proposal #${proposalId} for wallets: ${targetWallets.join(', ')}`);

  for (const walletNum of targetWallets) {
    try {
      const wallet = getMockWalletKeypair(walletNum);
      const result = await castVote(proposalId, voteChoice, wallet);
      results.push({
        walletNumber: walletNum,
        success: true,
        transactionId: result.transactionId,
        voteChoice: VoteChoice[voteChoice],
      });
    } catch (error: any) {
      results.push({
        walletNumber: walletNum,
        success: false,
        error: error.message,
      });
    }
  }
  return {
    success: true,
    operation: 'bulk_cast_vote',
    proposalId: proposalId,
    voteChoice: VoteChoice[voteChoice],
    results: results,
  };
}

// === Finalize Proposal ===
export async function finalizeProposal(
  proposalId: number,
  userKeypair?: Keypair
) {
  const { program, adminKeypair } = getProgram();
  const finalizer = userKeypair || adminKeypair;

  console.log(`Finalizing proposal #${proposalId} by ${finalizer.publicKey.toString()}`);

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

  // Pre-flight checks
  try {
    // Check if proposal exists
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const status = Object.keys(proposalData.status)[0];

    // Convert BN to numbers FIRST
    const votingEndsAtNum = typeof proposalData.votingEndsAt === 'number' 
      ? proposalData.votingEndsAt 
      : Number(proposalData.votingEndsAt);

    const finalizedAtNum = typeof proposalData.finalizedAt === 'number'
      ? proposalData.finalizedAt
      : Number(proposalData.finalizedAt);

    console.log(`Proposal status: ${status}`);
    console.log(`Voting ends at: ${new Date(votingEndsAtNum * 1000)}`);

    // Check if proposal is still active
    if (status !== 'active') {
      throw new Error(`Proposal is not active. Current status: ${status}`);
    }

    // Check if voting period has ended
    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < votingEndsAtNum) {  // Use converted number
      const timeRemaining = votingEndsAtNum - currentTime;
      const hoursRemaining = Math.floor(timeRemaining / 3600);
      const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
      throw new Error(
        `Voting period has not ended yet. ${hoursRemaining}h ${minutesRemaining}m remaining`
      );
    }

// Check if already finalized
if (finalizedAtNum !== 0) {  // Use converted number
  throw new Error("Proposal has already been finalized");
}

    // Get proposer's token account for potential deposit refund
    const proposerTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      new PublicKey(proposalData.proposer),
      false,
      TOKEN_2022_PROGRAM_ID
    );

    console.log("All validations passed, finalizing proposal...");
    console.log(`Vote counts - Yes: ${proposalData.yesVotes.toString()}, No: ${proposalData.noVotes.toString()}, Abstain: ${proposalData.abstainVotes.toString()}`);

    try {
      const tx = await program.methods
        .finalizeProposal()
        .accounts({
          finalizer: finalizer.publicKey,
          proposalAccount: proposalAccount,
          stakingPool: stakingPool,
          programAuthority: programAuthority,
          depositEscrowAccount: depositEscrowAccount,
          proposerTokenAccount: proposerTokenAccount,
          tokenMint: tokenMintAddress,
          tokenProgram: TOKEN_2022_PROGRAM_ID,
        })
        .signers([finalizer])
        .rpc();

      console.log(`✅ Proposal #${proposalId} finalized successfully!`);
      console.log(`Transaction: ${tx}`);

// Fetch updated proposal to show final results
    const updatedProposal = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const finalStatus = Object.keys(updatedProposal.status)[0];

    // Convert BN to numbers
    const finalizedAtNum = typeof updatedProposal.finalizedAt === 'number'
      ? updatedProposal.finalizedAt
      : Number(updatedProposal.finalizedAt);

    const timelockEndNum = typeof updatedProposal.timelockEnd === 'number'
      ? updatedProposal.timelockEnd
      : Number(updatedProposal.timelockEnd);

    console.log(`Final status: ${finalStatus}`);
    console.log(`Finalized at: ${new Date(finalizedAtNum * 1000)}`);

    if (finalStatus === 'passed') {
      console.log(`Timelock ends at: ${new Date(timelockEndNum * 1000)}`);
    }

    if (updatedProposal.depositRefunded) {
      console.log(`Deposit refunded: ${updatedProposal.depositAmount / 1_000_000} ZSNIPE`);
    }

    return {
      success: true,
      transactionId: tx,
      proposalId: proposalId,
      finalStatus: finalStatus,
      finalizedAt: finalizedAtNum,  // Use converted number
      timelockEnd: timelockEndNum !== 0 ? timelockEndNum : null,  // Use converted number
      depositRefunded: updatedProposal.depositRefunded,
      votes: {
        yes: updatedProposal.yesVotes.toString(),
        no: updatedProposal.noVotes.toString(),
        abstain: updatedProposal.abstainVotes.toString(),
        totalVoters: updatedProposal.totalVoters,
      },
    };
    } catch (error) {
      console.error("Error finalizing proposal:", error);
      throw error;
    }
  } catch (error: any) {
    if (error.message && error.message.includes("Account does not exist")) {
      throw new Error(`Proposal #${proposalId} does not exist`);
    }
    throw error;
  }
}

// === Get Proposal Finalization Status (helper) ===
export async function getProposalFinalizationStatus(proposalId: number) {
  const { program } = getProgram();
  const [proposalAccount] = getProposalPda(program.programId, proposalId);

  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const currentTime = Math.floor(Date.now() / 1000);
    const status = Object.keys(proposalData.status)[0];

    // CRITICAL FIX: Convert BN to number
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

    console.log(`=== Finalization Status for Proposal #${proposalId} ===`);
    console.log(`Current Status: ${status}`);
    console.log(`Voting Ended: ${isVotingEnded}`);
    console.log(`Already Finalized: ${finalizedAtNum !== 0}`);
    console.log(`Can Finalize: ${canFinalize}`);

    if (!isVotingEnded) {
      const hoursRemaining = Math.floor(timeUntilVotingEnds / 3600);
      const minutesRemaining = Math.floor((timeUntilVotingEnds % 3600) / 60);
      console.log(`Time until voting ends: ${hoursRemaining}h ${minutesRemaining}m`);
    }

    return {
      success: true,
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
    };
  } catch (error: any) {
    if (error.message && error.message.includes("Account does not exist")) {
      throw new Error(`Proposal #${proposalId} does not exist`);
    }
    throw error;
  }
}
