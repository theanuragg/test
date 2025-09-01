import { NextApiRequest, NextApiResponse } from 'next';
import { getSimpleConnection, testSimpleEndpoints } from '@/lib/config/simple-rpc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing simple RPC...');
    
    // Test all endpoints
    const allResults = await testSimpleEndpoints();
    
    // Get a working connection
    const connection = await getSimpleConnection();
    const slot = await connection.getSlot();
    
    const result = {
      success: true,
      slot,
      allEndpoints: allResults,
      workingEndpoints: allResults.filter(r => r.success).length,
      totalEndpoints: allResults.length,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Simple RPC test result:', result);
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Simple RPC test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
