import { Router } from 'express';
import { initStakingPool, stake, getPoolInfo, getUserInfo, getUserBalance, unstake } from '../controllers/stakingController';

const router = Router();

router.post('/init-staking-pool', initStakingPool);
router.post('/stake-tokens', stake);
router.get('/staking-pool-info', getPoolInfo);
router.get('/user-staking-info', getUserInfo);
router.get('/user-token-balance', getUserBalance);
router.post('/unstake-tokens', unstake);

export default router;


