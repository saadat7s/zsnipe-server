import { Request, Response } from 'express';
import { getMockWalletKeypair } from '../modules/utils/mockWallets';
import { initializeGovernanceConfig } from '../modules/services/governanceConfigServices';

// === Initialize Governance Config ===
export async function initGovernanceConfig(req: Request, res: Response) {
  try {
    const { walletNumber } = req.body;
    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    
    const result = await initializeGovernanceConfig(userKeypair);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to initialize governance config' 
    });
  }
}
