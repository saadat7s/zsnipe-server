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
  submitVote
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

// Vote routes
router.post('/votes/cast', submitVote);
router.get('/votes/:proposalId', getVote);
router.post('/votes/bulk-cast', bulkVote);



export default router;