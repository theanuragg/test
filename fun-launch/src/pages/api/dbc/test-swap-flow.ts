import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient, SwapMode } from '@meteora-ag/dynamic-bonding-curve-sdk';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { poolAddress, amount, isBuying } = req.body;

    if (!poolAddress || !amount || isBuying === undefined) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Create connection
    const connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
      'confirmed'
    );

    console.log('🔧 Testing DBC swap flow...');
    console.log('🔍 Pool address:', poolAddress);
    console.log('🔍 Amount:', amount);
    console.log('🔍 Is buying:', isBuying);

    // Create DBC client
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
    console.log('✅ DBC client created');

    // Get pool state
    const poolState = await dbcClient.state.getPool(new PublicKey(poolAddress));
    if (!poolState) {
      return res.status(404).json({ error: 'Pool not found' });
    }
    console.log('✅ Pool state retrieved');

    // Get pool config
    const poolConfig = await dbcClient.state.getPoolConfig(poolState.config);
    console.log('✅ Pool config retrieved');

    // Calculate amount in lamports
    const amountIn = parseFloat(amount) * Math.pow(10, isBuying ? 6 : 9); // USDC=6, Token=9
    console.log('🔍 Amount in lamports:', amountIn);

    // Get current point
    const currentPoint = await connection.getSlot();
    console.log('🔍 Current point:', currentPoint);

    // Get swap quote
    console.log('🔍 Getting swap quote...');
    const swapQuote = await dbcClient.pool.swapQuote2({
      virtualPool: poolState,
      config: poolConfig,
      swapBaseForQuote: isBuying ? false : true, // false = buy tokens, true = sell tokens
      amountIn: amountIn,
      slippageBps: 100, // 1% slippage
      hasReferral: false,
      currentPoint: currentPoint,
      swapMode: SwapMode.ExactIn,
    });

    console.log('✅ Swap quote received:', swapQuote);

    // Create swap transaction
    console.log('🔍 Creating swap transaction...');
    const swapTx = await dbcClient.pool.swap2({
      amountIn: amountIn,
      minimumAmountOut: swapQuote.minimumAmountOut,
      swapMode: SwapMode.ExactIn,
      swapBaseForQuote: isBuying ? false : true,
      owner: new PublicKey('11111111111111111111111111111111'), // Dummy owner for testing
      pool: new PublicKey(poolAddress),
      referralTokenAccount: null,
      payer: new PublicKey('11111111111111111111111111111111'), // Dummy payer for testing
    });

    console.log('✅ Swap transaction created');

    // Return test results
    res.status(200).json({
      success: true,
      message: 'DBC swap flow test completed successfully',
      data: {
        poolAddress,
        amount,
        isBuying,
        amountIn,
        swapQuote: {
          outputAmount: swapQuote.outputAmount?.toString(),
          minimumAmountOut: swapQuote.minimumAmountOut?.toString(),
        },
        transactionCreated: !!swapTx,
      },
    });

  } catch (error) {
    console.error('❌ DBC swap flow test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'DBC swap flow test failed',
    });
  }
}
