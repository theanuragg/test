import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { quoteResponse, userPublicKey, poolAddress } = req.body || {};
    if (!quoteResponse || !userPublicKey) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If poolAddress provided and pool not migrated, build DBC swap tx
    if (poolAddress) {
      const connection = new Connection(RPC_URL, 'confirmed');
      const dbc = new DynamicBondingCurveClient(connection, 'confirmed');
      const poolPubkey = new PublicKey(poolAddress);
      const poolState = await dbc.state.getPool(poolPubkey);

      if (poolState && poolState.isMigrated === 0) {
        const swapTx = await dbc.pool.swap({
          pool: poolPubkey,
          quote: quoteResponse,
          payer: new PublicKey(userPublicKey),
          swapBaseForQuote: quoteResponse.swapBaseForQuote,
          referralTokenAccount: undefined,
        });
        const { blockhash } = await connection.getLatestBlockhash();
        swapTx.feePayer = new PublicKey(userPublicKey);
        swapTx.recentBlockhash = blockhash;
        const swapTransactionB64 = swapTx
          .serialize({ requireAllSignatures: false, verifySignatures: false })
          .toString('base64');
        return res.status(200).json({ swapTransactionB64 });
      }
    }

    // Fallback to Jupiter swap tx
    const response = await fetch('https://lite-api.jup.ag/swap/v1/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quoteResponse, userPublicKey, wrapUnwrapSOL: true }),
    });
    if (!response.ok) return res.status(500).json({ error: `Jupiter Swap error: ${response.status}` });
    const jupTx = await response.json();
    return res.status(200).json({ swapTransactionB64: jupTx.swapTransaction });
  } catch (error) {
    console.error('hybrid tx error', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}


