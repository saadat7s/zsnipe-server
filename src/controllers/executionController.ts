import { Request, Response } from 'express';
import { getMockWalletKeypair } from '../modules/utils/mockWallets';
import { 
  executeProposal,
  getProposalExecutionStatus,
  executeTextProposal,
  executeTreasuryTransferProposal,
  executeParameterUpdateProposal,
  executeProposalSmart,
  getExecutionReadinessReport,
  bulkExecuteReadyProposals,
  getExecutionSchedule,
  getProposalExecutionPreview,
} from '../modules/services/executionServices';

// === Execute Proposal ===
export async function executeProposalController(req: Request, res: Response) {
  try {
    const { 
      proposalId, 
      walletNumber, 
      treasuryAccount, 
      recipientAccount 
    } = req.body;

    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    
    // Convert string addresses to PublicKey if provided
    let treasuryPubkey, recipientPubkey;
    if (treasuryAccount) {
      treasuryPubkey = new (await import('@solana/web3.js')).PublicKey(treasuryAccount);
    }
    if (recipientAccount) {
      recipientPubkey = new (await import('@solana/web3.js')).PublicKey(recipientAccount);
    }

    const result = await executeProposal(
      proposalId, 
      userKeypair, 
      treasuryPubkey, 
      recipientPubkey
    );
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to execute proposal' 
    });
  }
}

// === Get Proposal Execution Status ===
export async function getProposalExecutionStatusController(req: Request, res: Response) {
  try {
    const { proposalId } = req.params;
    
    if (!proposalId || isNaN(Number(proposalId))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const result = await getProposalExecutionStatus(Number(proposalId));
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get proposal execution status' 
    });
  }
}

// === Execute Text Proposal ===
export async function executeTextProposalController(req: Request, res: Response) {
  try {
    const { proposalId, walletNumber } = req.body;

    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    const result = await executeTextProposal(proposalId, userKeypair);
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to execute text proposal' 
    });
  }
}

// === Execute Treasury Transfer Proposal ===
export async function executeTreasuryTransferProposalController(req: Request, res: Response) {
  try {
    const { 
      proposalId, 
      treasuryAccount, 
      recipientAccount, 
      walletNumber 
    } = req.body;

    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    if (!treasuryAccount || typeof treasuryAccount !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid treasuryAccount is required' 
      });
    }

    if (!recipientAccount || typeof recipientAccount !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid recipientAccount is required' 
      });
    }

    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    const result = await executeTreasuryTransferProposal(
      proposalId,
      treasuryAccount,
      recipientAccount,
      userKeypair
    );
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to execute treasury transfer proposal' 
    });
  }
}

// === Execute Parameter Update Proposal ===
export async function executeParameterUpdateProposalController(req: Request, res: Response) {
  try {
    const { proposalId, walletNumber } = req.body;

    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    const result = await executeParameterUpdateProposal(proposalId, userKeypair);
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to execute parameter update proposal' 
    });
  }
}

// === Execute Proposal Smart ===
export async function executeProposalSmartController(req: Request, res: Response) {
  try {
    const { 
      proposalId, 
      walletNumber, 
      treasuryAccount, 
      recipientAccount 
    } = req.body;

    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    const result = await executeProposalSmart(proposalId, {
      userKeypair,
      treasuryAccount,
      recipientAccount
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to execute proposal smart' 
    });
  }
}

// === Get Execution Readiness Report ===
export async function getExecutionReadinessReportController(req: Request, res: Response) {
  try {
    const { proposalId } = req.params;
    
    if (!proposalId || isNaN(Number(proposalId))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const result = await getExecutionReadinessReport(Number(proposalId));
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get execution readiness report' 
    });
  }
}

// === Bulk Execute Ready Proposals ===
export async function bulkExecuteReadyProposalsController(req: Request, res: Response) {
  try {
    const { maxProposalId, walletNumber } = req.body;
    const maxId = maxProposalId || 10;
    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    
    const result = await bulkExecuteReadyProposals(maxId, userKeypair);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to bulk execute ready proposals' 
    });
  }
}

// === Get Execution Schedule ===
export async function getExecutionScheduleController(req: Request, res: Response) {
  try {
    const { maxProposalId } = req.query;
    const maxId = maxProposalId ? Number(maxProposalId) : 10;
    
    const result = await getExecutionSchedule(maxId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get execution schedule' 
    });
  }
}

// === Get Proposal Execution Preview ===
export async function getProposalExecutionPreviewController(req: Request, res: Response) {
  try {
    const { proposalId } = req.params;
    
    if (!proposalId || isNaN(Number(proposalId))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const result = await getProposalExecutionPreview(Number(proposalId));
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get proposal execution preview' 
    });
  }
}
