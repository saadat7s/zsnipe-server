import { Router } from 'express';
import {
  createInitGovernanceTransaction,
  createCalculateVotingPowerTransaction,
  getGovernanceInfoInterface,
  previewVotingPowerInterface,
  checkEligibilityInterface,
} from '../controllersInterface/governanceInterfaceController';

const router = Router();

/**
 * @swagger
 * /api/zSnipe/transactions/init-governance:
 *   post:
 *     summary: Create initialize governance account transaction
 *     tags: [Governance Interface]
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
 *                 description: User wallet public key
 *     responses:
 *       200:
 *         description: Initialize governance account transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/init-governance', createInitGovernanceTransaction);

/**
 * @swagger
 * /api/zSnipe/transactions/calculate-voting-power:
 *   post:
 *     summary: Create calculate voting power transaction
 *     tags: [Governance Interface]
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
 *                 description: User wallet public key
 *     responses:
 *       200:
 *         description: Calculate voting power transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/calculate-voting-power', createCalculateVotingPowerTransaction);

/**
 * @swagger
 * /api/zSnipe/data/governance/{userPublicKey}:
 *   get:
 *     summary: Get governance account information
 *     tags: [Governance Interface]
 *     parameters:
 *       - in: path
 *         name: userPublicKey
 *         required: true
 *         schema:
 *           type: string
 *         description: User wallet public key
 *     responses:
 *       200:
 *         description: Governance account information retrieved successfully
 *       400:
 *         description: Bad request - missing user public key
 *       500:
 *         description: Internal server error
 */
router.get('/data/governance/:userPublicKey', getGovernanceInfoInterface);

/**
 * @swagger
 * /api/zSnipe/preview/voting-power:
 *   post:
 *     summary: Preview voting power calculation
 *     tags: [Governance Interface]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - stakeAmount
 *               - stakeDurationDays
 *             properties:
 *               stakeAmount:
 *                 type: number
 *                 description: Amount of tokens staked
 *               stakeDurationDays:
 *                 type: number
 *                 description: Duration of stake in days
 *     responses:
 *       200:
 *         description: Voting power preview calculated successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/preview/voting-power', previewVotingPowerInterface);

/**
 * @swagger
 * /api/zSnipe/data/voting-eligibility/{userPublicKey}:
 *   get:
 *     summary: Check voting eligibility
 *     tags: [Governance Interface]
 *     parameters:
 *       - in: path
 *         name: userPublicKey
 *         required: true
 *         schema:
 *           type: string
 *         description: User wallet public key
 *     responses:
 *       200:
 *         description: Voting eligibility checked successfully
 *       400:
 *         description: Bad request - missing user public key
 *       500:
 *         description: Internal server error
 */
router.get('/data/voting-eligibility/:userPublicKey', checkEligibilityInterface);

export default router;
