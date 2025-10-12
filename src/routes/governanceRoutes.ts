import { Router } from 'express';
import {
  initGovernanceAccount,
  calculateVotingPowerController,
  calculateHybridVotingPowerController,
  checkVotingEligibilityController,
  getGovernanceAccountInfoController,
  getCompleteUserGovernanceDataController,
  bulkInitGovernanceAccountsController,
  bulkCalculateVotingPowerController,
} from '../controllers/governanceController';

const router = Router();

/**
 * @swagger
 * /api/governance/init-account:
 *   post:
 *     summary: Initialize governance account
 *     tags: [Governance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletNumber:
 *                 type: number
 *                 description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Governance account initialized successfully
 *       500:
 *         description: Server error
 */
router.post('/init-account', initGovernanceAccount);

/**
 * @swagger
 * /api/governance/calculate-voting-power:
 *   post:
 *     summary: Calculate voting power for a user
 *     tags: [Governance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletNumber:
 *                 type: number
 *                 description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Voting power calculated successfully
 *       500:
 *         description: Server error
 */
router.post('/calculate-voting-power', calculateVotingPowerController);

/**
 * @swagger
 * /api/governance/calculate-hybrid-voting-power:
 *   post:
 *     summary: Calculate hybrid voting power (client-side)
 *     tags: [Governance]
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
 *         description: Hybrid voting power calculated successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/calculate-hybrid-voting-power', calculateHybridVotingPowerController);

/**
 * @swagger
 * /api/governance/check-eligibility:
 *   get:
 *     summary: Check voting eligibility for a user
 *     tags: [Governance]
 *     parameters:
 *       - in: query
 *         name: walletNumber
 *         schema:
 *           type: number
 *         description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Voting eligibility checked successfully
 *       500:
 *         description: Server error
 */
router.get('/check-eligibility', checkVotingEligibilityController);

/**
 * @swagger
 * /api/governance/account-info:
 *   get:
 *     summary: Get governance account information
 *     tags: [Governance]
 *     parameters:
 *       - in: query
 *         name: walletNumber
 *         schema:
 *           type: number
 *         description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Governance account information retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/account-info', getGovernanceAccountInfoController);

/**
 * @swagger
 * /api/governance/complete-data:
 *   get:
 *     summary: Get complete user governance data
 *     tags: [Governance]
 *     parameters:
 *       - in: query
 *         name: walletNumber
 *         schema:
 *           type: number
 *         description: Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: Complete governance data retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/complete-data', getCompleteUserGovernanceDataController);

/**
 * @swagger
 * /api/governance/bulk-init-accounts:
 *   post:
 *     summary: Bulk initialize governance accounts for multiple wallets
 *     tags: [Governance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletNumbers:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Array of wallet numbers 1-10
 *     responses:
 *       200:
 *         description: Bulk governance account initialization completed
 *       500:
 *         description: Server error
 */
router.post('/bulk-init-accounts', bulkInitGovernanceAccountsController);

/**
 * @swagger
 * /api/governance/bulk-calculate-voting-power:
 *   post:
 *     summary: Bulk calculate voting power for multiple wallets
 *     tags: [Governance]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletNumbers:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Array of wallet numbers 1-10
 *     responses:
 *       200:
 *         description: Bulk voting power calculation completed
 *       500:
 *         description: Server error
 */
router.post('/bulk-calculate-voting-power', bulkCalculateVotingPowerController);

export default router;
