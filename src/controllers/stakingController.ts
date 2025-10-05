import { Request, Response } from 'express';
import { 
  initializeStakingPool, 
  stakeTokens, 
  getStakingPoolInfo, 
  getUserStakingInfo, 
  checkUserTokenBalance, 
  unstakeTokens, 
  initializeGovernanceAccount, 
  calculateVotingPower, 
  calculateHybridVotingPower, 
  checkVotingEligibility, 
  getGovernanceAccountInfo, 
  getCompleteUserGovernanceData,
  getMockWalletKeypair,
  getAllWalletsStatus,
  bulkStakeTokens,
  bulkInitGovernanceAccounts,
  initializeProposalEscrow,
  createProposal,
  MIN_STAKE_TO_PROPOSE,
  MIN_STAKE_DURATION_TO_PROPOSE,
  PROPOSAL_DEPOSIT_AMOUNT,
  getAllProposals,
  getProposalInfo,
  bulkCastVote,
  castVote,
  getVoteRecord,
  getProposalFinalizationStatus,
  finalizeProposal,
  initializeGovernanceConfig,
  executeTextProposal,
  executeTreasuryTransferProposal,
  executeParameterUpdateProposal,
  executeProposalSmart,
  getExecutionReadinessReport,
  getProposalExecutionPreview,
  bulkExecuteReadyProposals,
  getExecutionSchedule,
  getAdminTreasuryAccount,
  initializeTreasury,
  fundTreasury,
  getTreasuryAccount,
  decodeParameterUpdateExecutionData,
  decodeTreasuryTransferExecutionData,
  buildTreasuryTransferExecutionData,
  buildParameterUpdateExecutionData,
} from '../services/staking/services';
import { VoteChoice } from '../services/types';

export async function initStakingPool(req: Request, res: Response) {
  try {
    const result = await initializeStakingPool();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Initialization failed' });
  }
}

export async function stake(req: Request, res: Response) {
  try {
    const amount = Number(req.body?.amount);
    const walletNumber = Number(req.body?.walletNumber) || null;
    
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    let userKeypair = undefined;
    if (walletNumber && walletNumber >= 1 && walletNumber <= 10) {
      userKeypair = getMockWalletKeypair(walletNumber);
    }

    const result = await stakeTokens(amount, userKeypair);
    res.status(200).json({
      ...result,
      walletNumber: walletNumber || 'admin',
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Stake failed' });
  }
}

export async function unstake(req: Request, res: Response) {
  try {
    const { amount: rawAmount, walletNumber } = req.body || {};
    
    console.log("Request body:", req.body);
    console.log("Raw amount:", rawAmount);
    
    const amount = Number(rawAmount);
    const walletNum = Number(walletNumber) || null;
    
    if (!rawAmount || isNaN(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: `Invalid amount: '${rawAmount}'. Must be a positive number.`
      });
    }
    
    let userKeypair = undefined;
    if (walletNum && walletNum >= 1 && walletNum <= 10) {
      userKeypair = getMockWalletKeypair(walletNum);
    }

    console.log(`Processing unstake for amount: ${amount}, wallet: ${walletNum || 'admin'}`);
    
    const result = await unstakeTokens(amount, userKeypair);
    res.status(200).json({
      ...result,
      walletNumber: walletNum || 'admin',
    });
  } catch (error: any) {
    console.error("Unstake controller error:", error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Unstake failed' 
    });
  }
}

export async function getPoolInfo(req: Request, res: Response) {
  try {
    const result = await getStakingPoolInfo();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Fetch failed' });
  }
}

