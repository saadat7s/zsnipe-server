import { Router } from 'express';
import { 
  initStakingPool, 
  stakeTokensController, 
  unstakeTokensController, 
  getStakingPoolInfoController, 
  getUserStakingInfoController, 
  checkUserTokenBalanceController, 
  bulkStakeTokensController,
  getAllWalletsStatusController
} from '../controllers/stakingController';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Staking
 *   description: Staking pool and user staking management
 */

/**
 * @swagger
 * /api/staking/init-staking-pool:
 *   post:
 *     summary: Initialize the staking pool (Admin only)
 *     tags: [Staking]
 *     responses:
 *       200:
 *         description: Staking pool initialized successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transactionId:
 *                   type: string
 *                 stakingPool:
 *                   type: string
 *       500:
 *         description: Server error
 */
router.post('/init-staking-pool', initStakingPool);

/**
 * @swagger
 * /api/staking/stake-tokens:
 *   post:
 *     summary: Stake tokens
 *     tags: [Staking]
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
 *                 description: Amount of tokens to stake e.g. 100 for 100 ZSNIPE
 *               walletNumber:
 *                 type: number
 *                 description: Optional. Mock wallet number 1-10 to use for staking. If not provided, admin wallet is used.
 *     responses:
 *       200:
 *         description: Tokens staked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transactionId:
 *                   type: string
 *                 amount:
 *                   type: number
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/stake-tokens', stakeTokensController);

/**
 * @swagger
 * /api/staking/unstake-tokens:
 *   post:
 *     summary: Unstake tokens
 *     tags: [Staking]
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
 *                 description: Amount of tokens to unstake e.g. 50 for 50 ZSNIPE
 *               walletNumber:
 *                 type: number
 *                 description: Optional. Mock wallet number 1-10 to use for unstaking. If not provided, admin wallet is used.
 *     responses:
 *       200:
 *         description: Tokens unstaked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transactionId:
 *                   type: string
 *                 amount:
 *                   type: number
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/unstake-tokens', unstakeTokensController);

/**
 * @swagger
 * /api/staking/staking-pool-info:
 *   get:
 *     summary: Get staking pool information
 *     tags: [Staking]
 *     responses:
 *       200:
 *         description: Staking pool information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/StakingPool'
 *       500:
 *         description: Server error
 */
router.get('/staking-pool-info', getStakingPoolInfoController);

/**
 * @swagger
 * /api/staking/user-staking-info:
 *   get:
 *     summary: Get user staking information
 *     tags: [Staking]
 *     parameters:
 *       - in: query
 *         name: walletNumber
 *         schema:
 *           type: number
 *         description: Optional. Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: User staking information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/UserStakingAccount'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User staking account not found
 *       500:
 *         description: Server error
 */
router.get('/user-staking-info', getUserStakingInfoController);

/**
 * @swagger
 * /api/staking/user-token-balance:
 *   get:
 *     summary: Check user's ZSNIPE token balance
 *     tags: [Staking]
 *     parameters:
 *       - in: query
 *         name: walletNumber
 *         schema:
 *           type: number
 *         description: Optional. Mock wallet number 1-10
 *     responses:
 *       200:
 *         description: User token balance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     balance:
 *                       type: number
 *                     rawBalance:
 *                       type: string
 *                     decimals:
 *                       type: number
 *       400:
 *         description: Invalid input
 *       404:
 *         description: User token account not found or balance is zero
 *       500:
 *         description: Server error
 */
router.get('/user-token-balance', checkUserTokenBalanceController);

/**
 * @swagger
 * /api/staking/wallets/all:
 *   get:
 *     summary: Get staking and governance status for all mock wallets
 *     tags: [Staking]
 *     responses:
 *       200:
 *         description: Status of all mock wallets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 totalWallets:
 *                   type: number
 *                 wallets:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       walletNumber:
 *                         type: number
 *                       publicKey:
 *                         type: string
 *                       tokenBalance:
 *                         type: number
 *                       stakedAmount:
 *                         type: number
 *                       canVote:
 *                         type: boolean
 *                       stakeDuration:
 *                         type: number
 *                       votingPower:
 *                         type: number
 *                       hasGovernanceAccount:
 *                         type: boolean
 *                       isTokensLocked:
 *                         type: boolean
 *                       participationCount:
 *                         type: number
 *                       error:
 *                         type: string
 *       500:
 *         description: Server error
 */
router.get('/wallets/all', getAllWalletsStatusController);

/**
 * @swagger
 * /api/staking/wallets/bulk-stake:
 *   post:
 *     summary: Bulk stake tokens for multiple mock wallets
 *     tags: [Staking]
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
 *                 description: Amount of tokens to stake for each wallet e.g. 100 for 100 ZSNIPE
 *               walletNumbers:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Optional. Array of mock wallet numbers 1-10. If not provided, all 10 wallets are used.
 *     responses:
 *       200:
 *         description: Bulk staking initiated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 operation:
 *                   type: string
 *                 amount:
 *                   type: number
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       walletNumber:
 *                         type: number
 *                       success:
 *                         type: boolean
 *                       transactionId:
 *                         type: string
 *                       error:
 *                         type: string
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
router.post('/wallets/bulk-stake', bulkStakeTokensController);





export default router;