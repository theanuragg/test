import type { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 
  process.env.RPC_URL?.match(/api-key=([^&]+)/)?.[1] || '';

const RPC_URL = process.env.RPC_URL || `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { tokenMint } = req.query;
  
  if (!tokenMint || typeof tokenMint !== 'string') {
    return res.status(400).json({ error: 'tokenMint parameter required' });
  }

  const debug: any = {
    tokenMint,
    metadataAccount: null,
    onChainData: null,
    heliusData: null,
    errors: [],
  };

  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    
    // 1. Calculate metadata account PDA
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        new PublicKey(tokenMint).toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    
    debug.metadataAccount = metadataAccount.toString();

    // 2. Try to fetch metadata account directly
    try {
      const accountInfo = await connection.getAccountInfo(metadataAccount);
      debug.onChainData = {
        exists: !!accountInfo,
        owner: accountInfo?.owner?.toString(),
        dataLength: accountInfo?.data?.length,
        rawData: accountInfo?.data ? accountInfo.data.toString('base64').slice(0, 200) + '...' : null
      };
    } catch (e) {
      debug.errors.push(`Direct metadata fetch error: ${e instanceof Error ? e.message : 'Unknown'}`);
    }

    // 3. Check Helius Token Metadata API
    if (HELIUS_API_KEY) {
      try {
        const response = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mintAccounts: [tokenMint]
          })
        });

        if (response.ok) {
          const data = await response.json();
          debug.heliusData = data[0] || null;
        } else {
          debug.errors.push(`Helius API error: ${response.status}`);
        }
      } catch (e) {
        debug.errors.push(`Helius fetch error: ${e instanceof Error ? e.message : 'Unknown'}`);
      }
    }

    return res.status(200).json(debug);
  } catch (e) {
    debug.errors.push(`General error: ${e instanceof Error ? e.message : 'Unknown'}`);
    return res.status(200).json(debug);
  }
}
