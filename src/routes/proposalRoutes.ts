import { Router } from 'express';
import {
  initProposalEscrow,
  createProposalController,
  getProposalInfoController,
  getAllProposalsController,
  castVoteController,
  getVoteRecordController,
  bulkCastVoteController,
  finalizeProposalController,
  getProposalFinalizationStatusController,
} from '../controllers/proposalController';

const router = Router();

/**
 * @swagger
 * /api/proposals/init-escrow:
 *   post:
 *     summary: Initialize proposal escrow (Admin only)
 *     tags: [Proposals]
 *     responses:
 *       200:
 *         description: Proposal escrow initialized successfully
 *       500:
 *         description: Server error
 */
router.post('/init-escrow', initProposalEscrow);

/**
 * @swagger
 * /api/proposals/create:
 *   post:
 *     summary: Create a new proposal
 *     tags: [Proposals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proposalId
 *               - title
 *               - description
 *               - proposalType
 *               - executionData
 *               - votingPeriod
 *             properties:
 *               proposalId:
 *                 type: number
 *                 description: Unique proposal ID
 *               title:
 *                 type: string
 *                 description: Proposal title max 100 chars
 *               description:
 *                 type: string
 *                 description: Proposal description max 1000 chars
 *               proposalType:
 *                 type: number
 *                 enum: [0, 1, 2]
 *                 description: 0=Text, 1=TreasuryTransfer, 2=ParameterUpdate
 *               executionData:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Execution data as array of bytes
 *               votingPeriod:
 *                 type: number
 *                 enum: [0, 1, 2]
 *                 description: 0=short, 1=medium, 2=long
 *               walletNumber:
 *                 type: number
 *                 description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Proposal created successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/create', createProposalController);

/**
 * @swagger
 * /api/proposals/{proposalId}:
 *   get:
 *     summary: Get proposal information
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
 *         description: Proposal information retrieved successfully
 *       400:
 *         description: Invalid proposal ID
 *       500:
 *         description: Server error
 */
router.get('/:proposalId', getProposalInfoController);

/**
 * @swagger
 * /api/proposals:
 *   get:
 *     summary: Get all proposals
 *     tags: [Proposals]
 *     parameters:
 *       - in: query
 *         name: maxProposalId
 *         schema:
 *           type: number
 *         description: Maximum proposal ID to fetch
 *     responses:
 *       200:
 *         description: All proposals retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/', getAllProposalsController);

/**
 * @swagger
 * /api/proposals/vote:
 *   post:
 *     summary: Cast a vote on a proposal
 *     tags: [Proposals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proposalId
 *               - voteChoice
 *             properties:
 *               proposalId:
 *                 type: number
 *                 description: Proposal ID to vote on
 *               voteChoice:
 *                 type: number
 *                 enum: [0, 1, 2]
 *                 description: 0=Yes, 1=No, 2=Abstain
 *               walletNumber:
 *                 type: number
 *                 description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Vote cast successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/vote', castVoteController);

/**
 * @swagger
 * /api/proposals/{proposalId}/vote-record:
 *   get:
 *     summary: Get vote record for a proposal
 *     tags: [Proposals]
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: number
 *         description: Proposal ID
 *       - in: query
 *         name: walletNumber
 *         schema:
 *           type: number
 *         description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Vote record retrieved successfully
 *       400:
 *         description: Invalid proposal ID
 *       500:
 *         description: Server error
 */
router.get('/:proposalId/vote-record', getVoteRecordController);

/**
 * @swagger
 * /api/proposals/bulk-vote:
 *   post:
 *     summary: Bulk cast votes for multiple wallets
 *     tags: [Proposals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proposalId
 *               - voteChoice
 *             properties:
 *               proposalId:
 *                 type: number
 *                 description: Proposal ID to vote on
 *               voteChoice:
 *                 type: number
 *                 enum: [0, 1, 2]
 *                 description: 0=Yes, 1=No, 2=Abstain
 *               walletNumbers:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Array of wallet numbers 1-10
 *     responses:
 *       200:
 *         description: Bulk voting completed
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/bulk-vote', bulkCastVoteController);

/**
 * @swagger
 * /api/proposals/finalize:
 *   post:
 *     summary: Finalize a proposal
 *     tags: [Proposals]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proposalId
 *             properties:
 *               proposalId:
 *                 type: number
 *                 description: Proposal ID to finalize
 *               walletNumber:
 *                 type: number
 *                 description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Proposal finalized successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/finalize', finalizeProposalController);

/**
 * @swagger
 * /api/proposals/{proposalId}/finalization-status:
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
 *         description: Finalization status retrieved successfully
 *       400:
 *         description: Invalid proposal ID
 *       500:
 *         description: Server error
 */
router.get('/:proposalId/finalization-status', getProposalFinalizationStatusController);

export default router;
