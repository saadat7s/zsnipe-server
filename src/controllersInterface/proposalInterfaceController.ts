import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { VoteChoice } from '../modules/types/types';
import { 
  createInitializeProposalEscrowTransaction,
  createProposalTransaction as createProposalTransactionService,
  createCastVoteTransaction,
  getProposalInfo,
  getAllProposals,
  getAllProposalsUsingGPA,
  getVoteRecord,
  createFinalizeProposalTransaction,
  getProposalFinalizationStatus,
} from '../modules/servicesInterface/proposalServicesInterface';

// === Create Initialize Proposal Escrow Transaction (Admin only) ===
export async function createInitProposalEscrowTransaction(req: Request, res: Response) {
  try {
    const { adminPublicKey } = req.body;
    
    if (!adminPublicKey) {
      return res.status(400).json({ 
        success: false, 
        message: "Admin public key is required" 
      });
    }

    const result = await createInitializeProposalEscrowTransaction(new PublicKey(adminPublicKey));
    res.json(result);
  } catch (error: any) {
    console.error("Error in createInitProposalEscrowTransaction:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Create Proposal Transaction ===
export async function createProposalTransaction(req: Request, res: Response) {
  try {
    const { 
      userPublicKey, 
      proposalId, 
      title, 
      description, 
      proposalType, 
      executionData, 
      votingPeriod 
    } = req.body;
    
    if (!userPublicKey || !proposalId || !title || !description || !proposalType || !executionData || !votingPeriod) {
      return res.status(400).json({ 
        success: false, 
        message: "All fields are required: userPublicKey, proposalId, title, description, proposalType, executionData, votingPeriod" 
      });
    }

    const result = await createProposalTransactionService(
      userPublicKey,
      proposalId,
      title,
      description,
      proposalType,
      executionData,
      votingPeriod
    );
    res.json(result);
  } catch (error: any) {
    console.error("Error in createProposalTransaction:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Create Cast Vote Transaction ===
export async function createVoteTransaction(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId, voteChoice } = req.body;
    
    if (!userPublicKey || !proposalId || !voteChoice) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key, proposal ID, and vote choice are required" 
      });
    }

    // Convert string vote choice to enum
    let voteChoiceEnum: VoteChoice;
    switch (voteChoice.toLowerCase()) {
      case 'yes':
        voteChoiceEnum = VoteChoice.Yes;
        break;
      case 'no':
        voteChoiceEnum = VoteChoice.No;
        break;
      case 'abstain':
        voteChoiceEnum = VoteChoice.Abstain;
        break;
      default:
        return res.status(400).json({ 
          success: false, 
          message: "Invalid vote choice. Must be 'yes', 'no', or 'abstain'" 
        });
    }

    const result = await createCastVoteTransaction(userPublicKey, proposalId, voteChoiceEnum);
    res.json(result);
  } catch (error: any) {
    console.error("Error in createVoteTransaction:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Get Proposal Info ===
export async function getProposalInfoInterface(req: Request, res: Response) {
  try {
    const { proposalId } = req.params;
    
    if (!proposalId) {
      return res.status(400).json({ 
        success: false, 
        message: "Proposal ID is required" 
      });
    }

    const result = await getProposalInfo(parseInt(proposalId));
    res.json(result);
  } catch (error: any) {
    console.error("Error in getProposalInfoInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === List Proposals ===
export async function listProposalsInterface(req: Request, res: Response) {
  try {
    const { maxProposalId } = req.query;
    const maxId = maxProposalId ? parseInt(maxProposalId as string) : 10;

    const result = await getAllProposals(maxId);
    res.json(result);
  } catch (error: any) {
    console.error("Error in listProposalsInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Get All Proposals Using GPA ===
export async function getAllProposalsController(req: Request, res: Response) {
  try {
    const result = await getAllProposalsUsingGPA();
    res.json(result);
  } catch (error: any) {
    console.error("Error in getAllProposalsController:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Get Vote Record ===
export async function getVoteRecordInterface(req: Request, res: Response) {
  try {
    const { proposalId, userPublicKey } = req.params;
    
    if (!proposalId || !userPublicKey) {
      return res.status(400).json({ 
        success: false, 
        message: "Proposal ID and user public key are required" 
      });
    }

    const result = await getVoteRecord(parseInt(proposalId), userPublicKey);
    res.json(result);
  } catch (error: any) {
    console.error("Error in getVoteRecordInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Get Proposal Requirements ===
export async function getProposalRequirementsInterface(req: Request, res: Response) {
  try {
    // This is a static response for proposal requirements
    res.json({
      success: true,
      data: {
        minimumStakeToPropose: 1000, // tokens
        minimumStakeDurationToPropose: 30, // days
        proposalDepositAmount: 100, // tokens
        votingPeriodOptions: [3, 7, 14, 30], // days
        proposalTypes: [
          { id: 0, name: "text", description: "Text-only proposal" },
          { id: 1, name: "treasuryTransfer", description: "Treasury transfer proposal" },
          { id: 2, name: "parameterUpdate", description: "Parameter update proposal" }
        ]
      }
    });
  } catch (error: any) {
    console.error("Error in getProposalRequirementsInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Create Finalize Proposal Transaction ===
export async function createFinalizeProposalTransactionInterface(req: Request, res: Response) {
  try {
    const { userPublicKey, proposalId } = req.body;
    
    if (!userPublicKey || !proposalId) {
      return res.status(400).json({ 
        success: false, 
        message: "User public key and proposal ID are required" 
      });
    }

    const result = await createFinalizeProposalTransaction(userPublicKey, proposalId);
    res.json(result);
  } catch (error: any) {
    console.error("Error in createFinalizeProposalTransactionInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}

// === Get Proposal Finalization Status ===
export async function getProposalFinalizationStatusInterface(req: Request, res: Response) {
  try {
    const { proposalId } = req.params;
    
    if (!proposalId) {
      return res.status(400).json({ 
        success: false, 
        message: "Proposal ID is required" 
      });
    }

    const result = await getProposalFinalizationStatus(parseInt(proposalId));
    res.json(result);
  } catch (error: any) {
    console.error("Error in getProposalFinalizationStatusInterface:", error);
    res.status(500).json({ 
      success: false, 
      message: error.message || "Internal server error" 
    });
  }
}
