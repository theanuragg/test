import type { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 
  process.env.RPC_URL?.match(/api-key=([^&]+)/)?.[1] || '';

const RPC_URL = process.env.RPC_URL || `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tokenMints } = req.body;
  
  if (!tokenMints || !Array.isArray(tokenMints)) {
    return res.status(400).json({ error: 'tokenMints array required' });
  }

  try {
    const connection = new Connection(RPC_URL, 'confirmed');
    const results = [];

    for (const tokenMint of tokenMints) {
      try {
        // Use Solana RPC getTokenSupply with metadataPointer extension
        const response = await connection.getTokenSupply(new PublicKey(tokenMint));
        
        // Try to get account info which may contain metadata extension
        const mintAccountInfo = await connection.getAccountInfo(new PublicKey(tokenMint));
        
        let metadata = { name: null, symbol: null };
        
        if (mintAccountInfo && mintAccountInfo.data) {
          // Try to parse Token-2022 metadata extension
          const data = mintAccountInfo.data;
          
          // Look for metadata in the account data
          // Token 2022 mints can have metadata extensions
          if (data.length > 165) {  // Standard mint account is 165 bytes
            const dataStr = data.slice(165).toString('utf8', 0, Math.min(200, data.length - 165));
            
            // Try to find JSON-like metadata
            const jsonMatch = dataStr.match(/\{[^}]*"name"[^}]*\}/);
            if (jsonMatch) {
              try {
                const parsed = JSON.parse(jsonMatch[0]);
                metadata.name = parsed.name;
                metadata.symbol = parsed.symbol;
              } catch {}
            }
          }
        }

        // Fallback: Try standard metadata account
        if (!metadata.name) {
          try {
            const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
            const [metadataAccount] = PublicKey.findProgramAddressSync(
              [
                Buffer.from('metadata'),
                TOKEN_METADATA_PROGRAM_ID.toBuffer(),
                new PublicKey(tokenMint).toBuffer(),
              ],
              TOKEN_METADATA_PROGRAM_ID
            );

            const accountInfo = await connection.getAccountInfo(metadataAccount);
            
            if (accountInfo) {
              // Try to get metadata using RPC call
              const metadataResponse = await fetch(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  jsonrpc: '2.0',
                  id: 1,
                  method: 'getAccountInfo',
                  params: [
                    metadataAccount.toString(),
                    { encoding: 'base64' }
                  ]
                })
              });

              if (metadataResponse.ok) {
                const metadataData = await metadataResponse.json();
                if (metadataData.result?.value?.data) {
                  const base64Data = metadataData.result.value.data[0];
                  const buffer = Buffer.from(base64Data, 'base64');
                  
                  // Parse Metaplex Token Metadata format
                  if (buffer.length > 100) {
                    try {
                      // Metaplex metadata structure:
                      // - 1 byte: key (discriminator)
                      // - 32 bytes: update authority
                      // - 32 bytes: mint
                      // - 4 bytes: name length + name string
                      // - 4 bytes: symbol length + symbol string
                      // - 4 bytes: uri length + uri string
                      
                      let offset = 1 + 32 + 32; // Skip key + update authority + mint
                      
                      // Read name
                      if (offset + 4 < buffer.length) {
                        const nameLength = buffer.readUInt32LE(offset);
                        offset += 4;
                        
                        if (nameLength > 0 && nameLength < 100 && offset + nameLength <= buffer.length) {
                          const nameBytes = buffer.slice(offset, offset + nameLength);
                          metadata.name = nameBytes.toString('utf8').replace(/\0/g, '').trim();
                          offset += nameLength;
                        }
                      }
                      
                      // Read symbol
                      if (offset + 4 < buffer.length) {
                        const symbolLength = buffer.readUInt32LE(offset);
                        offset += 4;
                        
                        if (symbolLength > 0 && symbolLength < 20 && offset + symbolLength <= buffer.length) {
                          const symbolBytes = buffer.slice(offset, offset + symbolLength);
                          metadata.symbol = symbolBytes.toString('utf8').replace(/\0/g, '').trim();
                        }
                      }
                    } catch (parseError) {
                      // Fallback to simple text extraction
                      const text = buffer.toString('utf8').replace(/[\x00-\x1F\x7F-\xFF]/g, ' ').trim();
                      const words = text.split(/\s+/).filter(word => 
                        word.length > 1 && 
                        word.length < 30 && 
                        /^[A-Za-z0-9]+$/.test(word)
                      );
                      
                      if (words.length >= 2) {
                        metadata.name = words[0];
                        metadata.symbol = words[1];
                      } else if (words.length === 1) {
                        metadata.symbol = words[0];
                      }
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.warn('Standard metadata parsing failed:', e);
          }
        }

        results.push({
          tokenMint,
          ...metadata
        });
      } catch (e) {
        results.push({
          tokenMint,
          name: null,
          symbol: null,
          error: e instanceof Error ? e.message : 'Unknown error'
        });
      }
    }

    return res.status(200).json({ tokens: results });
  } catch (e) {
    return res.status(500).json({ 
      error: e instanceof Error ? e.message : 'Unknown error'
    });
  }
}
