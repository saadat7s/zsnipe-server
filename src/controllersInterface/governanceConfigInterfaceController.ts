import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { createInitializeGovernanceConfigTransaction } from '../modules/servicesInterface/governanceConfigServicesInterface';

// === Initialize Governance Config (Admin only) ===
export async function initGovernanceConfigInterface(req: Request, res: Response) {
  try {
    const { adminPublicKey } = req.body;
    
    if (!adminPublicKey) {
      return res.status(400).json({ 
        success: false, 
        message: "Admin public key is required" 
      });
    }

    const result = await createInitializeGovernanceConfigTransaction(new PublicKey(adminPublicKey));
    res.json(result);
  } catch (error: any) {
    console.error("Error in initGovernanceConfigInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}
