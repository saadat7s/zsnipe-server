import { Request, Response } from 'express';
import { getMockWalletKeypair } from '../modules/utils/mockWallets';
import { 
  initializeGovernanceAccount,
  calculateVotingPower,
  calculateHybridVotingPower,
  checkVotingEligibility,
  getGovernanceAccountInfo,
  getCompleteUserGovernanceData,
  bulkInitGovernanceAccounts,
  bulkCalculateVotingPower,
} from '../modules/services/governanceServices';

// === Initialize Governance Account ===
export async function initGovernanceAccount(req: Request, res: Response) {
  try {
    const { walletNumber } = req.body;
    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    
    const result = await initializeGovernanceAccount(userKeypair);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to initialize governance account' 
    });
  }
}

// === Calculate Voting Power ===
export async function calculateVotingPowerController(req: Request, res: Response) {
  try {
    const { walletNumber } = req.body;
    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    
    const result = await calculateVotingPower(userKeypair);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to calculate voting power' 
    });
  }
}

// === Calculate Hybrid Voting Power (Client-side) ===
export async function calculateHybridVotingPowerController(req: Request, res: Response) {
  try {
    const { stakeAmount, stakeDurationDays } = req.body;

    if (!stakeAmount || typeof stakeAmount !== 'number' || stakeAmount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid stakeAmount is required' 
      });
    }

    if (!stakeDurationDays || typeof stakeDurationDays !== 'number' || stakeDurationDays < 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid stakeDurationDays is required' 
      });
    }

    const votingPower = calculateHybridVotingPower(stakeAmount, stakeDurationDays);
    
    res.status(200).json({
      success: true,
      data: {
        stakeAmount,
        stakeDurationDays,
        votingPower
      }
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to calculate hybrid voting power' 
    });
  }
}

// === Check Voting Eligibility ===
export async function checkVotingEligibilityController(req: Request, res: Response) {
  try {
    const { walletNumber } = req.query;
    const userKeypair = walletNumber ? getMockWalletKeypair(Number(walletNumber)) : undefined;
    
    const result = await checkVotingEligibility(userKeypair);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to check voting eligibility' 
    });
  }
}

// === Get Governance Account Info ===
export async function getGovernanceAccountInfoController(req: Request, res: Response) {
  try {
    const { walletNumber } = req.query;
    const userKeypair = walletNumber ? getMockWalletKeypair(Number(walletNumber)) : undefined;
    
    const result = await getGovernanceAccountInfo(userKeypair);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get governance account info' 
    });
  }
}

// === Get Complete User Governance Data ===
export async function getCompleteUserGovernanceDataController(req: Request, res: Response) {
  try {
    const { walletNumber } = req.query;
    const userKeypair = walletNumber ? getMockWalletKeypair(Number(walletNumber)) : undefined;
    
    const result = await getCompleteUserGovernanceData(userKeypair);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get complete user governance data' 
    });
  }
}

// === Bulk Initialize Governance Accounts ===
export async function bulkInitGovernanceAccountsController(req: Request, res: Response) {
  try {
    const { walletNumbers } = req.body;
    
    const result = await bulkInitGovernanceAccounts(walletNumbers);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to bulk initialize governance accounts' 
    });
  }
}

// === Bulk Calculate Voting Power ===
export async function bulkCalculateVotingPowerController(req: Request, res: Response) {
  try {
    const { walletNumbers } = req.body;
    
    const result = await bulkCalculateVotingPower(walletNumbers);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to bulk calculate voting power' 
    });
  }
}
