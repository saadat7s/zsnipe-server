import { Request, Response } from 'express';
import { 
  createInitializeStakingPoolTransaction,
  createStakeTokensTransaction,
  createUnstakeTokensTransaction,
  createInitializeGovernanceAccountTransaction,
  // Renamed to avoid import conflict
  createCalculateVotingPowerTransaction as importedCreateCalculateVotingPowerTransaction,
  createInitializeProposalEscrowTransaction,
  // Renamed to avoid import conflict
  createProposalTransaction as importedCreateProposalTransaction,
  createCastVoteTransaction,
  createFinalizeProposalTransaction,
  getStakingPoolInfo,
  getUserStakingInfo,
  getGovernanceAccountInfo,
  getProposalInfo,
  getAllProposals,
  getAllProposalsUsingGPA,
  getVoteRecord,
  getProposalFinalizationStatus,
  checkUserTokenBalance,
  calculateHybridVotingPower,
  checkVotingEligibility,
  MIN_STAKE_TO_PROPOSE,
  MIN_STAKE_DURATION_TO_PROPOSE,
  PROPOSAL_DEPOSIT_AMOUNT,
  createInitializeTreasuryTransaction,
  createFundTreasuryTransaction,
  getTreasuryAccountInterface,
  createExecuteTextProposalTransaction,
  createExecuteTreasuryTransferTransaction,
  createExecuteParameterUpdateTransaction,
  createExecuteProposalSmartTransaction,
  buildTextExecutionData,
  buildTreasuryTransferExecutionData,
  buildParameterUpdateExecutionData,
  getGovernanceConfig,
} from '../services/staking/servicesInterface';
import { VoteChoice } from '../services/types';
import { PublicKey } from '@solana/web3.js';

// === Initialize Staking Pool (Admin only) ===
export async function initStakingPoolInterface(req: Request, res: Response) {
  try {
    const { adminPublicKey } = req.body;

    if (!adminPublicKey || typeof adminPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid adminPublicKey is required' 
      });
    }
    const adminPubKey = new PublicKey(adminPublicKey);
    const result = await createInitializeStakingPoolTransaction(new PublicKey(adminPublicKey));
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create initialize staking pool transaction' });
  }
}

// === Create Stake Tokens Transaction ===
export async function createStakeTransaction(req: Request, res: Response) {
  try {
    const { userPublicKey, amount } = req.body;
    
    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid amount is required' 
      });
    }

    const result = await createStakeTokensTransaction(userPublicKey, amount);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create stake transaction' });
  }
}

// === Create Unstake Tokens Transaction ===
export async function createUnstakeTransaction(req: Request, res: Response) {
  try {
    const { userPublicKey, amount } = req.body;
    
    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid amount is required' 
      });
    }

    const result = await createUnstakeTokensTransaction(userPublicKey, amount);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create unstake transaction' });
  }
}

// === Create Initialize Governance Account Transaction ===
export async function createInitGovernanceTransaction(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.body;
    
    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

    const result = await createInitializeGovernanceAccountTransaction(userPublicKey);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create initialize governance transaction' });
  }
}

// === Create Calculate Voting Power Transaction ===
export async function createCalculateVotingPowerTransaction(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.body;
    
    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

    const result = await importedCreateCalculateVotingPowerTransaction(userPublicKey);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create calculate voting power transaction' });
  }
}

// === Create Initialize Proposal Escrow Transaction (Admin only) ===
export async function createInitProposalEscrowTransaction(req: Request, res: Response) {
  try {
    const { adminPublicKey } = req.body;
    if (!adminPublicKey || typeof adminPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid adminPublicKey is required' 
      });
    }
    const result = await createInitializeProposalEscrowTransaction(new PublicKey(adminPublicKey));
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create initialize proposal escrow transaction' });
  }
}

// === Create Proposal Transaction ===
export async function createProposalTransaction(req: Request, res: Response) {
  try {
    const {
      userPublicKey,
      proposalId,
      title,
      description,
      proposalType = 0,
      executionData = [],
      votingPeriod = 7
    } = req.body;

    // Validation
    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

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

    const result = await importedCreateProposalTransaction(
      userPublicKey,
      proposalId,
      title.trim(),
      description.trim(),
      proposalType,
      executionData,
      votingPeriod
    );

    res.status(200).json({
      ...result,
      requirements: {
        minStake: `${MIN_STAKE_TO_PROPOSE / 1_000_000} ZSNIPE`,
        minStakeDuration: '30 days',
        depositRequired: `${PROPOSAL_DEPOSIT_AMOUNT / 1_000_000} ZSNIPE`
      }
    });
  } catch (error: any) {
    console.error("Create proposal transaction error:", error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to create proposal transaction' 
    });
  }
}

// === Create Cast Vote Transaction ===
export async function createVoteTransaction(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId, voteChoice } = req.body;

    // Validation
    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

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

    const result = await createCastVoteTransaction(
      userPublicKey,
      proposalId,
      voteChoiceNum as VoteChoice
    );

    res.status(200).json(result);
  } catch (error: any) {
    console.error("Create vote transaction error:", error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to create vote transaction' 
    });
  }
}

