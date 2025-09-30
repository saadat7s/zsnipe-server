import { Request, Response } from 'express';
import {
  initializeGovernanceConfig,
  getGovernanceConfigInfo,
  updateGovernanceParameter,
  updateTimeMultiplier as svcUpdateTimeMultiplier,
  updateQuorumThreshold as svcUpdateQuorumThreshold,
  updateProposalStake as svcUpdateProposalStake,
  updateVotingPeriod as svcUpdateVotingPeriod,
  getVotingPowerWithConfig,
  validateProposalRequirements,
  toggleEmergencyMode,
  batchUpdateParameters,
  demonstrateGovernanceConfig,
  bulkTestGovernanceConfig,
  bulkTestVotingPower,
  bulkTestProposalValidation,
  testGovernanceIntegration,
  checkUserStakingStatus,
  ensureUserHasStaked,
  ParameterUpdateType,
} from '../services/governance-config/services';

export async function initConfig(req: Request, res: Response) {
  try {
    const result = await initializeGovernanceConfig();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Initialization failed' });
  }
}

export async function configInfo(req: Request, res: Response) {
  try {
    const result = await getGovernanceConfigInfo();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Fetch failed' });
  }
}

export async function updateParam(req: Request, res: Response) {
  try {
    const updateType = req.body?.updateType as ParameterUpdateType;
    if (!updateType || typeof updateType !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid updateType' });
    }
    
    const walletNumber = req.body?.walletNumber ? Number(req.body.walletNumber) : undefined;
    if (walletNumber !== undefined && (walletNumber < 1 || walletNumber > 10)) {
      return res.status(400).json({ 
        success: false, 
        error: 'walletNumber must be between 1 and 10' 
      });
    }

    const result = await updateGovernanceParameter(updateType, walletNumber);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Update failed' });
  }
}

export async function updateTimeMultiplier(req: Request, res: Response) {
  try {
    const tier = Number(req.body?.tier);
    const multiplier = Number(req.body?.multiplier);
    if (!Number.isFinite(tier) || !Number.isFinite(multiplier)) {
      return res.status(400).json({ success: false, error: 'Invalid tier/multiplier' });
    }
    const result = await svcUpdateTimeMultiplier(tier, multiplier);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Update failed' });
  }
}

export async function updateQuorumThreshold(req: Request, res: Response) {
  try {
    const percentage = Number(req.body?.percentage);
    if (!Number.isFinite(percentage)) {
      return res.status(400).json({ success: false, error: 'Invalid percentage' });
    }
    const result = await svcUpdateQuorumThreshold(percentage);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Update failed' });
  }
}

export async function updateProposalStake(req: Request, res: Response) {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    const result = await svcUpdateProposalStake(amount);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Update failed' });
  }
}

export async function updateVotingPeriod(req: Request, res: Response) {
  try {
    const hours = Number(req.body?.hours);
    if (!Number.isFinite(hours) || hours <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid hours' });
    }
    const result = await svcUpdateVotingPeriod(hours);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Update failed' });
  }
}

export async function votingPowerWithConfig(req: Request, res: Response) {
  try {
    const walletNumber = req.body?.walletNumber ? Number(req.body.walletNumber) : undefined;
    if (walletNumber !== undefined && (walletNumber < 1 || walletNumber > 10)) {
      return res.status(400).json({ 
        success: false, 
        error: 'walletNumber must be between 1 and 10' 
      });
    }

    const result = await getVotingPowerWithConfig(walletNumber);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Computation failed' });
  }
}

export async function validateProposal(req: Request, res: Response) {
  try {
    const proposerHistory = Number(req.body?.proposerHistory);
    if (!Number.isFinite(proposerHistory) || proposerHistory < 0) {
      return res.status(400).json({ success: false, error: 'Invalid proposerHistory' });
    }

    const walletNumber = req.body?.walletNumber ? Number(req.body.walletNumber) : undefined;
    if (walletNumber !== undefined && (walletNumber < 1 || walletNumber > 10)) {
      return res.status(400).json({ 
        success: false, 
        error: 'walletNumber must be between 1 and 10' 
      });
    }

    const result = await validateProposalRequirements(proposerHistory, walletNumber);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Validation failed' });
  }
}

export async function emergencyToggle(req: Request, res: Response) {
  try {
    const enabled = Boolean(req.body?.enabled);
    
    const walletNumber = req.body?.walletNumber ? Number(req.body.walletNumber) : undefined;
    if (walletNumber !== undefined && (walletNumber < 1 || walletNumber > 10)) {
      return res.status(400).json({ 
        success: false, 
        error: 'walletNumber must be between 1 and 10' 
      });
    }

    const result = await toggleEmergencyMode(enabled, walletNumber);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Toggle failed' });
  }
}

