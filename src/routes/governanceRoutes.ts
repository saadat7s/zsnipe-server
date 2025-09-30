import { Router } from 'express';
import {
  initConfig,
  configInfo,
  updateParam,
  updateTimeMultiplier,
  updateQuorumThreshold,
  updateProposalStake,
  updateVotingPeriod,
  votingPowerWithConfig,
  validateProposal,
  emergencyToggle,
  batchUpdate,
  demo,
  bulkTest,
  integrationTest,
} from '../controllers/governanceController';

const router = Router();

// Base governance-config routes
router.post('/init', initConfig);
router.get('/info', configInfo);

// Parameter updates
router.post('/update', updateParam);
router.post('/update/time-multiplier', updateTimeMultiplier);
router.post('/update/quorum-threshold', updateQuorumThreshold);
router.post('/update/proposal-stake', updateProposalStake);
router.post('/update/voting-period', updateVotingPeriod);

// Actions and checks
router.post('/voting-power', votingPowerWithConfig);
router.post('/validate-proposal', validateProposal);
router.post('/emergency-toggle', emergencyToggle);
router.post('/batch-update', batchUpdate);

// Utilities and tests
router.post('/demo', demo);
router.post('/bulk-test', bulkTest);
router.post('/integration-test', integrationTest);

export default router;


