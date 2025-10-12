import { Router } from 'express';
import {
  executeTextProposalInterface,
  executeTreasuryTransferInterface,
  executeParameterUpdateInterface,
  executeProposalSmartInterface,
} from '../controllersInterface/executionInterfaceController';

const router = Router();

/**
 * @swagger
 * /api/zSnipe/transactions/execute/text:
 *   post:
 *     summary: Execute text proposal transaction
 *     tags: [Execution Interface]
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
 *                 description: Proposal ID to execute
 *     responses:
 *       200:
 *         description: Text proposal execution transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/execute/text', executeTextProposalInterface);

/**
 * @swagger
 * /api/zSnipe/transactions/execute/treasury:
 *   post:
 *     summary: Execute treasury transfer proposal transaction
 *     tags: [Execution Interface]
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
 *                 description: User wallet public key
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
 *         description: Treasury transfer proposal execution transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/execute/treasury', executeTreasuryTransferInterface);

/**
 * @swagger
 * /api/zSnipe/transactions/execute/parameter:
 *   post:
 *     summary: Execute parameter update proposal transaction
 *     tags: [Execution Interface]
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
 *                 description: Proposal ID to execute
 *     responses:
 *       200:
 *         description: Parameter update proposal execution transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/execute/parameter', executeParameterUpdateInterface);

/**
 * @swagger
 * /api/zSnipe/transactions/execute:
 *   post:
 *     summary: Execute proposal smart (auto-detect type)
 *     tags: [Execution Interface]
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
 *                 description: Proposal ID to execute
 *               treasuryAccount:
 *                 type: string
 *                 description: Treasury account address (required for treasury transfers)
 *               recipientAccount:
 *                 type: string
 *                 description: Recipient account address (required for treasury transfers)
 *     responses:
 *       200:
 *         description: Proposal execution transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/execute', executeProposalSmartInterface);

export default router;
