import { NextApiRequest, NextApiResponse } from 'next';
import { getGlobalConnection, testConnection, getConnectionStatus } from '@/lib/config/global-rpc';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing RPC connection...');
    
    // Get the global connection
    const connection = getGlobalConnection();
    
    // Test the connection
    const isHealthy = await testConnection(connection);
    
    // Get connection status
    const status = getConnectionStatus();
    
    // Get current slot
    const slot = await connection.getSlot();
    
    const result = {
      success: true,
      connection: {
        isHealthy,
        endpoint: status.endpoint,
        isConnected: status.isConnected,
        currentSlot: slot,
      },
      timestamp: new Date().toISOString(),
    };
    
    console.log('RPC test result:', result);
    res.status(200).json(result);
    
  } catch (error) {
    console.error('RPC test failed:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
}
