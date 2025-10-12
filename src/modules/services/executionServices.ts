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

import {
  getStakingPoolPda,
  getProgramAuthorityPda,
  getProposalPda,
  getProposalEscrowPda,
  getGovernanceConfigPda,
} from "../utils/getPDAs";
import { getProgram } from "../utils/getProgram";
import { 
  decodeTreasuryTransferExecutionData,
  decodeParameterUpdateExecutionData
} from "../utils/helpers";

// ============================================================================
// EXECUTION MODULE
// ============================================================================

// === Execute Proposal ===
export async function executeProposal(
  proposalId: number,
  userKeypair?: Keypair,
  treasuryAccount?: PublicKey,
  recipientAccount?: PublicKey,
  governanceConfigPda?: PublicKey
) {
  const { program, adminKeypair } = getProgram();
  const executor = userKeypair || adminKeypair;

  console.log(`Executing proposal #${proposalId} by ${executor.publicKey.toString()}`);

  const [stakingPool] = getStakingPoolPda(program.programId);
  const [programAuthority] = getProgramAuthorityPda(program.programId);
  const [proposalAccount] = getProposalPda(program.programId, proposalId);
  const [depositEscrowAccount] = getProposalEscrowPda(program.programId);

  const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
  if (!tokenMint) {
    throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
  }
  const tokenMintAddress = new PublicKey(tokenMint);

  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const status = Object.keys(proposalData.status)[0];
    const proposalType = Object.keys(proposalData.proposalType)[0];

    // Convert BN to numbers
    const timelockEndNum = typeof proposalData.timelockEnd === 'number'
      ? proposalData.timelockEnd
      : Number(proposalData.timelockEnd);

    const executedAtNum = typeof proposalData.executedAt === 'number'
      ? proposalData.executedAt
      : Number(proposalData.executedAt);

    console.log(`Proposal status: ${status}`);
    console.log(`Proposal type: ${proposalType}`);
    console.log(`Timelock ends at: ${new Date(timelockEndNum * 1000)}`);

    if (status !== 'passed') {
      throw new Error(`Proposal has not passed. Current status: ${status}`);
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime < timelockEndNum) {
      const timeRemaining = timelockEndNum - currentTime;
      const hoursRemaining = Math.floor(timeRemaining / 3600);
      const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
      throw new Error(
        `Timelock has not expired yet. ${hoursRemaining}h ${minutesRemaining}m remaining`
      );
    }

    if (executedAtNum !== 0) {
      throw new Error("Proposal has already been executed");
    }

    const proposerTokenAccount = getAssociatedTokenAddressSync(
      tokenMintAddress,
      new PublicKey(proposalData.proposer),
      false,
      TOKEN_2022_PROGRAM_ID
    );

    console.log("All validations passed, executing proposal...");

    // BUILD BASE ACCOUNTS - Required for all proposal types
    const [governanceConfig] = getGovernanceConfigPda(program.programId);

    const accounts: any = {
      executor: executor.publicKey,
      proposalAccount: proposalAccount,
      stakingPool: stakingPool,
      programAuthority: programAuthority,
      depositEscrowAccount: depositEscrowAccount,
      proposerTokenAccount: proposerTokenAccount,
      depositTokenMint: tokenMintAddress,
      tokenProgramForDeposit: TOKEN_2022_PROGRAM_ID,
      governanceConfig: governanceConfig,
        // Explicitly set optional accounts to null for non-treasury proposals
      treasuryAccount: null,
      recipientAccount: null,
      tokenMint: null,
      tokenProgram: null,
    };

    // Only override with actual values for treasury transfers
    if (proposalType === 'treasuryTransfer') {
      if (!treasuryAccount || !recipientAccount) {
        throw new Error("Treasury and recipient accounts required for TreasuryTransfer proposals");
      }
      accounts.treasuryAccount = treasuryAccount;
      accounts.recipientAccount = recipientAccount;
      accounts.tokenMint = tokenMintAddress;
      accounts.tokenProgram = TOKEN_2022_PROGRAM_ID;
    }
    // For 'parameterUpdate' and 'text' proposals, don't add treasury-specific accounts

    try {
      const tx = await program.methods
        .executeProposal()
        .accounts(accounts)
        .signers([executor])
        .rpc();

      console.log(`✅ Proposal #${proposalId} executed successfully!`);
      console.log(`Transaction: ${tx}`);

      const updatedProposal = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
      const finalStatus = Object.keys(updatedProposal.status)[0];

      const executedAtNum = typeof updatedProposal.executedAt === 'number'
        ? updatedProposal.executedAt
        : Number(updatedProposal.executedAt);

      console.log(`Final status: ${finalStatus}`);
      console.log(`Executed at: ${new Date(executedAtNum * 1000)}`);
      console.log(`Deposit refunded: ${updatedProposal.depositRefunded ? 'Yes' : 'No'}`);

      return {
        success: true,
        transactionId: tx,
        proposalId: proposalId,
        finalStatus: finalStatus,
        executedAt: executedAtNum,
        depositRefunded: updatedProposal.depositRefunded,
        depositAmount: updatedProposal.depositAmount / 1_000_000,
      };
    } catch (error) {
      console.error("Error executing proposal:", error);
      throw error;
    }
  } catch (error: any) {
    if (error.message && error.message.includes("Account does not exist")) {
      throw new Error(`Proposal #${proposalId} does not exist`);
    }
    throw error;
  }
}

