import { Request, Response } from 'express';
import { 
  createExecuteTextProposalTransaction,
  createExecuteTreasuryTransferTransaction,
  createExecuteParameterUpdateTransaction,
  createExecuteProposalSmartTransaction,
} from '../modules/servicesInterface/executionServicesInterface';

// === Execute Text Proposal ===
export async function executeTextProposalInterface(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId } = req.body;
    
    if (!userPublicKey || !proposalId) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key and proposal ID are required" 
      });
    }

    const result = await createExecuteTextProposalTransaction(userPublicKey, proposalId);
    res.json(result);
  } catch (error: any) {
    console.error("Error in executeTextProposalInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Execute Treasury Transfer Proposal ===
export async function executeTreasuryTransferInterface(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId, treasuryAccount, recipientAccount } = req.body;
    
    if (!userPublicKey || !proposalId || !treasuryAccount || !recipientAccount) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key, proposal ID, treasury account, and recipient account are required" 
      });
    }

    const result = await createExecuteTreasuryTransferTransaction(
      userPublicKey, 
      proposalId, 
      treasuryAccount, 
      recipientAccount
    );
    res.json(result);
  } catch (error: any) {
    console.error("Error in executeTreasuryTransferInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Execute Parameter Update Proposal ===
export async function executeParameterUpdateInterface(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId } = req.body;
    
    if (!userPublicKey || !proposalId) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key and proposal ID are required" 
      });
    }

    const result = await createExecuteParameterUpdateTransaction(userPublicKey, proposalId);
    res.json(result);
  } catch (error: any) {
    console.error("Error in executeParameterUpdateInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Execute Proposal Smart (Auto-detect type) ===
export async function executeProposalSmartInterface(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId, treasuryAccount, recipientAccount } = req.body;
    
    if (!userPublicKey || !proposalId) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key and proposal ID are required" 
      });
    }

    const opts = treasuryAccount && recipientAccount ? 
      { treasuryAccount, recipientAccount } : 
      undefined;

    const result = await createExecuteProposalSmartTransaction(userPublicKey, proposalId, opts);
    res.json(result);
  } catch (error: any) {
    console.error("Error in executeProposalSmartInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}