export async function getUserInfo(req: Request, res: Response) {
  try {
    const walletNumber = Number(req.query.walletNumber) || null;
    
    let userKeypair = undefined;
    if (walletNumber && walletNumber >= 1 && walletNumber <= 10) {
      userKeypair = getMockWalletKeypair(walletNumber);
    }

    const data = await getUserStakingInfo(userKeypair);
    res.status(200).json({ 
      success: true, 
      data,
      walletNumber: walletNumber || 'admin'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Fetch failed' });
  }
}

export async function getUserBalance(req: Request, res: Response) {
  try {
    const walletNumber = Number(req.query.walletNumber) || null;
    
    let userKeypair = undefined;
    if (walletNumber && walletNumber >= 1 && walletNumber <= 10) {
      userKeypair = getMockWalletKeypair(walletNumber);
    }

    const result = await checkUserTokenBalance(userKeypair);
    res.status(200).json({ 
      success: true, 
      data: result,
      walletNumber: walletNumber || 'admin'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Fetch failed' });
  }
}

// Governance controllers
export async function initGovernanceAccount(req: Request, res: Response) {
  try {
    const walletNumber = Number(req.body?.walletNumber) || null;
    
    let userKeypair = undefined;
    if (walletNumber && walletNumber >= 1 && walletNumber <= 10) {
      userKeypair = getMockWalletKeypair(walletNumber);
    }

    const result = await initializeGovernanceAccount(userKeypair);
    res.status(200).json({
      ...result,
      walletNumber: walletNumber || 'admin'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Governance init failed' });
  }
}

export async function computeVotingPower(req: Request, res: Response) {
  try {
    const walletNumber = Number(req.body?.walletNumber) || null;
    
    let userKeypair = undefined;
    if (walletNumber && walletNumber >= 1 && walletNumber <= 10) {
      userKeypair = getMockWalletKeypair(walletNumber);
    }

    const result = await calculateVotingPower(userKeypair);
    res.status(200).json({
      ...result,
      walletNumber: walletNumber || 'admin'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Voting power calc failed' });
  }
}

export async function previewVotingPower(req: Request, res: Response) {
  try {
    const amount = Number(req.query.amount);
    const days = Number(req.query.days);
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(days) || days < 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount/days' });
    }
    const power = calculateHybridVotingPower(amount, days);
    res.status(200).json({ success: true, votingPower: power });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Preview failed' });
  }
}

export async function eligibility(req: Request, res: Response) {
  try {
    const walletNumber = Number(req.query.walletNumber) || null;
    
    let userKeypair = undefined;
    if (walletNumber && walletNumber >= 1 && walletNumber <= 10) {
      userKeypair = getMockWalletKeypair(walletNumber);
    }

    const result = await checkVotingEligibility(userKeypair);
    res.status(200).json({
      ...result,
      walletNumber: walletNumber || 'admin'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Eligibility check failed' });
  }
}

export async function governanceInfo(req: Request, res: Response) {
  try {
    const walletNumber = Number(req.query.walletNumber) || null;
    
    let userKeypair = undefined;
    if (walletNumber && walletNumber >= 1 && walletNumber <= 10) {
      userKeypair = getMockWalletKeypair(walletNumber);
    }

    const result = await getGovernanceAccountInfo(userKeypair);
    res.status(200).json({
      ...result,
      walletNumber: walletNumber || 'admin'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Governance info fetch failed' });
  }
}

export async function governanceSummary(req: Request, res: Response) {
  try {
    const walletNumber = Number(req.query.walletNumber) || null;
    
    let userKeypair = undefined;
    if (walletNumber && walletNumber >= 1 && walletNumber <= 10) {
      userKeypair = getMockWalletKeypair(walletNumber);
    }

    const result = await getCompleteUserGovernanceData(userKeypair);
    res.status(200).json({
      ...result,
      walletNumber: walletNumber || 'admin'
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Governance summary fetch failed' });
  }
}

// New mock wallet specific endpoints
export async function getAllWallets(req: Request, res: Response) {
  try {
    const result = await getAllWalletsStatus();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch wallet status' });
  }
}

export async function bulkStake(req: Request, res: Response) {
  try {
    const amount = Number(req.body?.amount);
    const walletNumbers = req.body?.walletNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }

    if (!Array.isArray(walletNumbers)) {
      return res.status(400).json({ success: false, error: 'walletNumbers must be an array' });
    }

    const result = await bulkStakeTokens(amount, walletNumbers);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Bulk stake failed' });
  }
}

export async function bulkInitGovernance(req: Request, res: Response) {
  try {
    const walletNumbers = req.body?.walletNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    if (!Array.isArray(walletNumbers)) {
      return res.status(400).json({ success: false, error: 'walletNumbers must be an array' });
    }

    const result = await bulkInitGovernanceAccounts(walletNumbers);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Bulk governance init failed' });
  }
}

// Proposal Escrow controller
export async function initProposalEscrow(req: Request, res: Response) {
  try {
    const result = await initializeProposalEscrow();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Proposal escrow initialization failed' 
    });
  }
}

// Create Proposal controller
export async function submitProposal(req: Request, res: Response) {
  try {
    const {
      proposalId,
      title,
      description,
      proposalType = 0, // Default to Text proposal
      executionData = [],
      votingPeriod = 7, // Default to 7 days
      walletNumber
    } = req.body;

    // Validation
    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId (number) is required' 
      });
    }

    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid title (non-empty string) is required' 
      });
    }

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid description (string) is required' 
      });
    }

    // Get user keypair
    let userKeypair = undefined;
    const walletNum = Number(walletNumber) || null;
    if (walletNum && walletNum >= 1 && walletNum <= 10) {
      userKeypair = getMockWalletKeypair(walletNum);
    }

    const result = await createProposal(
      proposalId,
      title.trim(),
      description.trim(),
      proposalType,
      executionData,
      votingPeriod,
      userKeypair
    );

    res.status(200).json({
      ...result,
      walletNumber: walletNum || 'admin',
      requirements: {
        minStake: `${MIN_STAKE_TO_PROPOSE / 1_000_000} ZSNIPE`,
        minStakeDuration: '30 days',
        depositRequired: `${PROPOSAL_DEPOSIT_AMOUNT / 1_000_000} ZSNIPE`
      }
    });
  } catch (error: any) {
    console.error("Create proposal controller error:", error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Proposal creation failed' 
    });
  }
}

