import { NextApiRequest, NextApiResponse } from 'next';
import { getUltraRobustConnection, testUltraRobustEndpoints, getUltraRobustStatus } from '@/lib/config/ultra-robust-rpc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing ultra-robust RPC manager...');
    
    // Test all endpoints
    const allResults = await testUltraRobustEndpoints();
    
    // Get a working connection
    const connection = await getUltraRobustConnection();
    const slot = await connection.getSlot();
    
    // Get current status
    const status = getUltraRobustStatus();
    
    const result = {
      success: true,
      slot,
      allEndpoints: allResults,
      status,
      workingEndpoints: allResults.filter(r => r.currentTest.success).length,
      totalEndpoints: allResults.length,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Ultra-robust RPC test result:', result);
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Ultra-robust RPC test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