export async function batchUpdate(req: Request, res: Response) {
  try {
    const updates = req.body?.updates as ParameterUpdateType[];
    if (!Array.isArray(updates)) {
      return res.status(400).json({ success: false, error: 'updates must be an array' });
    }

    const walletNumber = req.body?.walletNumber ? Number(req.body.walletNumber) : undefined;
    if (walletNumber !== undefined && (walletNumber < 1 || walletNumber > 10)) {
      return res.status(400).json({ 
        success: false, 
        error: 'walletNumber must be between 1 and 10' 
      });
    }

    const result = await batchUpdateParameters(updates, walletNumber);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Batch update failed' });
  }
}

export async function checkStakingStatus(req: Request, res: Response) {
  try {
    const walletNumber = req.body?.walletNumber ? Number(req.body.walletNumber) : undefined;
    if (walletNumber !== undefined && (walletNumber < 1 || walletNumber > 10)) {
      return res.status(400).json({ 
        success: false, 
        error: 'walletNumber must be between 1 and 10' 
      });
    }

    const result = await checkUserStakingStatus(walletNumber);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Status check failed' });
  }
}

export async function ensureStaked(req: Request, res: Response) {
  try {
    const walletNumber = req.body?.walletNumber ? Number(req.body.walletNumber) : undefined;
    const minAmount = req.body?.minAmount ? Number(req.body.minAmount) : 1000;
    
    if (walletNumber !== undefined && (walletNumber < 1 || walletNumber > 10)) {
      return res.status(400).json({ 
        success: false, 
        error: 'walletNumber must be between 1 and 10' 
      });
    }

    if (!Number.isFinite(minAmount) || minAmount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid minAmount' });
    }

    const hasStaked = await ensureUserHasStaked(walletNumber, minAmount);
    res.status(200).json({ 
      success: true, 
      hasStaked, 
      walletNumber: walletNumber || 'admin',
      minAmount 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Stake check failed' });
  }
}

export async function demo(req: Request, res: Response) {
  try {
    const result = await demonstrateGovernanceConfig();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Demo failed' });
  }
}

export async function bulkTest(req: Request, res: Response) {
  try {
    const walletNumbers = req.body?.walletNumbers || [1, 2, 3, 4, 5];
    if (!Array.isArray(walletNumbers)) {
      return res.status(400).json({ success: false, error: 'walletNumbers must be an array' });
    }

    // Validate all wallet numbers
    for (const num of walletNumbers) {
      if (!Number.isInteger(num) || num < 1 || num > 10) {
        return res.status(400).json({ 
          success: false, 
          error: 'All walletNumbers must be integers between 1 and 10' 
        });
      }
    }

    const result = await bulkTestGovernanceConfig(walletNumbers);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Bulk test failed' });
  }
}

export async function bulkVotingPowerTest(req: Request, res: Response) {
  try {
    const walletNumbers = req.body?.walletNumbers || [1, 2, 3, 4, 5];
    if (!Array.isArray(walletNumbers)) {
      return res.status(400).json({ success: false, error: 'walletNumbers must be an array' });
    }

    // Validate all wallet numbers
    for (const num of walletNumbers) {
      if (!Number.isInteger(num) || num < 1 || num > 10) {
        return res.status(400).json({ 
          success: false, 
          error: 'All walletNumbers must be integers between 1 and 10' 
        });
      }
    }

    const result = await bulkTestVotingPower(walletNumbers);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Bulk voting power test failed' });
  }
}

export async function bulkProposalValidationTest(req: Request, res: Response) {
  try {
    const walletNumbers = req.body?.walletNumbers || [1, 2, 3, 4, 5];
    if (!Array.isArray(walletNumbers)) {
      return res.status(400).json({ success: false, error: 'walletNumbers must be an array' });
    }

    // Validate all wallet numbers
    for (const num of walletNumbers) {
      if (!Number.isInteger(num) || num < 1 || num > 10) {
        return res.status(400).json({ 
          success: false, 
          error: 'All walletNumbers must be integers between 1 and 10' 
        });
      }
    }

    const result = await bulkTestProposalValidation(walletNumbers);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Bulk proposal validation test failed' });
  }
}

export async function integrationTest(req: Request, res: Response) {
  try {
    const result = await testGovernanceIntegration();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Integration test failed' });
  }
}