// pages/api/dbc/swap.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { swap } from '../../lib/dbc';
import { validateDbcSwapRequest } from '../../lib/validation';
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

    const validation = validateDbcSwapRequest(config);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid config',
        details: validation.error
      });
    }

    await swap(config, connection, wallet);

    res.status(200).json({
      success: true,
      data: { message: 'Swap executed successfully' }
    });
  } catch (error) {
    console.error('DBC swap error:', error);
    res.status(500).json({
      error: 'Failed to execute swap',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
