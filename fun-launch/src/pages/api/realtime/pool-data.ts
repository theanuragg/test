import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { poolAddress, baseMint, quoteMint, tokenDecimals = 9, quoteDecimals = 6 } = req.body;

    if (!poolAddress) {
      return res.status(400).json({ error: 'Pool address is required' });
    }

    // Use devnet connection
    const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

    const poolPubkey = new PublicKey(poolAddress);
    
    // Get current pool state
    const poolState = await dbcClient.state.getPool(poolPubkey);
    if (!poolState) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    // Get pool config for proper calculations
    const poolConfigData = await dbcClient.state.getPoolConfig(poolState.config);
    if (!poolConfigData) {
      return res.status(404).json({ error: 'Pool config not found' });
    }

    console.log('🔍 Pool config:', {
      sqrtStartPrice: poolConfigData.sqrtStartPrice?.toNumber(),
      tokenDecimal: poolConfigData.tokenDecimal,
      curve: poolConfigData.curve?.length
    });

    // Access pool state properties safely based on Meteora DBC SDK structure
    const virtualTokenReserves = (poolState as any).virtualTokenReserves?.toNumber() || 0;
    const virtualQuoteReserves = (poolState as any).virtualQuoteReserves?.toNumber() || 0;
    const realTokenReserves = (poolState as any).realTokenReserves?.toNumber() || 0;
    const realQuoteReserves = (poolState as any).realQuoteReserves?.toNumber() || 0;
    const totalSupply = (poolState as any).totalSupply?.toNumber() || 0;

    console.log('🔍 Pool state values:', {
      virtualTokenReserves,
      virtualQuoteReserves,
      realTokenReserves,
      realQuoteReserves,
      totalSupply
    });

    // Price calculation using Meteora DBC formula
    // Based on the StackExchange answer: price = realQuoteReserves / realTokenReserves
    let price = 0;
    if (realTokenReserves > 0) {
      price = realQuoteReserves / realTokenReserves;
    }
    
    // Market cap calculation
    const marketCap = price * totalSupply;
    
    // Bonding curve progress calculation
    // Calculate progress based on virtual vs real reserves
    let bondingCurveProgress = 0;
    if (virtualTokenReserves > 0 && realTokenReserves > 0) {
      // Progress = (virtualTokenReserves - realTokenReserves) / virtualTokenReserves * 100
      const tokensSold = virtualTokenReserves - realTokenReserves;
      bondingCurveProgress = Math.max(0, Math.min(100, (tokensSold / virtualTokenReserves) * 100));
    }

    // Calculate circulating supply (tokens available for trading)
    const circulatingSupply = realTokenReserves;

    // Get recent transactions for volume calculation
    const signatures = await connection.getSignaturesForAddress(
      poolPubkey,
      { limit: 50 }
    );

    let volume24h = 0;
    const now = Date.now();
    const oneDayAgo = now - (24 * 60 * 60 * 1000);

    // Calculate volume from recent transactions
    for (const sig of signatures.slice(0, 20)) {
      if (sig.blockTime && sig.blockTime * 1000 > oneDayAgo) {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });
          
          if (tx && tx.meta) {
            const preBalances = tx.meta.preBalances;
            const postBalances = tx.meta.postBalances;
            
            for (let i = 0; i < preBalances.length; i++) {
              const balanceChange = Math.abs(postBalances[i] - preBalances[i]);
              if (balanceChange > 0) {
                volume24h += balanceChange / 1e9; // Convert lamports to SOL
              }
            }
          }
        } catch (err) {
          // Skip failed transactions
          continue;
        }
      }
    }

    const marketData = {
      price,
      marketCap,
      volume24h,
      bondingCurveProgress,
      totalSupply,
      circulatingSupply,
      lastUpdated: new Date().toISOString(),
      poolState: {
        virtualTokenReserves,
        virtualQuoteReserves,
        realTokenReserves,
        realQuoteReserves,
        totalSupply
      }
    };

    res.status(200).json({
      success: true,
      data: marketData
    });

  } catch (error) {
    console.error('Real-time pool data error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
