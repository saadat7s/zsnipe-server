import { Request, Response } from 'express';
import { 
  initializeTreasury,
  fundTreasury,
  getAdminTreasuryAccount,
  getTreasuryAccountInfo,
} from '../modules/services/treasuryServices';

// === Initialize Treasury ===
export async function initTreasury(req: Request, res: Response) {
  try {
    const result = await initializeTreasury();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to initialize treasury' 
    });
  }
}

// === Fund Treasury ===
export async function fundTreasuryController(req: Request, res: Response) {
  try {
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid amount is required' 
      });
    }

    const result = await fundTreasury(amount);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to fund treasury' 
    });
  }
}

// === Get Admin Treasury Account ===
export async function getAdminTreasuryAccountController(req: Request, res: Response) {
  try {
    const result = await getAdminTreasuryAccount();
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get admin treasury account' 
    });
  }
}

// === Get Treasury Account Info ===
export async function getTreasuryAccountController(req: Request, res: Response) {
  try {
    const result = await getTreasuryAccountInfo();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get treasury account info' 
    });
  }
}
