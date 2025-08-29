import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { inputMint, outputMint, amount, slippageBps = 50, poolAddress } = req.body || {};
    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // If a DBC pool is provided, prefer DBC quote when not migrated yet
    if (poolAddress) {
      const connection = new Connection(RPC_URL, 'confirmed');
      const dbc = new DynamicBondingCurveClient(connection, 'confirmed');
      const poolPubkey = new PublicKey(poolAddress);

      const poolState = await dbc.state.getPool(poolPubkey);
      if (poolState && poolState.isMigrated === 0) {
        const quote = await dbc.pool.swapQuote({
          pool: poolPubkey,
          inputMint: new PublicKey(inputMint),
          outputMint: new PublicKey(outputMint),
          amount,
          slippageBps,
          swapBaseForQuote: inputMint === poolState.baseMint.toString(),
          hasReferral: false,
        });
        return res.status(200).json(quote);
      }
    }

    // Fallback to Jupiter quote
    const response = await fetch('https://lite-api.jup.ag/swap/v1/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputMint, outputMint, amount, slippageBps }),
    });
    if (!response.ok) return res.status(500).json({ error: `Jupiter Quote error: ${response.status}` });
    const jupQuote = await response.json();
    return res.status(200).json(jupQuote);
  } catch (error) {
    console.error('hybrid quote error', error);
    return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}


