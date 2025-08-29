import type { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

// Extract Helius API key from RPC_URL if HELIUS_API_KEY is not set
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 
  process.env.RPC_URL?.match(/api-key=([^&]+)/)?.[1] || '';

// Decode the pool config key if it's URL encoded
const PARTNER_CONFIG_KEY = decodeURIComponent(process.env.POOL_CONFIG_KEY as string || '');
const RPC_URL = process.env.RPC_URL || `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const debug: any = {
    env: {
      hasHelius: !!HELIUS_API_KEY,
      hasConfig: !!PARTNER_CONFIG_KEY,
      configKey: PARTNER_CONFIG_KEY,
      rpcUrl: RPC_URL,
    },
    heliusTransactions: [],
    dbcPools: [],
    error: null,
  };

  try {
    // Test 1: Check Helius transactions
    if (HELIUS_API_KEY && PARTNER_CONFIG_KEY) {
      try {
        const response = await fetch(`https://api.helius.xyz/v0/addresses/${PARTNER_CONFIG_KEY}/transactions?api-key=${HELIUS_API_KEY}&limit=10`);
        if (response.ok) {
          const transactions = await response.json();
          debug.heliusTransactions = transactions.map((tx: any) => ({
            signature: tx.signature,
            timestamp: tx.timestamp,
            accounts: tx.accountData?.length || 0,
            type: tx.type,
          }));
        } else {
          debug.heliusError = `HTTP ${response.status}: ${await response.text()}`;
        }
      } catch (e) {
        debug.heliusError = e instanceof Error ? e.message : 'Unknown error';
      }
    }

    // Test 2: Check DBC pools directly
    try {
      const connection = new Connection(RPC_URL, 'confirmed');
      const dbc = new DynamicBondingCurveClient(connection, 'confirmed');
      
      const allPools = await dbc.state.getPools();
      debug.totalDbcPools = allPools.length;
      
      // Check first few pools for our config
      for (const pool of allPools.slice(0, 20)) {
        try {
          const poolPubkey = (pool.publicKey || pool.pubkey || pool.pool || pool.address);
          if (!poolPubkey) continue;

          const poolState = await dbc.state.getPool(poolPubkey);
          
          debug.dbcPools.push({
            poolAddress: poolPubkey.toString(),
            configUsed: poolState.config.toString(),
            isOurConfig: poolState.config.toString() === PARTNER_CONFIG_KEY,
            baseMint: (pool.account?.baseMint || pool.baseMint)?.toString() || 'unknown',
          });

          // Stop after finding a few
          if (debug.dbcPools.length >= 10) break;
        } catch (e) {
          continue;
        }
      }
    } catch (e) {
      debug.dbcError = e instanceof Error ? e.message : 'Unknown error';
    }

  } catch (e) {
    debug.error = e instanceof Error ? e.message : 'Unknown error';
  }

  return res.status(200).json(debug);
}
