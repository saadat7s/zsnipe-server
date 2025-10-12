import { Request, Response } from 'express';
import { 
  createInitializeGovernanceAccountTransaction,
  createCalculateVotingPowerTransaction as createCalculateVotingPowerTransactionService,
  getGovernanceAccountInfo,
  calculateHybridVotingPower,
  checkVotingEligibility,
} from '../modules/servicesInterface/governanceServicesInterface';

// === Create Initialize Governance Account Transaction ===
export async function createInitGovernanceTransaction(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.body;
    
    if (!userPublicKey) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key is required" 
      });
    }

    const result = await createInitializeGovernanceAccountTransaction(userPublicKey);
    res.json(result);
  } catch (error: any) {
    console.error("Error in createInitGovernanceTransaction:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Create Calculate Voting Power Transaction ===
export async function createCalculateVotingPowerTransaction(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.body;
    
    if (!userPublicKey) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key is required" 
      });
    }

    const result = await createCalculateVotingPowerTransactionService(userPublicKey);
    res.json(result);
  } catch (error: any) {
    console.error("Error in createCalculateVotingPowerTransaction:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Get Governance Account Info ===
export async function getGovernanceInfoInterface(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.params;
    
    if (!userPublicKey) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key is required" 
      });
    }

    const result = await getGovernanceAccountInfo(userPublicKey);
    res.json(result);
  } catch (error: any) {
    console.error("Error in getGovernanceInfoInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Preview Voting Power ===
export async function previewVotingPowerInterface(req: Request, res: Response) {
  try {
    const { stakeAmount, stakeDurationDays } = req.body;
    
    if (!stakeAmount || !stakeDurationDays) {
      return res.status(400).json({ 
        success: false, 
        message: "Stake amount and stake duration days are required" 
      });
    }

    const votingPower = calculateHybridVotingPower(stakeAmount, stakeDurationDays);
    
    res.json({
      success: true,
      data: {
        votingPower,
        stakeAmount,
        stakeDurationDays,
      }
    });
  } catch (error: any) {
    console.error("Error in previewVotingPowerInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Check Voting Eligibility ===
export async function checkEligibilityInterface(req: Request, res: Response) {
  try {
    const { userPublicKey } = req.params;
    
    if (!userPublicKey) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key is required" 
      });
    }

    const result = await checkVotingEligibility(userPublicKey);
    res.json(result);
  } catch (error: any) {
    console.error("Error in checkEligibilityInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}
