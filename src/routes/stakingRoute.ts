import { Router } from 'express';
import { 
  initStakingPool, 
  stake, 
  getPoolInfo, 
  getUserInfo, 
  getUserBalance, 
  unstake, 
  initGovernanceAccount, 
  computeVotingPower, 
  previewVotingPower, 
  eligibility, 
  governanceInfo, 
  governanceSummary,
  getAllWallets,
  bulkStake,
  bulkInitGovernance,
  getProposalRequirements,
  initProposalEscrow,
  submitProposal,
  getProposal,
  listProposals,
  bulkVote,
  getVote,
  submitVote,
  finalizeProposalController,
  getFinalizationStatusController,
  initializeGovernanceConfigController,
  executeTextProposalController,
  executeTreasuryTransferController,
  executeParameterUpdateController,
  executeProposalSmartController,
  getExecutionReadinessController,
  getExecutionPreviewController,
  bulkExecuteController,
  getExecutionScheduleController,
  getAdminTreasuryController,
  initializeTreasuryController,
  fundTreasuryController,
  getTreasuryAccountController,
  buildTreasuryExecutionDataController,
  buildParameterExecutionDataController,
  decodeTreasuryExecutionDataController,
  decodeParameterExecutionDataController
} from '../controllers/stakingController';

const router = Router();

// Core staking routes
router.post('/init-staking-pool', initStakingPool);
router.post('/stake-tokens', stake);
router.get('/staking-pool-info', getPoolInfo);
router.get('/user-staking-info', getUserInfo);
router.get('/user-token-balance', getUserBalance);
router.post('/unstake-tokens', unstake);

// Governance routes
router.post('/governance/init', initGovernanceAccount);
router.post('/governance/compute-voting-power', computeVotingPower);
router.get('/governance/preview-voting-power', previewVotingPower);
router.get('/governance/eligibilit  y', eligibility);
router.get('/governance/info', governanceInfo);
router.get('/governance/summary', governanceSummary);
router.post('/governance/config/initialize', initializeGovernanceConfigController);

// Mock wallet simulation routes
router.get('/wallets/all', getAllWallets);
router.post('/wallets/bulk-stake', bulkStake);
router.post('/wallets/bulk-init-governance', bulkInitGovernance);

// Proposal routes
router.post('/proposals/init-escrow', initProposalEscrow);
router.post('/proposals/create', submitProposal);
router.get('/proposals/requirements', getProposalRequirements);
router.get('/proposals/list', listProposals);
router.get('/proposals/:proposalId', getProposal);
router.post('/proposals/:proposalId/finalize', finalizeProposalController);
router.get('/proposals/:proposalId/finalization-status', getFinalizationStatusController);
router.get('/proposals/:proposalId/execution-readiness', getExecutionReadinessController);
router.get('/proposals/:proposalId/execution-preview', getExecutionPreviewController);
router.post('/proposals/bulk-execute', bulkExecuteController);
router.get('/proposals/execution-schedule', getExecutionScheduleController);

// Proposal execution routes
router.post('/proposals/:proposalId/execute/text', executeTextProposalController);
router.post('/proposals/:proposalId/execute/treasury', executeTreasuryTransferController);
router.post('/proposals/:proposalId/execute/parameter', executeParameterUpdateController);
router.post('/proposals/:proposalId/execute', executeProposalSmartController);

// Treasury and execution data routes
router.get('/governance/treasury/admin-account', getAdminTreasuryController);
router.post('/governance/treasury/initialize', initializeTreasuryController);
router.post('/governance/treasury/fund', fundTreasuryController);
router.get('/governance/treasury/account', getTreasuryAccountController);
router.post('/governance/execution-data/treasury', buildTreasuryExecutionDataController);
router.post('/governance/execution-data/parameter', buildParameterExecutionDataController);
router.post('/governance/execution-data/decode/treasury', decodeTreasuryExecutionDataController);
router.post('/governance/execution-data/decode/parameter', decodeParameterExecutionDataController);


// Vote routes
router.post('/votes/cast', submitVote);
router.get('/votes/:proposalId', getVote);
router.post('/votes/bulk-cast', bulkVote);





export default router;