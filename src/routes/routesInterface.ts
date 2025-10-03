import { Router } from 'express';
import { 
  initStakingPoolInterface,
  createStakeTransaction,
  createUnstakeTransaction,
  createInitGovernanceTransaction,
  createCalculateVotingPowerTransaction,
  createInitProposalEscrowTransaction,
  createProposalTransaction,
  createVoteTransaction,
  createFinalizeProposalTransactionInterface,
  getPoolInfoInterface,
  getUserStakingInfoInterface,
  getGovernanceInfoInterface,
  getProposalInfoInterface,
  listProposalsInterface,
  getVoteRecordInterface,
  getProposalFinalizationStatusInterface,
  previewVotingPowerInterface,
  checkEligibilityInterface,
  getProposalRequirementsInterface
} from '../controllers/servicesInterfaceController';

const router = Router();

/**
 * @swagger
 * /api/zSnipe/admin/init-staking-pool:
 *   post:
 *     summary: Initialize staking pool (Admin only)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adminPublicKey
 *             properties:
 *               adminPublicKey:
 *                 type: string
 *                 description: Admin's Solana public key
 *                 example: "758R2jFfces6Ue5B9rLmRrh8NesiU9dCtDa4bUSBpCMt"
 *     responses:
 *       200:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.post('/admin/init-staking-pool', initStakingPoolInterface);

/**
 * @swagger
 * /api/zSnipe/admin/init-proposal-escrow:
 *   post:
 *     summary: Initialize proposal escrow (Admin only)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adminPublicKey
 *             properties:
 *               adminPublicKey:
 *                 type: string
 *                 description: Admin's Solana public key
 *     responses:
 *       200:
 *         description: Transaction created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 */
router.post('/admin/init-proposal-escrow', createInitProposalEscrowTransaction);

/**
 * @swagger
 * /api/zSnipe/transactions/stake:
 *   post:
 *     summary: Create stake transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userPublicKey
 *               - amount
 *             properties:
 *               userPublicKey:
 *                 type: string
 *                 description: User's Solana public key
 *               amount:
 *                 type: number
 *                 description: Amount of tokens to stake
 *                 example: 1000
 *     responses:
 *       200:
 *         description: Stake transaction created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 */
router.post('/transactions/stake', createStakeTransaction);

/**
 * @swagger
 * /api/zSnipe/transactions/unstake:
 *   post:
 *     summary: Create unstake transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userPublicKey
 *               - amount
 *             properties:
 *               userPublicKey:
 *                 type: string
 *                 description: User's Solana public key
 *               amount:
 *                 type: number
 *                 description: Amount of tokens to unstake
 *                 example: 500
 *     responses:
 *       200:
 *         description: Unstake transaction created
 */
router.post('/transactions/unstake', createUnstakeTransaction);

/**
 * @swagger
 * /api/zSnipe/transactions/init-governance:
 *   post:
 *     summary: Create initialize governance account transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userPublicKey
 *             properties:
 *               userPublicKey:
 *                 type: string
 *                 description: User's Solana public key
 *     responses:
 *       200:
 *         description: Transaction created successfully
 */
router.post('/transactions/init-governance', createInitGovernanceTransaction);

/**
 * @swagger
 * /api/zSnipe/transactions/calculate-voting-power:
 *   post:
 *     summary: Create calculate voting power transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userPublicKey
 *             properties:
 *               userPublicKey:
 *                 type: string
 *     responses:
 *       200:
 *         description: Transaction created successfully
 */
router.post('/transactions/calculate-voting-power', createCalculateVotingPowerTransaction);

/**
 * @swagger
 * /api/zSnipe/transactions/create-proposal:
 *   post:
 *     summary: Create a new governance proposal
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userPublicKey
 *               - proposalId
 *               - title
 *               - description
 *             properties:
 *               userPublicKey:
 *                 type: string
 *               proposalId:
 *                 type: number
 *                 example: 1
 *               title:
 *                 type: string
 *                 example: "Increase staking rewards"
 *               description:
 *                 type: string
 *                 example: "Proposal to increase staking rewards by 10%"
 *               proposalType:
 *                 type: number
 *                 default: 0
 *               executionData:
 *                 type: array
 *                 items:
 *                   type: number
 *                 default: []
 *               votingPeriod:
 *                 type: number
 *                 default: 7
 *                 description: Voting period in days
 *     responses:
 *       200:
 *         description: Proposal transaction created
 */
router.post('/transactions/create-proposal', createProposalTransaction);

/**
 * @swagger
 * /api/zSnipe/transactions/cast-vote:
 *   post:
 *     summary: Cast a vote on a proposal
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userPublicKey
 *               - proposalId
 *               - voteChoice
 *             properties:
 *               userPublicKey:
 *                 type: string
 *               proposalId:
 *                 type: number
 *                 example: 1
 *               voteChoice:
 *                 type: number
 *                 description: "0 = Yes, 1 = No, 2 = Abstain"
 *                 enum: [0, 1, 2]
 *                 example: 0
 *     responses:
 *       200:
 *         description: Vote transaction created
 */
router.post('/transactions/cast-vote', createVoteTransaction);

