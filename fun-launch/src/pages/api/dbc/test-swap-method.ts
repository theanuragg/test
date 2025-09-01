import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

interface TestSwapMethodResponse {
  success: boolean;
  error?: string;
  debug?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestSwapMethodResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('🧪 Testing DBC swap method...');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
    
    console.log('✅ DBC client created');
    
    // Test 1: Check swap method signature
    console.log('🔍 swap method:', dbcClient.pool.swap);
    console.log('🔍 swap type:', typeof dbcClient.pool.swap);
    
    // Test 2: Check if it's a function
    if (typeof dbcClient.pool.swap === 'function') {
      console.log('✅ swap is a function');
      
      // Test 3: Check function parameters
      const functionString = dbcClient.pool.swap.toString();
      console.log('🔍 Function signature:', functionString.substring(0, 200));
      
      // Test 4: Try to get parameter names (basic approach)
      const paramMatch = functionString.match(/\(([^)]*)\)/);
      if (paramMatch) {
        console.log('🔍 Parameters:', paramMatch[1]);
      }
      
    } else {
      console.log('❌ swap is not a function');
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
      swapType: typeof dbcClient.pool.swap,
      swapExists: !!dbcClient.pool.swap,
      availableSwapMethods: swapMethods,
      functionSignature: dbcClient.pool.swap.toString().substring(0, 200)
    };
    
    res.status(200).json({
      success: true,
      debug
    });

  } catch (error) {
    console.error('Test swap method error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