// Get Proposal Requirements (helper endpoint)
export async function getProposalRequirements(req: Request, res: Response) {
  try {
    const walletNumber = Number(req.query.walletNumber) || null;
    
    let userKeypair = undefined;
    if (walletNumber && walletNumber >= 1 && walletNumber <= 10) {
      userKeypair = getMockWalletKeypair(walletNumber);
    }

    // Check if user meets requirements
    const eligibility = await checkVotingEligibility(userKeypair);
    const stakingInfo = await getUserStakingInfo(userKeypair);

    const meetsStakeAmount = stakingInfo 
      ? Number(stakingInfo.stakedAmount) >= MIN_STAKE_TO_PROPOSE 
      : false;

    const meetsStakeDuration = eligibility.isEligible && 
      eligibility.stakeDurationDays && eligibility.stakeDurationDays >= 30;

    res.status(200).json({
      success: true,
      requirements: {
        minStakeAmount: MIN_STAKE_TO_PROPOSE / 1_000_000,
        minStakeDuration: 30,
        depositAmount: PROPOSAL_DEPOSIT_AMOUNT / 1_000_000,
        validVotingPeriods: [3, 7, 14],
        maxTitleLength: 100,
        maxDescriptionLength: 1000,
        maxExecutionDataLength: 500,
      },
      userStatus: {
        walletNumber: walletNumber || 'admin',
        currentStake: stakingInfo ? Number(stakingInfo.stakedAmount) / 1_000_000 : 0,
        stakeDuration: eligibility.stakeDurationDays || 0,
        meetsStakeAmount,
        meetsStakeDuration,
        canCreateProposal: meetsStakeAmount && meetsStakeDuration,
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to fetch requirements' 
    });
  }
}

// Get single proposal
export async function getProposal(req: Request, res: Response) {
  try {
    const proposalId = Number(req.params.proposalId);
    
    if (!Number.isFinite(proposalId) || proposalId < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const result = await getProposalInfo(proposalId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to fetch proposal' 
    });
  }
}

// List all proposals
export async function listProposals(req: Request, res: Response) {
  try {
    const maxId = Number(req.query.maxId) || 100;
    const result = await getAllProposals(maxId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to list proposals' 
    });
  }
}



