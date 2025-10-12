import { Router } from 'express';
import { initGovernanceConfigInterface } from '../controllersInterface/governanceConfigInterfaceController';

const router = Router();

/**
 * @swagger
 * /api/zSnipe/admin/init-governance-config:
 *   post:
 *     summary: Initialize governance config (Admin only)
 *     tags: [Governance Config Interface]
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
 *         description: Governance config initialization transaction created successfully
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Internal server error
 */
router.post('/admin/init-governance-config', initGovernanceConfigInterface);

export default router;