// === Get Proposal Execution Status (helper) ===
export async function getProposalExecutionStatus(proposalId: number) {
  const { program } = getProgram();
  const [proposalAccount] = getProposalPda(program.programId, proposalId);

  try {
    const proposalData = await program.account.proposalAccount.fetch(proposalAccount) as ProposalInfo;
    const currentTime = Math.floor(Date.now() / 1000);
    const status = Object.keys(proposalData.status)[0];

    // Convert BN to numbers
    const timelockEndNum = typeof proposalData.timelockEnd === 'number'
      ? proposalData.timelockEnd
      : Number(proposalData.timelockEnd);

    const executedAtNum = typeof proposalData.executedAt === 'number'
      ? proposalData.executedAt
      : Number(proposalData.executedAt);

    const canExecute =
      status === 'passed' &&
      currentTime >= timelockEndNum &&
      executedAtNum === 0;

    const timeUntilTimelockEnds = timelockEndNum - currentTime;
    const isTimelockExpired = timeUntilTimelockEnds <= 0;

    console.log(`=== Execution Status for Proposal #${proposalId} ===`);
    console.log(`Current Status: ${status}`);
    console.log(`Timelock Expired: ${isTimelockExpired}`);
    console.log(`Already Executed: ${executedAtNum !== 0}`);
    console.log(`Can Execute: ${canExecute}`);

    if (!isTimelockExpired && status === 'passed') {
      const hoursRemaining = Math.floor(timeUntilTimelockEnds / 3600);
      const minutesRemaining = Math.floor((timeUntilTimelockEnds % 3600) / 60);
      console.log(`Time until timelock expires: ${hoursRemaining}h ${minutesRemaining}m`);
    }

    return {
      success: true,
      proposalId: proposalId,
      currentStatus: status,
      canExecute: canExecute,
      timelockExpired: isTimelockExpired,
      alreadyExecuted: executedAtNum !== 0,
      timelockEnd: timelockEndNum,
      executedAt: executedAtNum !== 0 ? executedAtNum : null,
      timeUntilTimelockEnds: !isTimelockExpired ? timeUntilTimelockEnds : 0,
    };
  } catch (error: any) {
    if (error.message && error.message.includes("Account does not exist")) {
      throw new Error(`Proposal #${proposalId} does not exist`);
    }
    throw error;
  }
}

// ============================================================================
// TEXT PROPOSAL EXECUTION
// ============================================================================

export async function executeTextProposal(
  proposalId: number,
  userKeypair?: Keypair
) {
  try {
    console.log(`\n📝 Executing Text Proposal #${proposalId}...`);

    const statusCheck = await getProposalExecutionStatus(proposalId);
    if (!statusCheck.canExecute) {
      return {
        success: false,
        proposalId,
        error: "Proposal not ready for execution",
        status: statusCheck,
      };
    }

    const result = await executeProposal(proposalId, userKeypair);

    console.log(`✅ Text proposal executed successfully`);
    return {
      ...result, // Spread result first
      type: 'text', // Then add/override specific properties
    };
  } catch (error: any) {
    console.error(`❌ Error executing text proposal:`, error.message);
    return {
      success: false,
      type: 'text',
      proposalId,
      error: error.message,
    };
  }
}