// === Read-only endpoints ===

// Get Staking Pool Info
export async function getPoolInfoInterface(req: Request, res: Response) {
  try {
    const result = await getStakingPoolInfo();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch staking pool info' });
  }
}

// Get User Staking Info
export async function getUserStakingInfoInterface(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.query;
    
    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

    const result = await getUserStakingInfo(userPublicKey);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch user staking info' });
  }
}

// Get Governance Account Info
export async function getGovernanceInfoInterface(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.query;
    
    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

    const result = await getGovernanceAccountInfo(userPublicKey);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch governance info' });
  }
}

// Get Proposal Info
export async function getProposalInfoInterface(req: Request, res: Response) {
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
      error: error?.message || 'Failed to fetch proposal info' 
    });
  }
}

// List All Proposals
export async function listProposalsInterface(req: Request, res: Response) {
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

// Get Vote Record
export async function getVoteRecordInterface(req: Request, res: Response) {
  try {
    const proposalId = Number(req.params.proposalId);
    const { userPublicKey } = req.query;

    if (!Number.isFinite(proposalId) || proposalId < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

    const result = await getVoteRecord(proposalId, userPublicKey);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to fetch vote record' 
    });
  }
}

// Preview Voting Power
export async function previewVotingPowerInterface(req: Request, res: Response) {
  try {
    const amount = Number(req.query.amount);
    const days = Number(req.query.days);
    
    if (!Number.isFinite(amount) || amount < 0 || !Number.isFinite(days) || days < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid amount and days are required' 
      });
    }

    const power = calculateHybridVotingPower(amount, days);
    res.status(200).json({ 
      success: true, 
      votingPower: power,
      amount: amount,
      days: days
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to calculate voting power preview' 
    });
  }
}

// Check Voting Eligibility
export async function checkEligibilityInterface(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.query;
    
    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

    const result = await checkVotingEligibility(userPublicKey);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to check voting eligibility' 
    });
  }
}

// Get Proposal Requirements
export async function getProposalRequirementsInterface(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.query;

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
      userPublicKey: userPublicKey || 'Not provided'
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to fetch requirements' 
    });
  }
}

// === Create Finalize Proposal Transaction ===
export async function createFinalizeProposalTransactionInterface(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId } = req.body;

    // Validation
    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId (number) is required' 
      });
    }

    const result = await createFinalizeProposalTransaction(userPublicKey, proposalId);
    res.status(200).json(result);
  } catch (error: any) {
    console.error("Create finalize proposal transaction error:", error);
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to create finalize proposal transaction' 
    });
  }
}

// === Get Proposal Finalization Status ===
export async function getProposalFinalizationStatusInterface(req: Request, res: Response) {
  try {
    const proposalId = Number(req.params.proposalId);
    
    if (!Number.isFinite(proposalId) || proposalId < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const result = await getProposalFinalizationStatus(proposalId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to fetch proposal finalization status' 
    });
  }
}

// === Check User Token Balance ===
export async function checkUserTokenBalanceInterface(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.params;
    
    if (!userPublicKey || typeof userPublicKey !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid userPublicKey is required' 
      });
    }

    const result = await checkUserTokenBalance(userPublicKey);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to check user token balance' 
    });
  }
}

// === Execute Proposal Transactions (Interface) ===
export async function executeTextProposalInterface(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId } = req.body;
    if (!userPublicKey || typeof userPublicKey !== 'string' || typeof proposalId !== 'number') {
      return res.status(400).json({ success: false, error: 'userPublicKey (string) and proposalId (number) are required' });
    }
    const result = await createExecuteTextProposalTransaction(userPublicKey, proposalId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create execute text proposal transaction' });
  }
}

export async function executeTreasuryTransferInterface(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId, treasuryAccount, recipientAccount } = req.body;
    if (!userPublicKey || typeof userPublicKey !== 'string' || typeof proposalId !== 'number' || !treasuryAccount || !recipientAccount) {
      return res.status(400).json({ success: false, error: 'userPublicKey, proposalId, treasuryAccount, recipientAccount are required' });
    }
    const result = await createExecuteTreasuryTransferTransaction(userPublicKey, proposalId, treasuryAccount, recipientAccount);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create execute treasury transfer transaction' });
  }
}

export async function executeParameterUpdateInterface(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId } = req.body;
    if (!userPublicKey || typeof userPublicKey !== 'string' || typeof proposalId !== 'number') {
      return res.status(400).json({ success: false, error: 'userPublicKey (string) and proposalId (number) are required' });
    }
    const result = await createExecuteParameterUpdateTransaction(userPublicKey, proposalId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create execute parameter update transaction' });
  }
}

