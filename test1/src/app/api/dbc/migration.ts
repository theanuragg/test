// pages/api/dbc/migrate-v1.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { migrateDammV1 } from '../../lib/dbc/migration';
import { validateDbcConfigRequest } from '../../lib/validation';
import { cors } from '../../lib/cors';
import { getConnection, getWalletFromRequest } from '../../lib/solana';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await cors(req, res);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { config, walletPublicKey } = req.body;

    const connection = getConnection();
    const wallet = await getWalletFromRequest(walletPublicKey);

    if (!wallet) {
      return res.status(400).json({ error: 'Invalid wallet' });
    }

    const validation = validateDbcConfigRequest(config);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid config',
        details: validation.error
      });
    }

    await migrateDammV1(config, connection, wallet);

    res.status(200).json({
      success: true,
      data: { message: 'Migration to DAMM V1 completed successfully' }
    });
  } catch (error) {
    console.error('DBC migration error:', error);
    res.status(500).json({
      error: 'Failed to migrate to DAMM V1',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
