import type { NextApiRequest, NextApiResponse } from 'next';

// Extract Helius API key from RPC_URL if HELIUS_API_KEY is not set
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 
  process.env.RPC_URL?.match(/api-key=([^&]+)/)?.[1] || '';

const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { tokenMint } = req.query;
  
  if (!tokenMint || typeof tokenMint !== 'string') {
    return res.status(400).json({ error: 'tokenMint parameter required' });
  }

  const debug: any = {
    tokenMint,
    env: {
      hasHelius: !!HELIUS_API_KEY,
      heliusKey: HELIUS_API_KEY?.slice(0, 8) + '...',
      hasR2Url: !!R2_PUBLIC_URL,
      r2Url: R2_PUBLIC_URL,
    },
    imageUrl: '',
    metadata: null,
    imageAccessible: false,
    errors: [],
  };

  try {
    // 1. Construct R2 image URL
    if (R2_PUBLIC_URL) {
      debug.imageUrl = `${R2_PUBLIC_URL}/tokens/${tokenMint}.png`;
      
      // Test if image is accessible
      try {
        const imageResponse = await fetch(debug.imageUrl, { method: 'HEAD' });
        debug.imageAccessible = imageResponse.ok;
        debug.imageStatus = imageResponse.status;
      } catch (e) {
        debug.errors.push(`Image fetch error: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    // 2. Test Helius token metadata
    if (HELIUS_API_KEY) {
      try {
        const metadataResponse = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mintAccounts: [tokenMint]
          })
        });

        debug.metadataStatus = metadataResponse.status;
        debug.metadataOk = metadataResponse.ok;

        if (metadataResponse.ok) {
          const metadataData = await metadataResponse.json();
          debug.rawMetadata = metadataData;
          
          const tokenMetadata = metadataData[0];
          if (tokenMetadata) {
            debug.metadata = {
              hasOnChain: !!tokenMetadata.onChainMetadata,
              hasOffChain: !!tokenMetadata.offChainMetadata,
              onChainName: tokenMetadata.onChainMetadata?.metadata?.name,
              onChainSymbol: tokenMetadata.onChainMetadata?.metadata?.symbol,
              offChainName: tokenMetadata.offChainMetadata?.name,
              offChainSymbol: tokenMetadata.offChainMetadata?.symbol,
            };
          }
        } else {
          const errorText = await metadataResponse.text();
          debug.errors.push(`Metadata API error: ${metadataResponse.status} - ${errorText}`);
        }
      } catch (e) {
        debug.errors.push(`Metadata fetch error: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    return res.status(200).json(debug);
  } catch (e) {
    debug.errors.push(`General error: ${e instanceof Error ? e.message : 'Unknown'}`);
    return res.status(200).json(debug);
  }
}
