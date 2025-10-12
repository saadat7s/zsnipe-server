import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { 
  createInitializeTreasuryTransaction,
  createFundTreasuryTransaction,
  getTreasuryAccountInterface,
} from '../modules/servicesInterface/treasuryServicesInterface';

// === Initialize Treasury (Admin only) ===
export async function initTreasuryInterface(req: Request, res: Response) {
  try {
    const { adminPublicKey } = req.body;
    
    if (!adminPublicKey) {
      return res.status(400).json({ 
        success: false, 
        message: "Admin public key is required" 
      });
    }

    const result = await createInitializeTreasuryTransaction(new PublicKey(adminPublicKey));
    res.json(result);
  } catch (error: any) {
    console.error("Error in initTreasuryInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Fund Treasury (Admin only) ===
export async function fundTreasuryInterface(req: Request, res: Response) {
  try {
    const { adminPublicKey, amountTokens } = req.body;
    
    if (!adminPublicKey || !amountTokens) {
      return res.status(400).json({ 
        success: false, 
        message: "Admin public key and amount in tokens are required" 
      });
    }

    const result = await createFundTreasuryTransaction(new PublicKey(adminPublicKey), amountTokens);
    res.json(result);
  } catch (error: any) {
    console.error("Error in fundTreasuryInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Get Treasury Account Info ===
export async function getTreasuryAccountInterfaceController(req: Request, res: Response) {
  try {
    const result = await getTreasuryAccountInterface();
    res.json(result);
  } catch (error: any) {
    console.error("Error in getTreasuryAccountInterfaceController:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}