// ============================================================================
// TREASURY TRANSFER EXECUTION
// ============================================================================

export async function executeTreasuryTransferProposal(
  proposalId: number,
  treasuryAccountAddress: string,
  recipientAccountAddress: string,
  userKeypair?: Keypair
) {
  try {
    console.log(`\n💰 Executing Treasury Transfer Proposal #${proposalId}...`);
    console.log(`   Treasury (input): ${treasuryAccountAddress}`);
    console.log(`   Recipient (input): ${recipientAccountAddress}`);

    const statusCheck = await getProposalExecutionStatus(proposalId);
    if (!statusCheck.canExecute) {
      return {
        success: false,
        proposalId,
        error: "Proposal not ready for execution",
        status: statusCheck,
      };
    }

    const proposalInfo = await getProposalInfo(proposalId);
    const proposalType = Object.keys(proposalInfo.proposalType)[0];
    if (proposalType !== 'treasuryTransfer') {
      return {
        success: false,
        proposalId,
        error: `Invalid proposal type. Expected 'treasuryTransfer', got '${proposalType}'`,
      };
    }

    const { program, connection } = getProgram();

    const tokenMint = process.env.ZSNIPE_MINT_ADDRESS;
    if (!tokenMint) {
      throw new Error("ZSNIPE_MINT_ADDRESS is not set in environment variables");
    }
    const tokenMintAddress = new PublicKey(tokenMint);

    // If the provided addresses are wallets, convert to ATAs for Token-2022; if already token accounts, keep them
    const resolveToken2022Account = async (address: string): Promise<PublicKey> => {
      const pub = new PublicKey(address);
      const acct = await connection.getAccountInfo(pub);
      if (acct && acct.owner.equals(TOKEN_2022_PROGRAM_ID)) {
        return pub;
      }
      return getAssociatedTokenAddressSync(
        tokenMintAddress,
        pub,
        false,
        TOKEN_2022_PROGRAM_ID
      );
    };

    const treasuryAccount = await resolveToken2022Account(treasuryAccountAddress);
    const recipientAccount = await resolveToken2022Account(recipientAccountAddress);

    console.log(`   Resolved Treasury ATA: ${treasuryAccount.toString()}`);
    console.log(`   Resolved Recipient ATA: ${recipientAccount.toString()}`);

    const result = await executeProposal(
      proposalId,
      userKeypair,
      treasuryAccount,
      recipientAccount
    );

    console.log(`✅ Treasury transfer executed successfully`);
    return {
      ...result, // Spread result first
      type: 'treasuryTransfer', // Then add/override specific properties
      treasury: treasuryAccountAddress,
      recipient: recipientAccountAddress,
    };
  } catch (error: any) {
    console.error(`❌ Error executing treasury transfer:`, error.message);
    return {
      success: false,
      type: 'treasuryTransfer',
      proposalId,
      error: error.message,
    };
  }
}

// ============================================================================
// PARAMETER UPDATE EXECUTION
// ============================================================================

export async function executeParameterUpdateProposal(
  proposalId: number,
  userKeypair?: Keypair
) {
  try {
    console.log(`\n⚙️  Executing Parameter Update Proposal #${proposalId}...`);

    const statusCheck = await getProposalExecutionStatus(proposalId);
    if (!statusCheck.canExecute) {
      return {
        success: false,
        proposalId,
        error: "Proposal not ready for execution",
        status: statusCheck,
      };
    }

    const proposalInfo = await getProposalInfo(proposalId);
    const proposalType = Object.keys(proposalInfo.proposalType)[0];
    if (proposalType !== 'parameterUpdate') {
      return {
        success: false,
        proposalId,
        error: `Invalid proposal type. Expected 'parameterUpdate', got '${proposalType}'`,
      };
    }

    const { program } = getProgram();
    const [governanceConfig] = getGovernanceConfigPda(program.programId);

    console.log(`   Governance Config: ${governanceConfig.toString()}`);

    const result = await executeProposal(
      proposalId,
      userKeypair,
      undefined,
      undefined,
      governanceConfig
    );

    console.log(`✅ Parameter update executed successfully`);
    return {
      ...result, // Spread result first
      type: 'parameterUpdate', // Then add/override specific properties
      governanceConfig: governanceConfig.toString(),
    };
  } catch (error: any) {
    console.error(`❌ Error executing parameter update:`, error.message);
    return {
      success: false,
      type: 'parameterUpdate',
      proposalId,
      error: error.message,
    };
  }
}

