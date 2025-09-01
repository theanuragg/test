import { NextApiRequest, NextApiResponse } from 'next';
import { getSimpleConnection, testSimpleEndpoints } from '@/lib/config/simple-rpc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('🚀 Testing ultra-fast RPC...');
    
    // Test all endpoints with ultra-fast strategy
    const allResults = await testSimpleEndpoints();
    
    // Get a working connection
    const connection = await getSimpleConnection();
    const slot = await connection.getSlot();
    const version = await connection.getVersion();
    
    const result = {
      success: true,
      slot,
      version,
      allEndpoints: allResults,
      workingEndpoints: allResults.filter(r => r.success).length,
      totalEndpoints: allResults.length,
      fastestEndpoint: allResults
        .filter(r => r.success)
        .sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0))[0],
      timestamp: new Date().toISOString(),
    };
    
    console.log('🚀 Ultra-fast RPC test result:', result);
    res.status(200).json(result);
    
  } catch (error) {
    console.error('🚀 Ultra-fast RPC test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
