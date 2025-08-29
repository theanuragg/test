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

  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    
    // Calculate metadata account PDA
    const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    const [metadataAccount] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        new PublicKey(tokenMint).toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    // Fetch metadata account
    const accountInfo = await connection.getAccountInfo(metadataAccount);
    
    if (!accountInfo) {
      return res.status(404).json({ error: 'Metadata account not found' });
    }

    // Simple metadata parsing (based on Metaplex Token Metadata structure)
    const data = accountInfo.data;
    
    // Skip discriminator (1 byte) and key (1 byte)
    let offset = 2;
    
    // Skip update authority (32 bytes)
    offset += 32;
    
    // Skip mint (32 bytes) 
    offset += 32;
    
    // Read name (4 bytes length + string)
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLength).toString('utf8').replace(/\0/g, '');
    offset += nameLength;
    
    // Read symbol (4 bytes length + string)
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '');
    offset += symbolLength;
    
    // Read URI (4 bytes length + string)
    const uriLength = data.readUInt32LE(offset);
    offset += 4;
    const uri = data.slice(offset, offset + uriLength).toString('utf8').replace(/\0/g, '');

    return res.status(200).json({
      tokenMint,
      metadataAccount: metadataAccount.toString(),
      metadata: {
        name: name.trim(),
        symbol: symbol.trim(),
        uri: uri.trim(),
      },
      rawDataLength: data.length,
    });
  } catch (e) {
    return res.status(500).json({ 
      error: e instanceof Error ? e.message : 'Unknown error',
      tokenMint 
    });
  }
}
