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
  getAllProposalsController,
  getVoteRecordInterface,
  getProposalFinalizationStatusInterface,
  checkUserTokenBalanceInterface,
  previewVotingPowerInterface,
  checkEligibilityInterface,
  getProposalRequirementsInterface,
  initTreasuryInterface,
  fundTreasuryInterface,
  getTreasuryAccountInterfaceController,
  executeTextProposalInterface,
  executeTreasuryTransferInterface,
  executeParameterUpdateInterface,
  executeProposalSmartInterface,
  buildTextExecutionDataController,
  buildTreasuryExecutionDataControllerInterface,
  buildParameterExecutionDataController,
  decodeTreasuryExecutionDataController,
  decodeParameterExecutionDataController,
  getGovernanceConfigInterface
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
 * /api/zSnipe/data/governance-config:
 *   get:
 *     summary: Get current governance configuration
 *     tags: [Governance Data]
 *     responses:
 *       200:
 *         description: Current governance configuration parameters
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
 *                     authority:
 *                       type: string
 *                       description: Authority address
 *                     quorumPercentage:
 *                       type: number
 *                       description: Required quorum percentage
 *                     passingThreshold:
 *                       type: number
 *                       description: Required passing threshold percentage
 *                     timelockDuration:
 *                       type: number
 *                       description: Timelock duration in seconds
 *                     minStakeToPropose:
 *                       type: number
 *                       description: Minimum stake required to create proposals
 *                     proposalDeposit:
 *                       type: number
 *                       description: Required deposit for proposals
 *                     createdAt:
 *                       type: number
 *                       description: Creation timestamp
 *                     lastUpdated:
 *                       type: number
 *                       description: Last update timestamp
 *                     governanceConfigAddress:
 *                       type: string
 *                       description: Governance config account address
 *       404:
 *         description: Governance config not found
 *       500:
 *         description: Server error
 */
router.get('/data/governance-config', getGovernanceConfigInterface);

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
 * /api/zSnipe/data/proposals/all:
 *   get:
 *     summary: Get all proposals using getProgramAccounts (optimized)
 *     tags: [Proposal Data]
 *     responses:
 *       200:
 *         description: All proposals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *                   description: Number of proposals found
 *                 proposals:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       publicKey:
 *                         type: string
 *                         description: Proposal account public key
 *                       proposalId:
 *                         type: number
 *                         description: Unique proposal identifier
 *                       title:
 *                         type: string
 *                         description: Proposal title
 *                       description:
 *                         type: string
 *                         description: Proposal description
 *                       proposer:
 *                         type: string
 *                         description: Proposer's public key
 *                       status:
 *                         type: string
 *                         description: Current proposal status
 *                       proposalType:
 *                         type: string
 *                         description: Type of proposal
 *                       votingPeriodDays:
 *                         type: number
 *                         description: Voting period in days
 *                       createdAt:
 *                         type: number
 *                         description: Creation timestamp
 *                       votingEndsAt:
 *                         type: number
 *                         description: Voting end timestamp
 *                       finalizedAt:
 *                         type: number
 *                         description: Finalization timestamp
 *                       executedAt:
 *                         type: number
 *                         description: Execution timestamp
 *                       timelockEnd:
 *                         type: number
 *                         description: Timelock end timestamp
 *                       yesVotes:
 *                         type: number
 *                         description: Number of yes votes
 *                       noVotes:
 *                         type: number
 *                         description: Number of no votes
 *                       abstainVotes:
 *                         type: number
 *                         description: Number of abstain votes
 *                       totalVoters:
 *                         type: number
 *                         description: Total number of voters
 *                       depositAmount:
 *                         type: number
 *                         description: Proposal deposit amount
 *                       depositRefunded:
 *                         type: boolean
 *                         description: Whether deposit was refunded
 *       400:
 *         description: Error fetching proposals
 *       500:
 *         description: Server error
 */
router.get('/data/proposals/all', getAllProposalsController);


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

/**
 * @swagger
 * /api/zSnipe/data/token-balance/{userPublicKey}:
 *   get:
 *     summary: Check user token balance
 *     tags: [User Data]
 *     parameters:
 *       - in: path
 *         name: userPublicKey
 *         required: true
 *         schema:
 *           type: string
 *         description: User's Solana public key
 *     responses:
 *       200:
 *         description: User token balance information
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
 *                     balance:
 *                       type: number
 *                       description: Token balance in UI units
 *                     rawBalance:
 *                       type: string
 *                       description: Raw token balance (with decimals)
 *                     decimals:
 *                       type: number
 *                       description: Token decimals
 *                     tokenAccount:
 *                       type: string
 *                       description: Associated token account address
 *                     tokenMint:
 *                       type: string
 *                       description: Token mint address
 *                     userPublicKey:
 *                       type: string
 *                       description: User's public key
 *                     message:
 *                       type: string
 *                       description: Additional information (if account doesn't exist)
 *       400:
 *         description: Invalid userPublicKey
 *       500:
 *         description: Server error
 */
router.get('/data/token-balance/:userPublicKey', checkUserTokenBalanceInterface);

