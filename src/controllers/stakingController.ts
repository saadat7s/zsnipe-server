import { Request, Response } from 'express';
import { getMockWalletKeypair } from '../modules/utils/mockWallets';
import { 
  initializeStakingPool,
  stakeTokens,
  unstakeTokens,
  getStakingPoolInfo,
  getUserStakingInfo,
  checkUserTokenBalance,
  bulkStakeTokens,
  getAllWalletsStatus,
} from '../modules/services/stakingServices';

// === Initialize Staking Pool ===
export async function initStakingPool(req: Request, res: Response) {
  try {
    const result = await initializeStakingPool();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to initialize staking pool' 
    });
  }
}

// === Stake Tokens ===
export async function stakeTokensController(req: Request, res: Response) {
  try {
    const { amount, walletNumber } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid amount is required' 
      });
    }

    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    const result = await stakeTokens(amount, userKeypair);
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to stake tokens' 
    });
  }
}

// === Unstake Tokens ===
export async function unstakeTokensController(req: Request, res: Response) {
  try {
    const { amount, walletNumber } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid amount is required' 
      });
    }

    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    const result = await unstakeTokens(amount, userKeypair);
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to unstake tokens' 
    });
  }
}

// === Get Staking Pool Info ===
export async function getStakingPoolInfoController(req: Request, res: Response) {
  try {
    const result = await getStakingPoolInfo();
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get staking pool info' 
    });
  }
}

// === Get User Staking Info ===
export async function getUserStakingInfoController(req: Request, res: Response) {
  try {
    const { walletNumber } = req.query;
    const userKeypair = walletNumber ? getMockWalletKeypair(Number(walletNumber)) : undefined;
    
    const result = await getUserStakingInfo(userKeypair);
    
    if (result === null) {
      return res.status(404).json({
        success: false,
        message: 'User has not staked any tokens yet'
      });
    }
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get user staking info' 
    });
  }
}

// === Check User Token Balance ===
export async function checkUserTokenBalanceController(req: Request, res: Response) {
  try {
    const { walletNumber } = req.query;
    const userKeypair = walletNumber ? getMockWalletKeypair(Number(walletNumber)) : undefined;
    
    const result = await checkUserTokenBalance(userKeypair);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to check user token balance' 
    });
  }
}

// === Bulk Stake Tokens ===
export async function bulkStakeTokensController(req: Request, res: Response) {
  try {
    const { amount, walletNumbers } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid amount is required' 
      });
    }

    const result = await bulkStakeTokens(amount, walletNumbers);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to bulk stake tokens' 
    });
  }
}

// === Get All Wallets Status ===
export async function getAllWalletsStatusController(req: Request, res: Response) {
  try {
    const result = await getAllWalletsStatus();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get all wallets status' 
    });
  }
}