export async function submitVote(req: Request, res: Response) {

  try {
    const { proposalId, voteChoice, walletNumber } = req.body;

        // Validation
        if (!proposalId || typeof proposalId !== 'number') {
          return res.status(400).json({ 
            success: false, 
            error: 'Valid proposalId (number) is required' 
          });
        }
        
    if (voteChoice === undefined || voteChoice === null) {
      return res.status(400).json({ 
        success: false, 
        error: 'voteChoice is required (0=Yes, 1=No, 2=Abstain)' 
      });
    }

        // Validate vote choice
        const voteChoiceNum = Number(voteChoice);
        if (![0, 1, 2].includes(voteChoiceNum)) {
          return res.status(400).json({ 
            success: false, 
            error: 'Invalid voteChoice. Must be 0 (Yes), 1 (No), or 2 (Abstain)' 
          });
        }
       // Get user keypair
       let userKeypair = undefined;
       const walletNum = Number(walletNumber) || null;
       if (walletNum && walletNum >= 1 && walletNum <= 10) {
         userKeypair = getMockWalletKeypair(walletNum);
       }

       const result = await castVote(proposalId, voteChoiceNum as VoteChoice, userKeypair);
       res.status(200).json({
        ...result,
        walletNumber: walletNum || 'admin',
      });
    } catch (error: any) {
      console.error("Cast vote controller error:", error);
      res.status(500).json({ 
        success: false, 
        error: error?.message || 'Vote casting failed' 
      });
    }
  }

// Get Vote Record controller
export async function getVote(req: Request, res: Response) {
  try {
    const proposalId = Number(req.params.proposalId);
    const walletNumber = Number(req.query.walletNumber) || null;

    if (!Number.isFinite(proposalId) || proposalId < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    let userKeypair = undefined;
    if (walletNumber && walletNumber >= 1 && walletNumber <= 10) {
      userKeypair = getMockWalletKeypair(walletNumber);
    }

    const result = await getVoteRecord(proposalId, userKeypair);
    res.status(200).json({
      ...result,
      walletNumber: walletNumber || 'admin'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to fetch vote record' 
    });
  }
}

// Bulk Cast Votes controller (for testing)
export async function bulkVote(req: Request, res: Response) {
  try {
    const { proposalId, voteChoice, walletNumbers } = req.body;

    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId (number) is required' 
      });
    }

    const voteChoiceNum = Number(voteChoice);
    if (![0, 1, 2].includes(voteChoiceNum)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid voteChoice. Must be 0 (Yes), 1 (No), or 2 (Abstain)' 
      });
    }

    const targetWallets = walletNumbers || [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    
    if (!Array.isArray(targetWallets)) {
      return res.status(400).json({ 
        success: false, 
        error: 'walletNumbers must be an array' 
      });
    }

    const result = await bulkCastVote(
      proposalId, 
      voteChoiceNum as VoteChoice, 
      targetWallets
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Bulk vote controller error:", error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Bulk vote casting failed' 
    });
  }
}

/**
 * @route POST /api/governance/proposals/:proposalId/finalize
 * @desc Finalize a proposal after voting period ends
 * @access Public (permissionless)
 */
export const finalizeProposalController = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    
    // Validate proposalId
    const proposalIdNum = parseInt(proposalId);
    if (isNaN(proposalIdNum) || proposalIdNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID. Must be a non-negative number.',
      });
    }

    console.log(`\n=== Finalizing Proposal #${proposalIdNum} ===`);

    // Optional: Use a specific wallet if provided
    // For now, defaulting to admin wallet (permissionless anyway)
    const result = await finalizeProposal(proposalIdNum);

    return res.status(200).json({
      success: true,
      message: `Proposal #${proposalIdNum} finalized successfully`,
      data: result,
    });

  } catch (error: any) {
    console.error('Error in finalizeProposalController:', error);
    
    // Handle specific error cases
    if (error.message?.includes('does not exist')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }
    
    if (error.message?.includes('not ended yet') || 
        error.message?.includes('not active') ||
        error.message?.includes('already been finalized')) {
      return res.status(400).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to finalize proposal',
      details: error.message,
    });
  }
};

/**
 * @route GET /api/governance/proposals/:proposalId/finalization-status
 * @desc Check if a proposal can be finalized
 * @access Public
 */
