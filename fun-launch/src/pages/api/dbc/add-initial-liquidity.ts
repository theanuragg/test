import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

interface AddLiquidityRequest {
  tokenMint: string;
  userWallet: string;
  targetMarketCap?: number; // Optional, defaults to 5000
}

interface AddLiquidityResponse {
  success: boolean;
  signature?: string;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AddLiquidityResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { tokenMint, userWallet, targetMarketCap = 5000 } = req.body as AddLiquidityRequest;

    if (!tokenMint || !userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tokenMint, userWallet'
      });
    }

    console.log('💰 Adding initial liquidity for token:', tokenMint);
    console.log('🎯 Target market cap:', targetMarketCap);

    const connection = new Connection(RPC_URL, 'confirmed');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
    
    // Find the pool for this token
    const pools = await dbcClient.state.getPools();
    const pool = pools.find((p: any) => {
      const base = (p.account?.baseMint || p.baseMint);
      try {
        return base?.toString() === tokenMint;
      } catch {
        return false;
      }
    });
    
    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'No DBC pool found for this token'
      });
    }

    // Get pool public key
    const poolPubkeyObj = (pool as any).publicKey 
      ?? (pool as any).pubkey 
      ?? (pool as any).pool 
      ?? (pool as any).address;
    
    if (!poolPubkeyObj || typeof poolPubkeyObj.toString !== 'function') {
      return res.status(500).json({
        success: false,
        error: 'Failed to resolve pool address'
      });
    }

    const poolAddress = poolPubkeyObj.toString();
    console.log('✅ Found pool address:', poolAddress);

    // Get pool state and config
    const poolState = await dbcClient.state.getPool(new PublicKey(poolAddress));
    console.log('📊 Pool state:', {
      hasPoolState: !!poolState,
      totalTokenSupply: poolState?.totalTokenSupply?.toString(),
      quoteReserve: poolState?.quoteReserve?.toString(),
      baseReserve: poolState?.baseReserve?.toString(),
      baseMint: poolState?.baseMint?.toString(),
    });

    if (!poolState) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pool state'
      });
    }

    const poolConfig = await dbcClient.state.getPoolConfig(poolState.config);
    console.log('📊 Pool config:', {
      hasPoolConfig: !!poolConfig,
      quoteMint: poolConfig?.quoteMint?.toString(),
    });

    if (!poolConfig) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pool config'
      });
    }

    // Calculate how much USDC to add to achieve target market cap (handle large numbers safely)
    let totalSupply = 0;
    let currentQuoteReserve = 0;
    
    try {
      totalSupply = Number(poolState.totalTokenSupply.toString());
      currentQuoteReserve = Number(poolState.quoteReserve.toString());
    } catch (e) {
      console.warn('Failed to parse pool state numbers:', e);
      return res.status(500).json({
        success: false,
        error: 'Failed to parse pool state data'
      });
    }
    
    // Target quote reserve = target market cap (since price = quoteReserve / baseReserve)
    const targetQuoteReserve = targetMarketCap * Math.pow(10, 6); // USDC has 6 decimals
    const usdcToAdd = targetQuoteReserve - currentQuoteReserve;

    if (usdcToAdd <= 0) {
      return res.status(400).json({
        success: false,
        error: `Pool already has sufficient liquidity. Current market cap: $${(currentQuoteReserve / Math.pow(10, 6)).toFixed(2)}`
      });
    }

    console.log('📊 Liquidity calculation:', {
      totalSupply: totalSupply / Math.pow(10, 9), // Convert from lamports
      currentQuoteReserve: currentQuoteReserve / Math.pow(10, 6), // Convert from lamports
      targetQuoteReserve: targetQuoteReserve / Math.pow(10, 6),
      usdcToAdd: usdcToAdd / Math.pow(10, 6),
    });

    // Create swap transaction to add liquidity
    // We'll buy tokens with USDC, which adds USDC to the pool
    const swapAmount = usdcToAdd;
    
    console.log('🔄 Creating swap transaction to add liquidity...');
    
    const swapTx = await dbcClient.pool.swap({
      pool: new PublicKey(poolAddress),
      inputMint: poolConfig.quoteMint, // USDC
      outputMint: poolState.baseMint,  // Token
      amount: swapAmount,
      slippageBps: 100, // 1% slippage
      swapBaseForQuote: false, // Buy tokens (quote -> base)
      hasReferral: false,
      payer: new PublicKey(userWallet),
    });

    // Prepare transaction
    const { blockhash } = await connection.getLatestBlockhash();
    swapTx.feePayer = new PublicKey(userWallet);
    swapTx.recentBlockhash = blockhash;

    console.log('✅ Swap transaction created for liquidity addition');

    res.status(200).json({
      success: true,
      signature: swapTx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString('base64'),
      message: `Swap transaction created to add $${(usdcToAdd / Math.pow(10, 6)).toFixed(2)} USDC liquidity. Target market cap: $${targetMarketCap}`,
    });

  } catch (error) {
    console.error('Add liquidity error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
