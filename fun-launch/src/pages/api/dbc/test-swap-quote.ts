import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

interface TestSwapQuoteResponse {
  success: boolean;
  error?: string;
  debug?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestSwapQuoteResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('🧪 Testing DBC swapQuote method...');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
    
    console.log('✅ DBC client created');
    
    // Test 1: Check method signature
    console.log('🔍 swapQuote method:', dbcClient.pool.swapQuote);
    console.log('🔍 swapQuote type:', typeof dbcClient.pool.swapQuote);
    
    // Test 2: Check if it's a function
    if (typeof dbcClient.pool.swapQuote === 'function') {
      console.log('✅ swapQuote is a function');
      
      // Test 3: Check function parameters
      const functionString = dbcClient.pool.swapQuote.toString();
      console.log('🔍 Function signature:', functionString.substring(0, 200));
      
      // Test 4: Try to get parameter names (basic approach)
      const paramMatch = functionString.match(/\(([^)]*)\)/);
      if (paramMatch) {
        console.log('🔍 Parameters:', paramMatch[1]);
      }
      
    } else {
      console.log('❌ swapQuote is not a function');
    }
    
    // Test 5: Check if there are other swap methods
    console.log('🔍 Available swap methods:');
    const swapMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(dbcClient.pool))
      .filter(name => name.includes('swap') || name.includes('Swap'));
    
    swapMethods.forEach(method => {
      const methodValue = (dbcClient.pool as any)[method];
      console.log(`  - ${method}: ${typeof methodValue}`);
    });
    
    const debug = {
      swapQuoteType: typeof dbcClient.pool.swapQuote,
      swapQuoteExists: !!dbcClient.pool.swapQuote,
      availableSwapMethods: swapMethods,
      functionSignature: dbcClient.pool.swapQuote.toString().substring(0, 200)
    };
    
    res.status(200).json({
      success: true,
      debug
    });

  } catch (error) {
    console.error('Test swapQuote error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
