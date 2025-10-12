import { Router } from 'express';
import {
  initTreasury,
  fundTreasuryController,
  getAdminTreasuryAccountController,
  getTreasuryAccountController,
} from '../controllers/treasuryController';

const router = Router();

/**
 * @swagger
 * /api/treasury/init:
 *   post:
 *     summary: Initialize treasury account (Admin only)
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Treasury initialized successfully
 *       500:
 *         description: Server error
 */
router.post('/init', initTreasury);

/**
 * @swagger
 * /api/treasury/fund:
 *   post:
 *     summary: Fund treasury with tokens
 *     tags: [Treasury]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - amount
 *             properties:
 *               amount:
 *                 type: number
 *                 description: Amount of tokens to fund treasury with
 *     responses:
 *       200:
 *         description: Treasury funded successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.post('/fund', fundTreasuryController);

/**
 * @swagger
 * /api/treasury/admin-account:
 *   get:
 *     summary: Get admin treasury account information
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Admin treasury account information retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/admin-account', getAdminTreasuryAccountController);

/**
 * @swagger
 * /api/treasury/account-info:
 *   get:
 *     summary: Get treasury account information
 *     tags: [Treasury]
 *     responses:
 *       200:
 *         description: Treasury account information retrieved successfully
 *       500:
 *         description: Server error
 */
router.get('/account-info', getTreasuryAccountController);

export default router;
