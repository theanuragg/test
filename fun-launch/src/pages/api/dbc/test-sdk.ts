import { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

interface TestSdkResponse {
  success: boolean;
  sdkVersion?: string;
  clientCreated?: boolean;
  hasPool?: boolean;
  hasState?: boolean;
  error?: string;
  debug?: any;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestSdkResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    console.log('🧪 Testing DBC SDK...');
    
    // Test 1: Check if SDK can be imported
    console.log('📦 DBC SDK imported successfully');
    
    // Test 2: Create connection
    console.log('🔌 Creating Solana connection...');
    const connection = new Connection(RPC_URL, 'confirmed');
    console.log('✅ Connection created');
    
    // Test 3: Create DBC client
    console.log('🔧 Creating DBC client...');
    let dbcClient;
    let clientCreated = false;
    
    try {
      dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
      clientCreated = true;
      console.log('✅ DBC client created successfully');
    } catch (clientError) {
      console.error('❌ Failed to create DBC client:', clientError);
      return res.status(500).json({
        success: false,
        error: `Failed to create DBC client: ${clientError instanceof Error ? clientError.message : 'Unknown error'}`,
        debug: {
          clientCreated: false,
          hasPool: false,
          hasState: false
        }
      });
    }
    
    // Test 4: Check client properties
    console.log('🔍 Checking client properties...');
    const hasPool = !!dbcClient.pool;
    const hasState = !!dbcClient.state;
    
    console.log('📊 Client properties:', {
      hasPool,
      hasState,
      poolType: typeof dbcClient.pool,
      stateType: typeof dbcClient.state
    });
    
    // Test 5: Try to access pool methods
    let poolMethods = [];
    let stateMethods = [];
    
    if (hasPool) {
      poolMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(dbcClient.pool));
      console.log('🔧 Pool methods available:', poolMethods);
    }
    
    if (hasState) {
      stateMethods = Object.getOwnPropertyNames(Object.getPrototypeOf(dbcClient.state));
      console.log('🔧 State methods available:', stateMethods);
    }
    
    const debug = {
      clientCreated,
      hasPool,
      hasState,
      poolMethods,
      stateMethods,
      clientType: typeof dbcClient,
      poolType: typeof dbcClient.pool,
      stateType: typeof dbcClient.state
    };
    
    console.log('📊 Final debug info:', debug);
    
    res.status(200).json({
      success: true,
      clientCreated,
      hasPool,
      hasState,
      debug
    });

  } catch (error) {
    console.error('Test SDK error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error',
      debug: {
        clientCreated: false,
        hasPool: false,
        hasState: false
      }
    });
  }
}
