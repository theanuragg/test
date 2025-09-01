import { NextApiRequest, NextApiResponse } from 'next';
import { getProductionConnection, getProductionConnectionStatus, testProductionEndpoints } from '@/lib/config/production-rpc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🧪 Testing production RPC manager...');

    const results = {
      endpointTests: null as any,
      connectionTest: null as any,
      status: null as any,
    };

    // Test all production endpoints
    try {
      console.log('🔄 Testing all production endpoints...');
      results.endpointTests = await testProductionEndpoints();
    } catch (error) {
      results.endpointTests = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    // Test actual connection
    try {
      console.log('🔄 Testing production connection...');
      const startTime = Date.now();
      const connection = await getProductionConnection();
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

    // Get connection status
    try {
      console.log('🔄 Getting connection status...');
      results.status = getProductionConnectionStatus();
    } catch (error) {
      results.status = { error: error instanceof Error ? error.message : 'Unknown error' };
    }

    console.log('✅ Production RPC manager test completed');

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
    });

  } catch (error) {
    console.error('❌ Production RPC manager test failed:', error);
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
