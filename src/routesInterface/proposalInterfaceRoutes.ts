import { Router } from 'express';
import {
  createInitProposalEscrowTransaction,
  createProposalTransaction,
  createVoteTransaction,
  getProposalInfoInterface,
  listProposalsInterface,
  getAllProposalsController,
  getVoteRecordInterface,
  getProposalRequirementsInterface,
  createFinalizeProposalTransactionInterface,
  getProposalFinalizationStatusInterface,
} from '../controllersInterface/proposalInterfaceController';

const router = Router();

/**
 * @swagger
 * /api/zSnipe/admin/init-proposal-escrow:
 *   post:
 *     summary: Initialize proposal escrow (Admin only)
 *     tags: [Proposal Interface]
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
 *                 description: Admin wallet public key
 *     responses:
 *       200:
 *         description: Proposal escrow initialization transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/admin/init-proposal-escrow', createInitProposalEscrowTransaction);

/**
 * @swagger
 * /api/zSnipe/transactions/create-proposal:
 *   post:
 *     summary: Create proposal transaction
 *     tags: [Proposal Interface]
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
 *               - proposalType
 *               - executionData
 *               - votingPeriod
 *             properties:
 *               userPublicKey:
 *                 type: string
 *                 description: User wallet public key
 *               proposalId:
 *                 type: number
 *                 description: Unique proposal ID
 *               title:
 *                 type: string
 *                 description: Proposal title
 *               description:
 *                 type: string
 *                 description: Proposal description
 *               proposalType:
 *                 type: number
 *                 description: Type of proposal (0=text, 1=treasury, 2=parameter)
 *               executionData:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Serialized execution data
 *               votingPeriod:
 *                 type: number
 *                 description: Voting period in days
 *     responses:
 *       200:
 *         description: Proposal transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/create-proposal', createProposalTransaction);

/**
 * @swagger
 * /api/zSnipe/transactions/vote:
 *   post:
 *     summary: Create cast vote transaction
 *     tags: [Proposal Interface]
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
 *                 description: User wallet public key
 *               proposalId:
 *                 type: number
 *                 description: Proposal ID to vote on
 *               voteChoice:
 *                 type: string
 *                 enum: [yes, no, abstain]
 *                 description: Vote choice
 *     responses:
 *       200:
 *         description: Vote transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/vote', createVoteTransaction);

/**
 * @swagger
 * /api/zSnipe/data/proposal/{proposalId}:
 *   get:
 *     summary: Get proposal information
 *     tags: [Proposal Interface]
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
 *         description: Bad request - missing proposal ID
 *       500:
 *         description: Internal server error
 */
router.get('/data/proposal/:proposalId', getProposalInfoInterface);

/**
 * @swagger
 * /api/zSnipe/data/proposals:
 *   get:
 *     summary: List all proposals
 *     tags: [Proposal Interface]
 *     parameters:
 *       - in: query
 *         name: maxProposalId
 *         schema:
 *           type: number
 *         description: Maximum proposal ID to fetch
 *     responses:
 *       200:
 *         description: Proposals list retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/data/proposals', listProposalsInterface);

/**
 * @swagger
 * /api/zSnipe/data/proposals/all:
 *   get:
 *     summary: Get all proposals using GPA
 *     tags: [Proposal Interface]
 *     responses:
 *       200:
 *         description: All proposals retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/data/proposals/all', getAllProposalsController);

/**
 * @swagger
 * /api/zSnipe/data/vote-record/{proposalId}/{userPublicKey}:
 *   get:
 *     summary: Get vote record for a user on a proposal
 *     tags: [Proposal Interface]
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: number
 *         description: Proposal ID
 *       - in: path
 *         name: userPublicKey
 *         required: true
 *         schema:
 *           type: string
 *         description: User wallet public key
 *     responses:
 *       200:
 *         description: Vote record retrieved successfully
 *       400:
 *         description: Bad request - missing required parameters
 *       500:
 *         description: Internal server error
 */
router.get('/data/vote-record/:proposalId/:userPublicKey', getVoteRecordInterface);

/**
 * @swagger
 * /api/zSnipe/data/proposal-requirements:
 *   get:
 *     summary: Get proposal requirements
 *     tags: [Proposal Interface]
 *     responses:
 *       200:
 *         description: Proposal requirements retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/data/proposal-requirements', getProposalRequirementsInterface);

/**
 * @swagger
 * /api/zSnipe/transactions/finalize-proposal:
 *   post:
 *     summary: Create finalize proposal transaction
 *     tags: [Proposal Interface]
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
 *                 description: User wallet public key
 *               proposalId:
 *                 type: number
 *                 description: Proposal ID to finalize
 *     responses:
 *       200:
 *         description: Finalize proposal transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/finalize-proposal', createFinalizeProposalTransactionInterface);

/**
 * @swagger
 * /api/zSnipe/data/proposal-finalization-status/{proposalId}:
 *   get:
 *     summary: Get proposal finalization status
 *     tags: [Proposal Interface]
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: number
 *         description: Proposal ID
 *     responses:
 *       200:
 *         description: Proposal finalization status retrieved successfully
 *       400:
 *         description: Bad request - missing proposal ID
 *       500:
 *         description: Internal server error
 */
router.get('/data/proposal-finalization-status/:proposalId', getProposalFinalizationStatusInterface);

export default router;
