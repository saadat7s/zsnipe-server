import { Router } from 'express';
import {
  executeProposalController,
  getProposalExecutionStatusController,
  executeTextProposalController,
  executeTreasuryTransferProposalController,
  executeParameterUpdateProposalController,
  executeProposalSmartController,
  getExecutionReadinessReportController,
  bulkExecuteReadyProposalsController,
  getExecutionScheduleController,
  getProposalExecutionPreviewController,
} from '../controllers/executionController';

const router = Router();

/**
 * @swagger
 * /api/execution/execute:
 *   post:
 *     summary: Execute a proposal
 *     tags: [Execution]
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
 *                 description: Proposal ID to execute
 *               walletNumber:
 *                 type: number
 *                 description: Mock wallet number 1-10
 *               treasuryAccount:
 *                 type: string
 *                 description: Treasury account address for treasury transfer proposals
 *               recipientAccount:
 *                 type: string
 *                 description: Recipient account address for treasury transfer proposals
 *     responses:
 *       200:
 *         description: Proposal executed successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/execute', executeProposalController);

/**
 * @swagger
 * /api/execution/{proposalId}/status:
 *   get:
 *     summary: Get proposal execution status
 *     tags: [Execution]
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: number
 *         description: Proposal ID
 *     responses:
 *       200:
 *         description: Execution status retrieved successfully
 *       400:
 *         description: Invalid proposal ID
 *       500:
 *         description: Server error
 */
router.get('/:proposalId/status', getProposalExecutionStatusController);

/**
 * @swagger
 * /api/execution/execute/text:
 *   post:
 *     summary: Execute a text proposal
 *     tags: [Execution]
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
 *                 description: Proposal ID to execute
 *               walletNumber:
 *                 type: number
 *                 description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Text proposal executed successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/execute/text', executeTextProposalController);

/**
 * @swagger
 * /api/execution/execute/treasury:
 *   post:
 *     summary: Execute a treasury transfer proposal
 *     tags: [Execution]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - proposalId
 *               - treasuryAccount
 *               - recipientAccount
 *             properties:
 *               proposalId:
 *                 type: number
 *                 description: Proposal ID to execute
 *               treasuryAccount:
 *                 type: string
 *                 description: Treasury account address
 *               recipientAccount:
 *                 type: string
 *                 description: Recipient account address
 *               walletNumber:
 *                 type: number
 *                 description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Treasury transfer proposal executed successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/execute/treasury', executeTreasuryTransferProposalController);

/**
 * @swagger
 * /api/execution/execute/parameter:
 *   post:
 *     summary: Execute a parameter update proposal
 *     tags: [Execution]
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
 *                 description: Proposal ID to execute
 *               walletNumber:
 *                 type: number
 *                 description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Parameter update proposal executed successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/execute/parameter', executeParameterUpdateProposalController);

/**
 * @swagger
 * /api/execution/execute/smart:
 *   post:
 *     summary: Execute a proposal with smart type detection
 *     tags: [Execution]
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
 *                 description: Proposal ID to execute
 *               walletNumber:
 *                 type: number
 *                 description: Mock wallet number 1-10
 *               treasuryAccount:
 *                 type: string
 *                 description: Treasury account address for treasury transfer proposals
 *               recipientAccount:
 *                 type: string
 *                 description: Recipient account address for treasury transfer proposals
 *     responses:
 *       200:
 *         description: Proposal executed successfully with smart detection
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/execute/smart', executeProposalSmartController);

/**
 * @swagger
 * /api/execution/{proposalId}/readiness-report:
 *   get:
 *     summary: Get execution readiness report for a proposal
 *     tags: [Execution]
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: number
 *         description: Proposal ID
 *     responses:
 *       200:
 *         description: Execution readiness report retrieved successfully
 *       400:
 *         description: Invalid proposal ID
 *       500:
 *         description: Server error
 */
router.get('/:proposalId/readiness-report', getExecutionReadinessReportController);

/**
 * @swagger
 * /api/execution/bulk-execute:
 *   post:
 *     summary: Bulk execute all ready proposals
 *     tags: [Execution]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxProposalId:
 *                 type: number
 *                 description: Maximum proposal ID to check
 *               walletNumber:
 *                 type: number
 *                 description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Bulk execution completed
 *       500:
 *         description: Server error
 */
router.post('/bulk-execute', bulkExecuteReadyProposalsController);

/**
 * @swagger
 * /api/execution/schedule:
 *   get:
 *     summary: Get execution schedule for all proposals
 *     tags: [Execution]
 *     parameters:
 *       - in: query
 *         name: maxProposalId
 *         schema:
 *           type: number
 *         description: Maximum proposal ID to check
 *     responses:
 *       200:
 *         description: Execution schedule retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/schedule', getExecutionScheduleController);

/**
 * @swagger
 * /api/execution/{proposalId}/preview:
 *   get:
 *     summary: Get proposal execution preview
 *     tags: [Execution]
 *     parameters:
 *       - in: path
 *         name: proposalId
 *         required: true
 *         schema:
 *           type: number
 *         description: Proposal ID
 *     responses:
 *       200:
 *         description: Execution preview retrieved successfully
 *       400:
 *         description: Invalid proposal ID
 *       500:
 *         description: Server error
 */
router.get('/:proposalId/preview', getProposalExecutionPreviewController);

export default router;
