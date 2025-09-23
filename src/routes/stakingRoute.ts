import { Router } from 'express';
import { initStakingPool } from '../controllers/stakingController';

const router = Router();

router.post('/init-staking-pool', initStakingPool);

export default router;


