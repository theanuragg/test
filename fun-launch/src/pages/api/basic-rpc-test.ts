import { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const endpoints = [
    'https://solana-api.projectserum.com',
    'https://solana.public-rpc.com',
    'https://api.mainnet-beta.solana.com',
  ];

  const results = [];

  for (const endpoint of endpoints) {
    try {
      console.log(`Testing endpoint: ${endpoint}`);
      
      const connection = new Connection(endpoint, 'confirmed');
      const startTime = Date.now();
      
      // Test with timeout
      const slotPromise = connection.getSlot();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      const slot = await Promise.race([slotPromise, timeoutPromise]);
      const responseTime = Date.now() - startTime;
      
      results.push({
        endpoint,
        success: true,
        slot,
        responseTime,
        error: null,
      });
      
      console.log(`✅ ${endpoint} is working (${responseTime}ms)`);
      
    } catch (error) {
      console.error(`❌ ${endpoint} failed:`, error);
      
      results.push({
        endpoint,
        success: false,
        slot: null,
        responseTime: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  const workingEndpoints = results.filter(r => r.success);
  const bestEndpoint = workingEndpoints.length > 0 ? workingEndpoints[0] : null;

  const result = {
    success: workingEndpoints.length > 0,
    bestEndpoint: bestEndpoint?.endpoint || null,
    allResults: results,
    workingCount: workingEndpoints.length,
    totalCount: endpoints.length,
    timestamp: new Date().toISOString(),
  };

  console.log('Basic RPC test result:', result);
  res.status(200).json(result);
}
