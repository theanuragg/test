import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

interface TestSwapBuyTxResponse {
  success: boolean;
  error?: string;
  debug?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestSwapBuyTxResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('🧪 Testing DBC swapBuyTx method...');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
    
    console.log('✅ DBC client created');
    
    // Test 1: Check swapBuyTx method signature
    const swapBuyTxFunction = dbcClient.pool.swapBuyTx.toString();
    console.log('🔍 swapBuyTx function:', swapBuyTxFunction.substring(0, 300));
    
    // Test 2: Look for parameter destructuring
    const paramMatch = swapBuyTxFunction.match(/const\s*\{([^}]+)\}\s*=\s*swapBuyTxParam/);
    if (paramMatch) {
      console.log('🔍 Destructured parameters:', paramMatch[1]);
    }
    
    // Test 3: Look for other parameter patterns
    const allParamMatches = swapBuyTxFunction.match(/swapBuyTxParam\.(\w+)/g);
    if (allParamMatches) {
      console.log('🔍 All parameter references:', [...new Set(allParamMatches)]);
    }
    
    const debug = {
      functionSignature: swapBuyTxFunction.substring(0, 300),
      destructuredParams: paramMatch ? paramMatch[1] : 'Not found',
      allParamRefs: allParamMatches ? [...new Set(allParamMatches)] : 'Not found'
    };
    
    res.status(200).json({
      success: true,
      debug
    });

  } catch (error) {
    console.error('Test swapBuyTx error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
