import { Request, Response } from 'express';
import { initializeStakingPool, stakeTokens, getStakingPoolInfo, getUserStakingInfo, checkUserTokenBalance } from '../services';

export async function initStakingPool(req: Request, res: Response) {
  try {
    const result = await initializeStakingPool();
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Initialization failed' });
  }
}

export async function stake(req: Request, res: Response) {
  try {
    const amount = Number(req.body?.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Invalid amount' });
    }
    const result = await stakeTokens(amount);
    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Stake failed' });
  }
}

export async function getPoolInfo(req: Request, res: Response) {
  try {
    const result = await getStakingPoolInfo();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Fetch failed' });
  }
}

export async function getUserInfo(req: Request, res: Response) {
  try {
    const pubkey = req.query.publicKey as string | undefined;
    const data = pubkey ? await getUserStakingInfo(new (require('@solana/web3.js').PublicKey)(pubkey)) : await getUserStakingInfo();
    res.status(200).json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Fetch failed' });
  }
}

export async function getUserBalance(req: Request, res: Response) {
  try {
    const result = await checkUserTokenBalance();
    res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || 'Fetch failed' });
  }
}


