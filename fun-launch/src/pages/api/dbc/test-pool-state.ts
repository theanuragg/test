import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

interface TestPoolStateRequest {
  poolAddress: string;
  tokenMint?: string;
}

interface TestPoolStateResponse {
  success: boolean;
  poolState?: any;
  poolConfig?: any;
  swapQuote?: any;
  error?: string;
  debug?: {
    quoteReserve: string;
    baseReserve: string;
    isMigrated: number;
    virtualPrice: number;
    effectivePrice: number;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestPoolStateResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { poolAddress, tokenMint } = req.body as TestPoolStateRequest;

    if (!poolAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing poolAddress parameter'
      });
    }

    console.log('🔍 Testing DBC pool state for:', poolAddress);
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
    const poolPubkey = new PublicKey(poolAddress);

    // Get pool state
    console.log('📊 Fetching pool state...');
    const poolState = await dbcClient.state.getPool(poolPubkey);
    
    if (!poolState) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found'
      });
    }

    console.log('✅ Pool state found:', {
      quoteReserve: poolState.quoteReserve.toString(),
      baseReserve: poolState.baseReserve.toString(),
      isMigrated: poolState.isMigrated,
      baseMint: poolState.baseMint.toString(),
      quoteMint: poolState.quoteMint.toString(),
    });

    // Get pool config
    console.log('⚙️ Fetching pool config...');
    const poolConfig = await dbcClient.state.getPoolConfig(poolState.account.config);
    
    if (!poolConfig) {
      return res.status(404).json({
        success: false,
        error: 'Pool config not found'
      });
    }

    console.log('✅ Pool config found');

    // Test swap quote (buy 5 USDC worth of tokens)
    console.log('💱 Testing swap quote for 5 USDC...');
    const testAmount = 5 * Math.pow(10, 6); // 5 USDC in lamports
    
    let swapQuote = null;
    try {
      swapQuote = await dbcClient.pool.swapQuote({
        pool: poolPubkey,
        inputMint: poolState.quoteMint,
        outputMint: poolState.baseMint,
        amount: testAmount,
        slippageBps: 100, // 1% slippage
        swapBaseForQuote: false, // Buy tokens (quote -> base)
        hasReferral: false,
      });
      
      console.log('✅ Swap quote successful:', {
        inputAmount: swapQuote.inputAmount.toString(),
        outputAmount: swapQuote.outputAmount.toString(),
        minimumAmountOut: swapQuote.minimumAmountOut.toString(),
      });
    } catch (quoteError) {
      console.error('❌ Swap quote failed:', quoteError);
      swapQuote = { error: quoteError instanceof Error ? quoteError.message : 'Unknown error' };
    }

    // Calculate virtual price (with $5K baseline)
    const virtualQuoteBaseline = 5000 * Math.pow(10, 6); // $5K in lamports
    const currentQuoteReserve = Number(poolState.quoteReserve.toString());
    const currentBaseReserve = Number(poolState.baseReserve.toString());
    
    const virtualPrice = (currentQuoteReserve + virtualQuoteBaseline) / currentBaseReserve;
    const effectivePrice = swapQuote && !swapQuote.error ? 
      Number(swapQuote.outputAmount.toString()) / (testAmount / Math.pow(10, 6)) : 0;

    const debug = {
      quoteReserve: poolState.quoteReserve.toString(),
      baseReserve: poolState.baseReserve.toString(),
      isMigrated: poolState.isMigrated,
      virtualPrice: virtualPrice / Math.pow(10, 6), // Convert to USDC
      effectivePrice: effectivePrice,
    };

    console.log('📊 Debug info:', debug);

    res.status(200).json({
      success: true,
      poolState: {
        quoteReserve: poolState.quoteReserve.toString(),
        baseReserve: poolState.baseReserve.toString(),
        isMigrated: poolState.isMigrated,
        baseMint: poolState.baseMint.toString(),
        quoteMint: poolState.quoteMint.toString(),
      },
      poolConfig: {
        buildCurveMode: poolConfig.buildCurveMode,
        migrationQuoteThreshold: poolConfig.migrationQuoteThreshold.toString(),
        totalTokenSupply: poolConfig.totalTokenSupply.toString(),
      },
      swapQuote: swapQuote,
      debug: debug,
    });

  } catch (error) {
    console.error('Test pool state error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
