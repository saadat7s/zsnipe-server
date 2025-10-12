import { Router } from 'express';
import {
  initStakingPoolInterface,
  createStakeTransaction,
  createUnstakeTransaction,
  getPoolInfoInterface,
  getUserStakingInfoInterface,
  checkUserTokenBalanceInterface,
} from '../controllersInterface/stakingInterfaceController';

const router = Router();

/**
 * @swagger
 * /api/zSnipe/admin/init-staking-pool:
 *   post:
 *     summary: Initialize staking pool (Admin only)
 *     tags: [Staking Interface]
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
 *         description: Staking pool initialization transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/admin/init-staking-pool', initStakingPoolInterface);

/**
 * @swagger
 * /api/zSnipe/transactions/stake:
 *   post:
 *     summary: Create stake tokens transaction
 *     tags: [Staking Interface]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userPublicKey
 *               - amount
 *             properties:
 *               userPublicKey:
 *                 type: string
 *                 description: User wallet public key
 *               amount:
 *                 type: number
 *                 description: Amount of tokens to stake
 *     responses:
 *       200:
 *         description: Stake transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/stake', createStakeTransaction);

/**
 * @swagger
 * /api/zSnipe/transactions/unstake:
 *   post:
 *     summary: Create unstake tokens transaction
 *     tags: [Staking Interface]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userPublicKey
 *               - amount
 *             properties:
 *               userPublicKey:
 *                 type: string
 *                 description: User wallet public key
 *               amount:
 *                 type: number
 *                 description: Amount of tokens to unstake
 *     responses:
 *       200:
 *         description: Unstake transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/transactions/unstake', createUnstakeTransaction);

/**
 * @swagger
 * /api/zSnipe/data/staking-pool:
 *   get:
 *     summary: Get staking pool information
 *     tags: [Staking Interface]
 *     responses:
 *       200:
 *         description: Staking pool information retrieved successfully
 *       500:
 *         description: Internal server error
 */
router.get('/data/staking-pool', getPoolInfoInterface);

/**
 * @swagger
 * /api/zSnipe/data/user-staking/{userPublicKey}:
 *   get:
 *     summary: Get user staking information
 *     tags: [Staking Interface]
 *     parameters:
 *       - in: path
 *         name: userPublicKey
 *         required: true
 *         schema:
 *           type: string
 *         description: User wallet public key
 *     responses:
 *       200:
 *         description: User staking information retrieved successfully
 *       400:
 *         description: Bad request - missing user public key
 *       500:
 *         description: Internal server error
 */
router.get('/data/user-staking/:userPublicKey', getUserStakingInfoInterface);

/**
 * @swagger
 * /api/zSnipe/data/token-balance/{userPublicKey}:
 *   get:
 *     summary: Check user token balance
 *     tags: [Staking Interface]
 *     parameters:
 *       - in: path
 *         name: userPublicKey
 *         required: true
 *         schema:
 *           type: string
 *         description: User wallet public key
 *     responses:
 *       200:
 *         description: User token balance retrieved successfully
 *       400:
 *         description: Bad request - missing user public key
 *       500:
 *         description: Internal server error
 */
router.get('/data/token-balance/:userPublicKey', checkUserTokenBalanceInterface);

export default router;
