import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = process.env.RPC_URL as string;
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

interface ReadMetadataResponse {
  success: boolean;
  mintAddress?: string;
  metadataAddress?: string;
  metadataExists?: boolean;
  parsedMetadata?: {
    name?: string;
    symbol?: string;
    uri?: string;
    sellerFeeBasisPoints?: number;
  };
  rawDataHex?: string;
  dataAnalysis?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ReadMetadataResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { mintAddress } = req.body;

    if (!mintAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing mintAddress parameter'
      });
    }

    console.log('📖 Reading metadata account data for:', mintAddress);

    const connection = new Connection(RPC_URL, 'confirmed');
    const mintPublicKey = new PublicKey(mintAddress);

    // Calculate metadata address
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPublicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    console.log('📍 Reading metadata from:', metadataAddress.toString());

    // Get metadata account info
    const accountInfo = await connection.getAccountInfo(metadataAddress);
    
    if (!accountInfo) {
      return res.status(200).json({
        success: true,
        mintAddress,
        metadataAddress: metadataAddress.toString(),
        metadataExists: false,
        dataAnalysis: 'Metadata account does not exist',
      });
    }

    console.log('✅ Metadata account found, parsing data...');

    // Parse the metadata data
    const data = accountInfo.data;
    console.log('📏 Data length:', data.length);

    let parsedMetadata = {};
    let dataAnalysis = '';

    try {
      // Parse basic metadata structure
      let offset = 1; // Skip key (first byte)

      // Update authority (32 bytes)
      offset += 32;

      // Mint (32 bytes) 
      offset += 32;

      // Data struct starts here
      // Name length (4 bytes)
      const nameLength = data.readUInt32LE(offset);
      offset += 4;
      
      // Name string
      const name = data.slice(offset, offset + nameLength).toString('utf-8');
      offset += nameLength;
      
      // Symbol length (4 bytes)
      const symbolLength = data.readUInt32LE(offset);
      offset += 4;
      
      // Symbol string
      const symbol = data.slice(offset, offset + symbolLength).toString('utf-8');
      offset += symbolLength;
      
      // URI length (4 bytes)
      const uriLength = data.readUInt32LE(offset);
      offset += 4;
      
      // URI string
      const uri = data.slice(offset, offset + uriLength).toString('utf-8');
      offset += uriLength;
      
      // Seller fee basis points (2 bytes)
      const sellerFeeBasisPoints = data.readUInt16LE(offset);
      offset += 2;

      parsedMetadata = {
        name: name || '(empty)',
        symbol: symbol || '(empty)',
        uri: uri || '(empty)',
        sellerFeeBasisPoints,
      };

      if (!name || !symbol) {
        dataAnalysis = '❌ Name or symbol is empty! This is why Solscan doesn\'t show the token name.';
      } else if (name.trim() === '' || symbol.trim() === '') {
        dataAnalysis = '❌ Name or symbol contains only whitespace!';
      } else {
        dataAnalysis = '✅ Name and symbol look valid. Checking URI...';
        
        if (!uri || uri.trim() === '') {
          dataAnalysis = '⚠️ URI is empty - this might cause display issues';
        }
      }

      console.log('📊 Parsed metadata:', parsedMetadata);

    } catch (parseError) {
      console.error('❌ Failed to parse metadata:', parseError);
      dataAnalysis = `Failed to parse metadata: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`;
    }

    // Return raw data for deeper inspection
    const rawDataHex = data.slice(0, Math.min(data.length, 200)).toString('hex'); // First 200 bytes

    res.status(200).json({
      success: true,
      mintAddress,
      metadataAddress: metadataAddress.toString(),
      metadataExists: true,
      parsedMetadata,
      rawDataHex,
      dataAnalysis,
    });

  } catch (error) {
    console.error('Read metadata error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