export const getFinalizationStatusController = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    
    // Validate proposalId
    const proposalIdNum = parseInt(proposalId);
    if (isNaN(proposalIdNum) || proposalIdNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID. Must be a non-negative number.',
      });
    }

    console.log(`\n=== Checking Finalization Status for Proposal #${proposalIdNum} ===`);

    const result = await getProposalFinalizationStatus(proposalIdNum);

    return res.status(200).json({
      success: true,
      data: result,
    });

  } catch (error: any) {
    console.error('Error in getFinalizationStatusController:', error);
    
    if (error.message?.includes('does not exist')) {
      return res.status(404).json({
        success: false,
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to get finalization status',
      details: error.message,
    });
  }
};


/**
 * @route POST /api/governance/config/initialize
 * @desc Initialize the governance config account (one-time setup)
 * @access Admin
 */
export const initializeGovernanceConfigController = async (req: Request, res: Response) => {
  try {
    const { walletNumber } = req.body;

    let userKeypair = undefined;
    const walletNum = Number(walletNumber) || null;
    if (walletNum && walletNum >= 1 && walletNum <= 10) {
      userKeypair = getMockWalletKeypair(walletNum);
    }

    const result = await initializeGovernanceConfig(userKeypair);

    return res.status(200).json({
      success: true,
      message: 'Governance config initialized',
      data: result,
      walletNumber: walletNum || 'admin',
    });
  } catch (error: any) {
    console.error('Error in initializeGovernanceConfigController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize governance config',
      details: error.message,
    });
  }
};


/**
 * @route POST /api/governance/proposals/:proposalId/execute/text
 * @desc Execute a text proposal
 * @access Public (permissionless)
 */
export const executeTextProposalController = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const { walletNumber } = req.body;

    const proposalIdNum = parseInt(proposalId);
    if (isNaN(proposalIdNum) || proposalIdNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID',
      });
    }

    let userKeypair = undefined;
    const walletNum = Number(walletNumber) || null;
    if (walletNum && walletNum >= 1 && walletNum <= 10) {
      userKeypair = getMockWalletKeypair(walletNum);
    }

    const result = await executeTextProposal(proposalIdNum, userKeypair);

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? `Text proposal #${proposalIdNum} executed successfully`
        : 'Failed to execute text proposal',
      data: result,
      walletNumber: walletNum || 'admin',
    });
  } catch (error: any) {
    console.error('Error in executeTextProposalController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute text proposal',
      details: error.message,
    });
  }
};/**
 * @route POST /api/governance/proposals/:proposalId/execute/treasury
 * @desc Execute a treasury transfer proposal
 * @access Public (permissionless)
 */
export const executeTreasuryTransferController = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const { treasuryAccount, recipientAccount, walletNumber } = req.body;

    const proposalIdNum = parseInt(proposalId);
    if (isNaN(proposalIdNum) || proposalIdNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID',
      });
    }

    if (!treasuryAccount || !recipientAccount) {
      return res.status(400).json({
        success: false,
        error: 'Both treasuryAccount and recipientAccount are required',
      });
    }

    let userKeypair = undefined;
    const walletNum = Number(walletNumber) || null;
    if (walletNum && walletNum >= 1 && walletNum <= 10) {
      userKeypair = getMockWalletKeypair(walletNum);
    }

    const result = await executeTreasuryTransferProposal(
      proposalIdNum,
      treasuryAccount,
      recipientAccount,
      userKeypair
    );

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? `Treasury transfer proposal #${proposalIdNum} executed successfully`
        : 'Failed to execute treasury transfer',
      data: result,
      walletNumber: walletNum || 'admin',
    });
  } catch (error: any) {
    console.error('Error in executeTreasuryTransferController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute treasury transfer',
      details: error.message,
    });
  }
};


/**
 * @route POST /api/governance/proposals/:proposalId/execute/parameter
 * @desc Execute a parameter update proposal
 * @access Public (permissionless)
 */
export const executeParameterUpdateController = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const { walletNumber } = req.body;

    const proposalIdNum = parseInt(proposalId);
    if (isNaN(proposalIdNum) || proposalIdNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID',
      });
    }

    let userKeypair = undefined;
    const walletNum = Number(walletNumber) || null;
    if (walletNum && walletNum >= 1 && walletNum <= 10) {
      userKeypair = getMockWalletKeypair(walletNum);
    }

    const result = await executeParameterUpdateProposal(proposalIdNum, userKeypair);

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? `Parameter update proposal #${proposalIdNum} executed successfully`
        : 'Failed to execute parameter update',
      data: result,
      walletNumber: walletNum || 'admin',
    });
  } catch (error: any) {
    console.error('Error in executeParameterUpdateController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute parameter update',
      details: error.message,
    });
  }
};

