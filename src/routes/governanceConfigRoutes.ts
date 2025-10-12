import { Router } from 'express';
import { initGovernanceConfig } from '../controllers/governanceConfigController';

const router = Router();

/**
 * @swagger
 * /api/governance-config/init:
 *   post:
 *     summary: Initialize governance config (Admin only)
 *     tags: [Governance Config]
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
 *         description: Governance config initialized successfully
 *       500:
 *         description: Server error
 */
router.post('/init', initGovernanceConfig);

export default router;