// ============================================================================
// SMART EXECUTION (AUTO-DETECT TYPE)
// ============================================================================

export async function executeProposalSmart(
  proposalId: number,
  options: {
    userKeypair?: Keypair;
    treasuryAccount?: string;
    recipientAccount?: string;
  } = {}
) {
  try {
    console.log(`\n🤖 Smart Execution for Proposal #${proposalId}...`);

    const proposalInfo = await getProposalInfo(proposalId);
    const proposalType = Object.keys(proposalInfo.proposalType)[0];

    console.log(`   Detected type: ${proposalType}`);

    switch (proposalType) {
      case 'text':
        return await executeTextProposal(proposalId, options.userKeypair);

      case 'treasuryTransfer':
        if (!options.treasuryAccount || !options.recipientAccount) {
          return {
            success: false,
            proposalId,
            error: 'Treasury and recipient accounts required for treasury transfer',
          };
        }
        return await executeTreasuryTransferProposal(
          proposalId,
          options.treasuryAccount,
          options.recipientAccount,
          options.userKeypair
        );

      case 'parameterUpdate':
        return await executeParameterUpdateProposal(proposalId, options.userKeypair);

      default:
        return {
          success: false,
          proposalId,
          error: `Unknown proposal type: ${proposalType}`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      proposalId,
      error: error.message,
    };
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export async function getExecutionReadinessReport(proposalId: number) {
  try {
    const [statusCheck, proposalInfo] = await Promise.all([
      getProposalExecutionStatus(proposalId),
      getProposalInfo(proposalId),
    ]);

    const proposalType = Object.keys(proposalInfo.proposalType)[0];

    const report = {
      proposalId,
      title: proposalInfo.title,
      type: proposalType,
      currentStatus: statusCheck.currentStatus,
      canExecute: statusCheck.canExecute,
      checks: {
        isPassed: statusCheck.currentStatus === 'passed',
        timelockExpired: statusCheck.timelockExpired,
        notAlreadyExecuted: !statusCheck.alreadyExecuted,
      },
      timeline: {
        timelockEnd: statusCheck.timelockEnd,
        timelockEndDate: new Date(statusCheck.timelockEnd * 1000).toISOString(),
        timeUntilExecutable: statusCheck.timeUntilTimelockEnds,
        hoursUntilExecutable: Math.ceil(statusCheck.timeUntilTimelockEnds / 3600),
        isExecutableNow: statusCheck.canExecute,
      },
      requiredAccounts: getRequiredAccountsForType(proposalType),
      votes: proposalInfo.votes,
    };

    console.log('\n📊 Execution Readiness Report');
    console.log('================================');
    console.log(`Proposal #${proposalId}: ${proposalInfo.title}`);
    console.log(`Type: ${proposalType}`);
    console.log(`Status: ${statusCheck.currentStatus}`);
    console.log(`Can Execute: ${report.canExecute ? '✅ YES' : '❌ NO'}`);

    if (!report.canExecute) {
      if (!report.checks.isPassed) {
        console.log(`   ❌ Proposal has not passed`);
      }
      if (!report.checks.timelockExpired) {
        console.log(`   ⏳ Timelock expires in ${report.timeline.hoursUntilExecutable} hours`);
      }
      if (!report.checks.notAlreadyExecuted) {
        console.log(`   ❌ Proposal already executed`);
      }
    }

    return {
      success: true,
      ...report,
    };
  } catch (error: any) {
    console.error(`❌ Error generating readiness report:`, error.message);
    return {
      success: false,
      proposalId,
      error: error.message,
    };
  }
}

function getRequiredAccountsForType(proposalType: string): string[] {
  switch (proposalType) {
    case 'text':
      return ['None - text proposals require no additional accounts'];
    case 'treasuryTransfer':
      return ['treasuryAccount', 'recipientAccount'];
    case 'parameterUpdate':
      return ['governanceConfig (automatically derived)'];
    default:
      return ['Unknown proposal type'];
  }
}

export async function bulkExecuteReadyProposals(
  maxProposalId: number = 10,
  userKeypair?: Keypair
) {
  console.log(`\n🔄 Bulk Executing Ready Proposals (0-${maxProposalId})...`);

  const results = [];

  for (let proposalId = 0; proposalId <= maxProposalId; proposalId++) {
    try {
      const statusCheck = await getProposalExecutionStatus(proposalId);

      if (statusCheck.canExecute) {
        console.log(`\n   Found executable proposal #${proposalId}`);
        const result = await executeProposalSmart(proposalId, { userKeypair });
        results.push(result);
      }
    } catch (error) {
      // Proposal doesn't exist, skip
      continue;
    }
  }

  console.log(`\n✅ Bulk execution complete. Executed ${results.length} proposals.`);

  return {
    success: true,
    executedCount: results.length,
    results,
  };
}

export async function getExecutionSchedule(maxProposalId: number = 10) {
  console.log(`\n📅 Getting Execution Schedule (0-${maxProposalId})...`);

  const schedule = [];

  for (let proposalId = 0; proposalId <= maxProposalId; proposalId++) {
    try {
      const statusCheck = await getProposalExecutionStatus(proposalId);
      const proposalInfo = await getProposalInfo(proposalId);

      if (statusCheck.currentStatus === 'passed' && !statusCheck.alreadyExecuted) {
        schedule.push({
          proposalId,
          title: proposalInfo.title,
          canExecuteNow: statusCheck.canExecute,
          timelockEnd: statusCheck.timelockEnd,
          executableAt: new Date(statusCheck.timelockEnd * 1000).toISOString(),
          hoursUntilExecutable: Math.ceil(statusCheck.timeUntilTimelockEnds / 3600),
        });
      }
    } catch (error) {
      // Proposal doesn't exist, skip
      continue;
    }
  }

  // Sort by execution time
  schedule.sort((a, b) => a.timelockEnd - b.timelockEnd);

  console.log('\n📋 Execution Schedule');
  console.log('=====================');
  schedule.forEach((item) => {
    const status = item.canExecuteNow
      ? '✅ Ready Now'
      : `⏳ ${item.hoursUntilExecutable}h`;
    console.log(`#${item.proposalId}: ${item.title.substring(0, 40)}... - ${status}`);
  });

  return {
    success: true,
    count: schedule.length,
    schedule,
  };
}

// ============================================================================
// DECODE EXECUTION DATA (for previewing what a proposal will do)
// ============================================================================

export async function getProposalExecutionPreview(proposalId: number) {
  try {
    const proposalInfo = await getProposalInfo(proposalId);
    const proposalType = Object.keys(proposalInfo.proposalType)[0];
    const executionData = proposalInfo.executionData; // Now this property exists

    const preview: any = {
      proposalId,
      title: proposalInfo.title,
      type: proposalType,
      status: Object.keys(proposalInfo.status)[0],
    };

    if (proposalType === 'treasuryTransfer' && executionData && executionData.length > 0) {
      const decoded = decodeTreasuryTransferExecutionData(executionData);
      preview.action = {
        type: 'Transfer tokens from treasury',
        recipient: decoded.recipient,
        amount: `${decoded.amountTokens} ZSNIPE (${decoded.amountMicroTokens} micro-tokens)`,
      };
    } else if (proposalType === 'parameterUpdate' && executionData && executionData.length > 0) {
      const decoded = decodeParameterUpdateExecutionData(executionData);
      preview.action = {
        type: 'Update governance parameter',
        parameter: decoded.parameterName,
        newValue: decoded.newValue,
      };
    } else if (proposalType === 'text') {
      preview.action = {
        type: 'No on-chain execution',
        note: 'Text proposal is for signaling only',
      };
    }

    return { success: true, ...preview };
  } catch (error: any) {
    return { success: false, proposalId, error: error.message };
  }
}

// Import getProposalInfo from proposalServices
import { getProposalInfo } from "./proposalServices";
import { ProposalInfo } from "../types/types";

