import { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Testing simple RPC connection...');
    
    // Test with a simple connection first (public endpoint, no API key required)
    const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
    
    // Get current slot
    const slot = await connection.getSlot();
    
    const result = {
      success: true,
      slot,
      endpoint: 'https://api.mainnet-beta.solana.com',
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
