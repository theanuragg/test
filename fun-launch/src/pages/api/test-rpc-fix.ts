import { NextApiRequest, NextApiResponse } from 'next';
import { getUltraRobustConnection, testUltraEndpoints } from '@/lib/config/ultra-robust-rpc';
import { getFallbackConnection, testFallbackEndpoints } from '@/lib/config/fallback-rpc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing RPC timeout fixes...');

    const results = {
      ultraRobust: null as any,
      fallback: null as any,
      connectionTest: null as any,
    };

    // Test ultra robust RPC
    try {
      console.log('🔄 Testing ultra robust RPC...');
      results.ultraRobust = await testUltraEndpoints();
    } catch (error) {
      results.ultraRobust = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test fallback RPC
    try {
      console.log('🔄 Testing fallback RPC...');
      results.fallback = await testFallbackEndpoints();
    } catch (error) {
      results.fallback = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test actual connection
    try {
      console.log('🔄 Testing actual connection...');
      const startTime = Date.now();
      const connection = await getUltraRobustConnection();
      const slot = await connection.getSlot();
      const responseTime = Date.now() - startTime;
      
      results.connectionTest = {
        success: true,
        slot,
        responseTime,
        endpoint: connection.rpcEndpoint,
      };
    } catch (error) {
      results.connectionTest = { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }

    console.log('✅ RPC timeout fix test completed');

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error) {
    console.error('❌ RPC timeout fix test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
