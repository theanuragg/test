/**
 * API Route: Claim Trading Fees
 * 
 * Allows creators and partners to claim accumulated trading fees from DBC pools
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

// Environment variables
const RPC_URL = process.env.RPC_URL as string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { poolAddress, userWallet, userSignature } = req.body;

    if (!poolAddress || !userWallet) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const connection = new Connection(RPC_URL, 'confirmed');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

    // Get pool state to check claimable fees
    const poolState = await dbcClient.state.getPool(new PublicKey(poolAddress));
    const poolConfig = await dbcClient.state.getPoolConfig(new PublicKey(poolAddress));

    // Check if user is authorized to claim fees
    const isAuthorized = 
      userWallet === poolConfig.feeClaimer || 
      userWallet === poolState.poolCreator;

    if (!isAuthorized) {
      return res.status(403).json({ 
        error: 'Not authorized to claim fees for this pool' 
      });
    }

    // Check if there are claimable fees
    const claimableFees = poolState.accumulatedFees;
    if (claimableFees.isZero()) {
      return res.status(400).json({ 
        error: 'No claimable fees available' 
      });
    }

    // Create claim transaction
    const claimTx = await dbcClient.pool.claimFees({
      pool: new PublicKey(poolAddress),
      feeClaimer: new PublicKey(userWallet),
      payer: new PublicKey(userWallet),
    });

    // Add compute unit price modification
    const { modifyComputeUnitPriceIx } = await import('../../lib/studio/helpers');
    modifyComputeUnitPriceIx(claimTx as any, 100000);

    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    claimTx.recentBlockhash = blockhash;
    claimTx.feePayer = new PublicKey(userWallet);

    // Return partially signed transaction
    return res.json({
      success: true,
      claimTx: claimTx.serialize().toString('base64'),
      claimableAmount: claimableFees.toString(),
      feeClaimer: poolConfig.feeClaimer.toString(),
      poolCreator: poolState.poolCreator.toString(),
    });

  } catch (error) {
    console.error('Error claiming fees:', error);
    
    let errorMessage = 'Failed to claim fees';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    return res.status(500).json({
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });
  }
}