/**
 * @route POST /api/governance/proposals/:proposalId/execute
 * @desc Smart execution - auto-detects proposal type and executes
 * @access Public (permissionless)
 */
export const executeProposalSmartController = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;
    const { treasuryAccount, recipientAccount, walletNumber } = req.body;

    const proposalIdNum = parseInt(proposalId);
    if (isNaN(proposalIdNum) || proposalIdNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID',
      });
    }

    let userKeypair = undefined;
    const walletNum = Number(walletNumber) || null;
    if (walletNum && walletNum >= 1 && walletNum <= 10) {
      userKeypair = getMockWalletKeypair(walletNum);
    }

    const result = await executeProposalSmart(proposalIdNum, {
      userKeypair,
      treasuryAccount,
      recipientAccount,
    });

    return res.status(200).json({
      success: result.success,
      message: result.success
        ? `Proposal #${proposalIdNum} executed successfully`
        : 'Failed to execute proposal',
      data: result,
      walletNumber: walletNum || 'admin',
    });
  } catch (error: any) {
    console.error('Error in executeProposalSmartController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to execute proposal',
      details: error.message,
    });
  }
};


// ============================================================================
// UTILITY CONTROLLERS
// ============================================================================

/**
 * @route GET /api/governance/proposals/:proposalId/execution-readiness
 * @desc Get detailed execution readiness report
 * @access Public
 */
export const getExecutionReadinessController = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;

    const proposalIdNum = parseInt(proposalId);
    if (isNaN(proposalIdNum) || proposalIdNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID',
      });
    }

    const result = await getExecutionReadinessReport(proposalIdNum);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in getExecutionReadinessController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get execution readiness',
      details: error.message,
    });
  }
};

/**
 * @route GET /api/governance/proposals/:proposalId/execution-preview
 * @desc Preview what a proposal will do when executed
 * @access Public
 */
export const getExecutionPreviewController = async (req: Request, res: Response) => {
  try {
    const { proposalId } = req.params;

    const proposalIdNum = parseInt(proposalId);
    if (isNaN(proposalIdNum) || proposalIdNum < 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid proposal ID',
      });
    }

    const result = await getProposalExecutionPreview(proposalIdNum);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in getExecutionPreviewController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get execution preview',
      details: error.message,
    });
  }
};

/**
 * @route POST /api/governance/proposals/bulk-execute
 * @desc Execute all ready proposals
 * @access Admin
 */
export const bulkExecuteController = async (req: Request, res: Response) => {
  try {
    const { maxProposalId = 10, walletNumber } = req.body;

    let userKeypair = undefined;
    const walletNum = Number(walletNumber) || null;
    if (walletNum && walletNum >= 1 && walletNum <= 10) {
      userKeypair = getMockWalletKeypair(walletNum);
    }

    const result = await bulkExecuteReadyProposals(maxProposalId, userKeypair);

    return res.status(200).json({
      success: true,
      message: `Executed ${result.executedCount} proposals`,
      data: result,
      walletNumber: walletNum || 'admin',
    });
  } catch (error: any) {
    console.error('Error in bulkExecuteController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to bulk execute proposals',
      details: error.message,
    });
  }
};

/**
 * @route GET /api/governance/proposals/execution-schedule
 * @desc Get schedule of when proposals become executable
 * @access Public
 */
export const getExecutionScheduleController = async (req: Request, res: Response) => {
  try {
    const maxProposalId = Number(req.query.maxProposalId) || 10;

    const result = await getExecutionSchedule(maxProposalId);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in getExecutionScheduleController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get execution schedule',
      details: error.message,
    });
  }
};


/**
 * @route GET /api/governance/treasury/admin-account
 * @desc Get admin's treasury account address
 * @access Public
 */
