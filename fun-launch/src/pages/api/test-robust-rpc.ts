import { NextApiRequest, NextApiResponse } from 'next';
import { robustRpcManager } from '@/lib/config/robust-rpc-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing robust RPC manager...');
    
    // Test all endpoints
    const status = await robustRpcManager.testAllEndpoints();
    
    // Get a working connection
    const connection = await robustRpcManager.getConnection();
    const slot = await connection.getSlot();
    const currentEndpoint = robustRpcManager.getCurrentEndpoint();
    
    const result = {
      success: true,
      currentEndpoint,
      slot,
      allEndpoints: status,
      workingEndpoints: status.filter(s => s.isWorking).length,
      totalEndpoints: status.length,
      timestamp: new Date().toISOString(),
    };
    
    console.log('Robust RPC test result:', result);
    res.status(200).json(result);
    
  } catch (error) {
    console.error('Robust RPC test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
