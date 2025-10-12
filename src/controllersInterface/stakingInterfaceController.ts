import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { 
  createInitializeStakingPoolTransaction,
  createStakeTokensTransaction,
  createUnstakeTokensTransaction,
  getStakingPoolInfo,
  getUserStakingInfo,
  checkUserTokenBalance,
} from '../modules/servicesInterface/stakingServicesInterface';

// === Initialize Staking Pool (Admin only) ===
export async function initStakingPoolInterface(req: Request, res: Response) {
  try {
    const { adminPublicKey } = req.body;
    
    if (!adminPublicKey) {
      return res.status(400).json({ 
        success: false, 
        message: "Admin public key is required" 
      });
    }

    const result = await createInitializeStakingPoolTransaction(new PublicKey(adminPublicKey));
    res.json(result);
  } catch (error: any) {
    console.error("Error in initStakingPoolInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Create Stake Tokens Transaction ===
export async function createStakeTransaction(req: Request, res: Response) {
  try {
    const { userPublicKey, amount } = req.body;
    
    if (!userPublicKey || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key and amount are required" 
      });
    }

    const result = await createStakeTokensTransaction(userPublicKey, amount);
    res.json(result);
  } catch (error: any) {
    console.error("Error in createStakeTransaction:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Create Unstake Tokens Transaction ===
export async function createUnstakeTransaction(req: Request, res: Response) {
  try {
    const { userPublicKey, amount } = req.body;
    
    if (!userPublicKey || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key and amount are required" 
      });
    }

    const result = await createUnstakeTokensTransaction(userPublicKey, amount);
    res.json(result);
  } catch (error: any) {
    console.error("Error in createUnstakeTransaction:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Get Staking Pool Info ===
export async function getPoolInfoInterface(req: Request, res: Response) {
  try {
    const result = await getStakingPoolInfo();
    res.json(result);
  } catch (error: any) {
    console.error("Error in getPoolInfoInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Get User Staking Info ===
export async function getUserStakingInfoInterface(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.params;
    
    if (!userPublicKey) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key is required" 
      });
    }

    const result = await getUserStakingInfo(userPublicKey);
    res.json(result);
  } catch (error: any) {
    console.error("Error in getUserStakingInfoInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Check User Token Balance ===
export async function checkUserTokenBalanceInterface(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.params;
    
    if (!userPublicKey) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key is required" 
      });
    }

    const result = await checkUserTokenBalance(userPublicKey);
    res.json(result);
  } catch (error: any) {
    console.error("Error in checkUserTokenBalanceInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}
