// pages/api/dbc/claim-fees.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { claimTradingFee } from '../../lib/dbc';
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

    await claimTradingFee(config, connection, wallet);

    res.status(200).json({
      success: true,
      data: { message: 'Trading fees claimed successfully' }
    });
  } catch (error) {
    console.error('DBC fee claim error:', error);
    res.status(500).json({
      error: 'Failed to claim trading fees',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
