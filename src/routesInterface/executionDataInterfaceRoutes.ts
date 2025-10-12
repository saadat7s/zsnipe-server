import { Router } from 'express';
import {
  buildTextExecutionDataController,
  buildTreasuryExecutionDataControllerInterface,
  buildParameterExecutionDataController,
} from '../controllersInterface/executionDataInterfaceController';

const router = Router();

/**
 * @swagger
 * /api/zSnipe/execution-data/text:
router.post('/text', buildTextExecutionDataController);
 *   post:
 *     summary: Build text execution data
 *     tags: [Execution Data Interface]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *                 description: Proposal title
 *               description:
 *                 type: string
 *                 description: Proposal description
 *     responses:
 *       200:
 *         description: Text execution data built successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/text', buildTextExecutionDataController);

/**
 * @swagger
 * /api/zSnipe/execution-data/treasury:
 *   post:
 *     summary: Build treasury transfer execution data
 *     tags: [Execution Data Interface]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient
 *               - amount
 *               - title
 *               - description
 *             properties:
 *               recipient:
 *                 type: string
 *                 description: Recipient wallet address
 *               amount:
 *                 type: number
 *                 description: Amount of tokens to transfer
 *               title:
 *                 type: string
 *                 description: Proposal title
 *               description:
 *                 type: string
 *                 description: Proposal description
 *     responses:
 *       200:
 *         description: Treasury transfer execution data built successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/treasury', buildTreasuryExecutionDataControllerInterface);

/**
 * @swagger
 * /api/zSnipe/execution-data/parameter:
 *   post:
 *     summary: Build parameter update execution data
 *     tags: [Execution Data Interface]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parameterName
 *               - newValue
 *               - title
 *               - description
 *             properties:
 *               parameterName:
 *                 type: string
 *                 description: Name of parameter to update
 *               newValue:
 *                 type: number
 *                 description: New value for the parameter
 *               title:
 *                 type: string
 *                 description: Proposal title
 *               description:
 *                 type: string
 *                 description: Proposal description
 *     responses:
 *       200:
 *         description: Parameter update execution data built successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/parameter', buildParameterExecutionDataController);

export default router;
