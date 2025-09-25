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
  bulkInitGovernanceAccounts
} from '../services';

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