/**
 * @swagger
 * /api/zSnipe/transactions/execute/text:
 *   post:
 *     summary: Execute a text proposal transaction
 *     tags: [Proposal Execution]
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
 *                 description: Proposal ID to execute
 *     responses:
 *       200:
 *         description: Text proposal execution transaction created
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/transactions/execute/text', executeTextProposalInterface);

/**
 * @swagger
 * /api/zSnipe/transactions/execute/treasury:
 *   post:
 *     summary: Execute a treasury transfer proposal transaction
 *     tags: [Proposal Execution]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userPublicKey
 *               - proposalId
 *               - treasuryAccount
 *               - recipientAccount
 *             properties:
 *               userPublicKey:
 *                 type: string
 *                 description: User's Solana public key
 *               proposalId:
 *                 type: number
 *                 description: Proposal ID to execute
 *               treasuryAccount:
 *                 type: string
 *                 description: Treasury account address
 *               recipientAccount:
 *                 type: string
 *                 description: Recipient account address
 *     responses:
 *       200:
 *         description: Treasury transfer proposal execution transaction created
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/transactions/execute/treasury', executeTreasuryTransferInterface);

/**
 * @swagger
 * /api/zSnipe/transactions/execute/parameter:
 *   post:
 *     summary: Execute a parameter update proposal transaction
 *     tags: [Proposal Execution]
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
 *                 description: Proposal ID to execute
 *     responses:
 *       200:
 *         description: Parameter update proposal execution transaction created
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/transactions/execute/parameter', executeParameterUpdateInterface);

/**
 * @swagger
 * /api/zSnipe/transactions/execute:
 *   post:
 *     summary: Execute a smart proposal transaction (generic)
 *     tags: [Proposal Execution]
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
 *                 description: Proposal ID to execute
 *               treasuryAccount:
 *                 type: string
 *                 description: Treasury account address (optional, for treasury proposals)
 *               recipientAccount:
 *                 type: string
 *                 description: Recipient account address (optional, for treasury proposals)
 *     responses:
 *       200:
 *         description: Smart proposal execution transaction created
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/transactions/execute', executeProposalSmartInterface);

/**
 * @swagger
 * /api/zSnipe/admin/init-treasury:
 *   post:
 *     summary: Initialize the treasury account (Admin only)
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
 *         description: Treasury initialization transaction created
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/admin/init-treasury', initTreasuryInterface);

/**
 * @swagger
 * /api/zSnipe/admin/fund-treasury:
 *   post:
 *     summary: Fund the treasury account (Admin only)
 *     tags: [Admin]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adminPublicKey
 *               - amount
 *             properties:
 *               adminPublicKey:
 *                 type: string
 *                 description: Admin's Solana public key
 *               amount:
 *                 type: number
 *                 description: Amount to fund the treasury
 *     responses:
 *       200:
 *         description: Treasury funding transaction created
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/admin/fund-treasury', fundTreasuryInterface);

/**
 * @swagger
 * /api/zSnipe/data/treasury-account:
 *   get:
 *     summary: Get treasury account information
 *     tags: [Treasury Data]
 *     responses:
 *       200:
 *         description: Treasury account information
 *       500:
 *         description: Server error
 */
router.get('/data/treasury-account', getTreasuryAccountInterfaceController);


// Execution data builder endpoints
router.post('/execution-data/text', buildTextExecutionDataController);

/**
 * @swagger
 * /api/zSnipe/execution-data/treasury:
 *   post:
 *     summary: Build treasury transfer execution data
 *     tags: [Execution Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientAddress
 *               - amountTokens
 *             properties:
 *               recipientAddress:
 *                 type: string
 *                 description: Recipient wallet address
 *                 example: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU"
 *               amountTokens:
 *                 type: number
 *                 description: Amount in regular tokens (will be converted to microtokens)
 *                 example: 50
 *     responses:
 *       200:
 *         description: Treasury execution data built successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     executionData:
 *                       type: array
 *                       items:
 *                         type: number
 *                       description: Encoded execution data array
 *                     length:
 *                       type: number
 *                       description: Length of execution data
 *                     recipient:
 *                       type: string
 *                       description: Recipient address
 *                     amountTokens:
 *                       type: number
 *                       description: Input amount in tokens
 *                     amountMicroTokens:
 *                       type: number
 *                       description: Converted amount in microtokens
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   description: Error message
 *       500:
 *         description: Server error
 */
router.post('/execution-data/treasury', buildTreasuryExecutionDataControllerInterface);
router.post('/execution-data/parameter', buildParameterExecutionDataController);

/**
 * @swagger
 * /api/zSnipe/execution-data/decode/treasury:
 *   post:
 *     summary: Decode treasury execution data
 *     tags: [Execution Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - executionData
 *             properties:
 *               executionData:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Encoded execution data array
 *                 example: [1, 2, 3, 4, 5]
 *     responses:
 *       200:
 *         description: Treasury execution data decoded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Decoded treasury execution data
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   description: Error message
 *       500:
 *         description: Server error
 */
router.post('/execution-data/decode/treasury', decodeTreasuryExecutionDataController);

/**
 * @swagger
 * /api/zSnipe/execution-data/decode/parameter:
 *   post:
 *     summary: Decode parameter execution data
 *     tags: [Execution Data]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - executionData
 *             properties:
 *               executionData:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Encoded execution data array
 *                 example: [1, 2, 3, 4, 5]
 *     responses:
 *       200:
 *         description: Parameter execution data decoded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   description: Decoded parameter execution data
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   description: Error message
 *       500:
 *         description: Server error
 */
router.post('/execution-data/decode/parameter', decodeParameterExecutionDataController);

export default router;