export async function executeProposalSmartInterface(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId, treasuryAccount, recipientAccount } = req.body;
    if (!userPublicKey || typeof userPublicKey !== 'string' || typeof proposalId !== 'number') {
      return res.status(400).json({ success: false, error: 'userPublicKey (string) and proposalId (number) are required' });
    }
    const result = await createExecuteProposalSmartTransaction(userPublicKey, proposalId, { treasuryAccount, recipientAccount });
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create execute proposal transaction' });
  }
}

// === Treasury Interface Controllers ===
export async function initTreasuryInterface(req: Request, res: Response) {
  try {
    const { adminPublicKey } = req.body;
    if (!adminPublicKey || typeof adminPublicKey !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid adminPublicKey is required' });
    }
    const result = await createInitializeTreasuryTransaction(new PublicKey(adminPublicKey));
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create initialize treasury transaction' });
  }
}

export async function fundTreasuryInterface(req: Request, res: Response) {
  try {
    const { adminPublicKey, amount } = req.body;
    if (!adminPublicKey || typeof adminPublicKey !== 'string') {
      return res.status(400).json({ success: false, error: 'Valid adminPublicKey is required' });
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ success: false, error: 'Valid positive amount is required' });
    }
    const result = await createFundTreasuryTransaction(new PublicKey(adminPublicKey), amt);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to create fund treasury transaction' });
  }
}

export async function getTreasuryAccountInterfaceController(req: Request, res: Response) {
  try {
    const result = await getTreasuryAccountInterface();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Failed to get treasury account' });
  }
}

// === Execution Data Builder Controllers ===
export async function buildTextExecutionDataController(req: Request, res: Response) {
  try {
    const { metadata } = req.body || {};
    const data = buildTextExecutionData(metadata);
    res.status(200).json({ success: true, data: { executionData: data, length: data.length } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error?.message || 'Failed to build text execution data' });
  }
}

export async function buildTreasuryExecutionDataControllerInterface(req: Request, res: Response) {
  try {
    const { recipientAddress, amountTokens } = req.body || {};
    if (!recipientAddress || !amountTokens) {
      return res.status(400).json({ success: false, error: 'recipientAddress and amountTokens are required' });
    }
    
    const amountTokensNumber = Number(amountTokens);
    const amountMicroTokens = Math.floor(amountTokensNumber * 1_000_000);
    
    const data = buildTreasuryTransferExecutionData(recipientAddress, amountTokensNumber);
    res.status(200).json({ 
      success: true, 
      data: { 
        executionData: data, 
        length: data.length,
        recipient: recipientAddress,
        amountTokens: amountTokensNumber,
        amountMicroTokens: amountMicroTokens
      } 
    });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error?.message || 'Failed to build treasury execution data' });
  }
}

export async function buildParameterExecutionDataController(req: Request, res: Response) {
  try {
    const { parameterId, newValue } = req.body || {};
    if (parameterId === undefined || newValue === undefined) {
      return res.status(400).json({ success: false, error: 'parameterId and newValue are required' });
    }
    const data = buildParameterUpdateExecutionData(Number(parameterId), Number(newValue));
    res.status(200).json({ success: true, data: { executionData: data, length: data.length } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error?.message || 'Failed to build parameter execution data' });
  }
}

export async function getAllProposalsController(req: Request, res: Response) {
  try {
    const result = await getAllProposalsUsingGPA();
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  } catch (error: any) {
    console.error("Error in getAllProposalsController:", error);
    res.status(500).json({
      success: false,
      message: `Error fetching all proposals: ${error.message || error}`
    });
  }
}

// === Decode Treasury Execution Data ===
export async function decodeTreasuryExecutionDataController(req: Request, res: Response) {
  try {
    const { executionData } = req.body;

    if (!executionData || !Array.isArray(executionData)) {
      return res.status(400).json({
        success: false,
        error: 'executionData array is required',
      });
    }

    // Import the decode function from services
    const { decodeTreasuryTransferExecutionData } = await import('../services/staking/services');
    const decodedData = decodeTreasuryTransferExecutionData(executionData);

    return res.status(200).json({
      success: true,
      data: decodedData,
    });
  } catch (error: any) {
    console.error('Error in decodeTreasuryExecutionDataController:', error);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

// === Decode Parameter Execution Data ===
export async function decodeParameterExecutionDataController(req: Request, res: Response) {
  try {
    const { executionData } = req.body;

    if (!executionData || !Array.isArray(executionData)) {
      return res.status(400).json({
        success: false,
        error: 'executionData array is required',
      });
    }

    // Import the decode function from services
    const { decodeParameterUpdateExecutionData } = await import('../services/staking/services');
    const decodedData = decodeParameterUpdateExecutionData(executionData);

    return res.status(200).json({
      success: true,
      data: decodedData,
    });
  } catch (error: any) {
    console.error('Error in decodeParameterExecutionDataController:', error);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

// Get Governance Config
export async function getGovernanceConfigInterface(req: Request, res: Response) {
  try {
    const result = await getGovernanceConfig();
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(404).json(result);
    }
  } catch (error: any) {
    console.error('Error in getGovernanceConfigInterface:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch governance configuration',
    });
  }
}