/**
 * @swagger
 * /api/zSnipe/data/staking-pool:
 *   get:
 *     summary: Get staking pool information
 *     tags: [Staking Data]
 *     responses:
 *       200:
 *         description: Staking pool information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StakingPoolInfo'
 */
router.get('/data/staking-pool', getPoolInfoInterface);

/**
 * @swagger
 * /api/zSnipe/data/user-staking:
 *   get:
 *     summary: Get user staking information
 *     tags: [Staking Data]
 *     parameters:
 *       - in: query
 *         name: userPublicKey
 *         required: true
 *         schema:
 *           type: string
 *         description: User's Solana public key
 *     responses:
 *       200:
 *         description: User staking information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStakingInfo'
 */
router.get('/data/user-staking', getUserStakingInfoInterface);

/**
 * @swagger
 * /api/zSnipe/data/governance:
 *   get:
 *     summary: Get governance account information
 *     tags: [Governance Data]
 *     parameters:
 *       - in: query
 *         name: userPublicKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Governance account information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GovernanceInfo'
 */
router.get('/data/governance', getGovernanceInfoInterface);

/**
 * @swagger
 * /api/zSnipe/data/eligibility:
 *   get:
 *     summary: Check voting eligibility
 *     tags: [Governance Data]
 *     parameters:
 *       - in: query
 *         name: userPublicKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Voting eligibility status
 */
router.get('/data/eligibility', checkEligibilityInterface);

/**
 * @swagger
 * /api/zSnipe/data/proposals:
 *   get:
 *     summary: List all proposals
 *     tags: [Proposals]
 *     parameters:
 *       - in: query
 *         name: maxId
 *         schema:
 *           type: number
 *           default: 100
 *         description: Maximum proposal ID to check
 *     responses:
 *       200:
 *         description: List of proposals
 */
router.get('/data/proposals', listProposalsInterface);

/**
 * @swagger
 * /api/zSnipe/data/proposals/{proposalId}:
 *   get:
 *     summary: Get specific proposal information
 *     tags: [Proposals]
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: number
 *         description: Proposal ID
 *     responses:
 *       200:
 *         description: Proposal information
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProposalInfo'
 */
router.get('/data/proposals/:proposalId', getProposalInfoInterface);

/**
 * @swagger
 * /api/zSnipe/data/proposal-requirements:
 *   get:
 *     summary: Get proposal creation requirements
 *     tags: [Proposals]
 *     parameters:
 *       - in: query
 *         name: userPublicKey
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Proposal requirements
 */
router.get('/data/proposal-requirements', getProposalRequirementsInterface);

/**
 * @swagger
 * /api/zSnipe/data/votes/{proposalId}:
 *   get:
 *     summary: Get vote record for a user on a proposal
 *     tags: [Voting]
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: number
 *       - in: query
 *         name: userPublicKey
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Vote record
 */
router.get('/data/votes/:proposalId', getVoteRecordInterface);

/**
 * @swagger
 * /api/zSnipe/utils/preview-voting-power:
 *   get:
 *     summary: Preview voting power calculation
 *     tags: [Utilities]
 *     parameters:
 *       - in: query
 *         name: amount
 *         required: true
 *         schema:
 *           type: number
 *         description: Staked amount in tokens
 *       - in: query
 *         name: days
 *         required: true
 *         schema:
 *           type: number
 *         description: Stake duration in days
 *     responses:
 *       200:
 *         description: Calculated voting power
 */
router.get('/utils/preview-voting-power', previewVotingPowerInterface);

/**
 * @swagger
 * /api/zSnipe/transactions/finalize-proposal:
 *   post:
 *     summary: Create finalize proposal transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userPublicKey
 *               - proposalId
 *             properties:
 *               userPublicKey:
 *                 type: string
 *                 description: User's Solana public key
 *               proposalId:
 *                 type: number
 *                 description: Proposal ID to finalize
 *                 example: 1
 *     responses:
 *       200:
 *         description: Finalize proposal transaction created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionResponse'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 */
router.post('/transactions/finalize-proposal', createFinalizeProposalTransactionInterface);

/**
 * @swagger
 * /api/zSnipe/data/proposals/{proposalId}/finalization-status:
 *   get:
 *     summary: Get proposal finalization status
 *     tags: [Proposals]
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: number
 *         description: Proposal ID
 *     responses:
 *       200:
 *         description: Proposal finalization status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     proposalId:
 *                       type: number
 *                     currentStatus:
 *                       type: string
 *                     canFinalize:
 *                       type: boolean
 *                     votingEnded:
 *                       type: boolean
 *                     alreadyFinalized:
 *                       type: boolean
 *                     votingEndsAt:
 *                       type: number
 *                     finalizedAt:
 *                       type: number
 *                       nullable: true
 *                     timeUntilVotingEnds:
 *                       type: number
 *                     votes:
 *                       type: object
 *                       properties:
 *                         yes:
 *                           type: string
 *                         no:
 *                           type: string
 *                         abstain:
 *                           type: string
 *                         totalVoters:
 *                           type: number
 *       400:
 *         description: Invalid proposal ID
 *       500:
 *         description: Server error
 */
router.get('/data/proposals/:proposalId/finalization-status', getProposalFinalizationStatusInterface);

export default router;