import { Router } from 'express';
import {
  initTreasuryInterface,
  fundTreasuryInterface,
  getTreasuryAccountInterfaceController,
} from '../controllersInterface/treasuryInterfaceController';

const router = Router();

/**
 * @swagger
 * /api/zSnipe/admin/init-treasury:
 *   post:
 *     summary: Initialize treasury (Admin only)
 *     tags: [Treasury Interface]
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
 *         description: Treasury initialization transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/admin/init-treasury', initTreasuryInterface);

/**
 * @swagger
 * /api/zSnipe/admin/fund-treasury:
 *   post:
 *     summary: Fund treasury (Admin only)
 *     tags: [Treasury Interface]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - adminPublicKey
 *               - amountTokens
 *             properties:
 *               adminPublicKey:
 *                 type: string
 *                 description: Admin wallet public key
 *               amountTokens:
 *                 type: number
 *                 description: Amount of tokens to fund treasury
 *     responses:
 *       200:
 *         description: Fund treasury transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/admin/fund-treasury', fundTreasuryInterface);

/**
 * @swagger
 * /api/zSnipe/data/treasury-account:
 *   get:
 *     summary: Get treasury account information
 *     tags: [Treasury Interface]
 *     responses:
 *       200:
 *         description: Treasury account information retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/data/treasury-account', getTreasuryAccountInterfaceController);

export default router;
