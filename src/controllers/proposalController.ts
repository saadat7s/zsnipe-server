import { Request, Response } from 'express';
import { getMockWalletKeypair } from '../modules/utils/mockWallets';
import { VoteChoice } from '../modules/types/types';
import { 
  initializeProposalEscrow,
  createProposal,
  getProposalInfo,
  getAllProposals,
  castVote,
  getVoteRecord,
  bulkCastVote,
  finalizeProposal,
  getProposalFinalizationStatus,
} from '../modules/services/proposalServices';

// === Initialize Proposal Escrow ===
export async function initProposalEscrow(req: Request, res: Response) {
  try {
    const result = await initializeProposalEscrow();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to initialize proposal escrow' 
    });
  }
}

// === Create Proposal ===
export async function createProposalController(req: Request, res: Response) {
  try {
    const { 
      proposalId, 
      title, 
      description, 
      proposalType, 
      executionData, 
      votingPeriod, 
      walletNumber 
    } = req.body;

    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    if (!title || typeof title !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid title is required' 
      });
    }

    if (!description || typeof description !== 'string') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid description is required' 
      });
    }

    if (![0, 1, 2].includes(proposalType)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalType (0=Text, 1=TreasuryTransfer, 2=ParameterUpdate) is required' 
      });
    }

    if (!Array.isArray(executionData)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid executionData array is required' 
      });
    }

    if (![0, 1, 2].includes(votingPeriod)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid votingPeriod (0=short, 1=medium, 2=long) is required' 
      });
    }

    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    const result = await createProposal(
      proposalId,
      title,
      description,
      proposalType,
      executionData,
      votingPeriod,
      userKeypair
    );
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to create proposal' 
    });
  }
}

// === Get Proposal Info ===
export async function getProposalInfoController(req: Request, res: Response) {
  try {
    const { proposalId } = req.params;
    
    if (!proposalId || isNaN(Number(proposalId))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const result = await getProposalInfo(Number(proposalId));
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get proposal info' 
    });
  }
}

// === Get All Proposals ===
export async function getAllProposalsController(req: Request, res: Response) {
  try {
    const { maxProposalId } = req.query;
    const maxId = maxProposalId ? Number(maxProposalId) : 10;
    
    const result = await getAllProposals(maxId);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get all proposals' 
    });
  }
}

// === Cast Vote ===
export async function castVoteController(req: Request, res: Response) {
  try {
    const { proposalId, voteChoice, walletNumber } = req.body;

    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    if (![0, 1, 2].includes(voteChoice)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid voteChoice (0=Yes, 1=No, 2=Abstain) is required' 
      });
    }

    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    const result = await castVote(proposalId, voteChoice, userKeypair);
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to cast vote' 
    });
  }
}

// === Get Vote Record ===
export async function getVoteRecordController(req: Request, res: Response) {
  try {
    const { proposalId } = req.params;
    const { walletNumber } = req.query;
    
    if (!proposalId || isNaN(Number(proposalId))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const userKeypair = walletNumber ? getMockWalletKeypair(Number(walletNumber)) : undefined;
    const result = await getVoteRecord(Number(proposalId), userKeypair);
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get vote record' 
    });
  }
}

// === Bulk Cast Vote ===
export async function bulkCastVoteController(req: Request, res: Response) {
  try {
    const { proposalId, voteChoice, walletNumbers } = req.body;

    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    if (![0, 1, 2].includes(voteChoice)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid voteChoice (0=Yes, 1=No, 2=Abstain) is required' 
      });
    }

    const result = await bulkCastVote(proposalId, voteChoice, walletNumbers);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to bulk cast vote' 
    });
  }
}

// === Finalize Proposal ===
export async function finalizeProposalController(req: Request, res: Response) {
  try {
    const { proposalId, walletNumber } = req.body;

    if (!proposalId || typeof proposalId !== 'number') {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const userKeypair = walletNumber ? getMockWalletKeypair(walletNumber) : undefined;
    const result = await finalizeProposal(proposalId, userKeypair);
    
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to finalize proposal' 
    });
  }
}

// === Get Proposal Finalization Status ===
export async function getProposalFinalizationStatusController(req: Request, res: Response) {
  try {
    const { proposalId } = req.params;
    
    if (!proposalId || isNaN(Number(proposalId))) {
      return res.status(400).json({ 
        success: false, 
        error: 'Valid proposalId is required' 
      });
    }

    const result = await getProposalFinalizationStatus(Number(proposalId));
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error?.message || 'Failed to get proposal finalization status' 
    });
  }
}
