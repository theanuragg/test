import type { NextApiRequest, NextApiResponse } from 'next';
import { getAsset, extractTokenMetadata } from '../../lib/helius/getAsset';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  const { tokenMint } = req.body;
  
  if (!tokenMint) {
    return res.status(400).json({ error: 'tokenMint is required' });
  }

  try {
    console.log(`🧪 Testing Helius getAsset for token: ${tokenMint}`);
    
    const startTime = Date.now();
    const assetData = await getAsset(tokenMint);
    const endTime = Date.now();
    
    const tokenMetadata = extractTokenMetadata(assetData);
    
    return res.status(200).json({
      success: true,
      tokenMint,
      responseTime: `${endTime - startTime}ms`,
      assetData,
      extractedMetadata: tokenMetadata,
      hasMetadata: !!(tokenMetadata.name || tokenMetadata.symbol),
      hasImage: !!tokenMetadata.image
    });
  } catch (error) {
    console.error('Helius getAsset test error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      tokenMint
    });
  }
}
