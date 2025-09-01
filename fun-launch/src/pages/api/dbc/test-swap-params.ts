import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

interface TestSwapParamsResponse {
  success: boolean;
  error?: string;
  debug?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestSwapParamsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('🧪 Testing DBC swap parameters...');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
    
    console.log('✅ DBC client created');
    
    // Test 1: Check swap method signature in detail
    const swapFunction = dbcClient.pool.swap.toString();
    console.log('🔍 Full swap function:', swapFunction);
    
    // Test 2: Look for parameter destructuring
    const paramMatch = swapFunction.match(/const\s*\{([^}]+)\}\s*=\s*swapParam/);
    if (paramMatch) {
      console.log('🔍 Destructured parameters:', paramMatch[1]);
    }
    
    // Test 3: Look for other parameter patterns
    const allParamMatches = swapFunction.match(/swapParam\.(\w+)/g);
    if (allParamMatches) {
      console.log('🔍 All parameter references:', [...new Set(allParamMatches)]);
    }
    
    // Test 4: Check if there's a swapBuyTx method that might be simpler
    if (dbcClient.pool.swapBuyTx) {
      console.log('🔍 swapBuyTx method exists, checking signature...');
      const swapBuyTxFunction = dbcClient.pool.swapBuyTx.toString();
      console.log('🔍 swapBuyTx signature:', swapBuyTxFunction.substring(0, 200));
    }
    
    const debug = {
      fullFunction: swapFunction,
      destructuredParams: paramMatch ? paramMatch[1] : 'Not found',
      allParamRefs: allParamMatches ? [...new Set(allParamMatches)] : 'Not found',
      hasSwapBuyTx: !!dbcClient.pool.swapBuyTx
    };
    
    res.status(200).json({
      success: true,
      debug
    });

  } catch (error) {
    console.error('Test swap params error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