export const getAdminTreasuryController = async (req: Request, res: Response) => {
  try {
    const result = await getAdminTreasuryAccount();

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Error in getAdminTreasuryController:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to get admin treasury account',
      details: error.message,
    });
  }
};

// =========================================================================
// TREASURY CONTROLLERS
// =========================================================================

export const initializeTreasuryController = async (req: Request, res: Response) => {
  try {
    const result = await initializeTreasury();
    return res.status(200).json({
      success: true,
      message: 'Treasury initialized',
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to initialize treasury',
      details: error.message,
    });
  }
};

export const fundTreasuryController = async (req: Request, res: Response) => {
  try {
    const { amount } = req.body || {};
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: 'Valid positive amount is required' });
    }

    const result = await fundTreasury(amt);
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fund treasury',
      details: error.message,
    });
  }
};

export const getTreasuryAccountController = async (req: Request, res: Response) => {
  try {
    const result = await getTreasuryAccount();
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'Failed to get treasury account',
      details: error.message,
    });
  }
};

// ============================================================================
// EXECUTION DATA BUILDER CONTROLLERS
// ============================================================================

/**
 * @route POST /api/governance/execution-data/treasury
 * @desc Build execution data for treasury transfer
 * @access Public
 */
export const buildTreasuryExecutionDataController = async (req: Request, res: Response) => {
  try {
    const { recipientAddress, amountMicroTokens } = req.body;

    if (!recipientAddress || !amountMicroTokens) {
      return res.status(400).json({
        success: false,
        error: 'recipientAddress and amountMicroTokens are required',
      });
    }

    const executionData = buildTreasuryTransferExecutionData(
      recipientAddress,
      Number(amountMicroTokens)
    );

    return res.status(200).json({
      success: true,
      data: {
        executionData,
        length: executionData.length,
        recipient: recipientAddress,
        amountMicroTokens: Number(amountMicroTokens),
        amountTokens: Number(amountMicroTokens) / 1_000_000,
      },
    });
  } catch (error: any) {
    console.error('Error in buildTreasuryExecutionDataController:', error);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * @route POST /api/governance/execution-data/parameter
 * @desc Build execution data for parameter update
 * @access Public
 */
export const buildParameterExecutionDataController = async (req: Request, res: Response) => {
  try {
    const { parameterId, newValue } = req.body;

    if (parameterId === undefined || newValue === undefined) {
      return res.status(400).json({
        success: false,
        error: 'parameterId and newValue are required',
      });
    }

    const executionData = buildParameterUpdateExecutionData(
      Number(parameterId),
      Number(newValue)
    );

    const paramNames = ['Quorum Percentage', 'Passing Threshold', 'Timelock Duration'];

    return res.status(200).json({
      success: true,
      data: {
        executionData,
        length: executionData.length,
        parameterId: Number(parameterId),
        parameterName: paramNames[Number(parameterId)],
        newValue: Number(newValue),
      },
    });
  } catch (error: any) {
    console.error('Error in buildParameterExecutionDataController:', error);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * @route POST /api/governance/execution-data/decode/treasury
 * @desc Decode treasury transfer execution data
 * @access Public
 */
export const decodeTreasuryExecutionDataController = async (req: Request, res: Response) => {
  try {
    const { executionData } = req.body;

    if (!executionData || !Array.isArray(executionData)) {
      return res.status(400).json({
        success: false,
        error: 'executionData array is required',
      });
    }

    const decoded = decodeTreasuryTransferExecutionData(executionData);

    return res.status(200).json({
      success: true,
      data: decoded,
    });
  } catch (error: any) {
    console.error('Error in decodeTreasuryExecutionDataController:', error);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * @route POST /api/governance/execution-data/decode/parameter
 * @desc Decode parameter update execution data
 * @access Public
 */
export const decodeParameterExecutionDataController = async (req: Request, res: Response) => {
  try {
    const { executionData } = req.body;

    if (!executionData || !Array.isArray(executionData)) {
      return res.status(400).json({
        success: false,
        error: 'executionData array is required',
      });
    }

    const decoded = decodeParameterUpdateExecutionData(executionData);

    return res.status(200).json({
      success: true,
      data: decoded,
    });
  } catch (error: any) {
    console.error('Error in decodeParameterExecutionDataController:', error);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
};