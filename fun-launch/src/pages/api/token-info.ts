import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

interface TokenInfoResponse {
  success: boolean;
  tokenInfo?: {
    mintAddress: string;
    metadataAccount: string;
    name: string;
    symbol: string;
    uri: string;
    decimals: number;
    supply: string;
    hasMetadata: boolean;
    imageUrl?: string;
    description?: string;
  };
  poolInfo?: {
    poolAddress?: string;
    progress?: number;
    marketCap?: number;
    isMigrated?: boolean;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TokenInfoResponse>
) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const mintAddress = req.method === 'GET' 
      ? req.query.mint as string 
      : req.body?.mintAddress;

    if (!mintAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing mintAddress parameter'
      });
    }

    console.log('🔍 Fetching comprehensive token info for:', mintAddress);

    const connection = new Connection(RPC_URL, 'confirmed');
    const mintPublicKey = new PublicKey(mintAddress);

    // Get metadata account
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPublicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    // Check metadata account
    const metadataAccountInfo = await connection.getAccountInfo(metadataAddress);
    const hasMetadata = !!metadataAccountInfo;

    let parsedMetadata = {
      name: 'Unknown Token',
      symbol: 'UNK', 
      uri: '',
    };

    if (hasMetadata && metadataAccountInfo) {
      try {
        // Parse metadata account data
        const data = metadataAccountInfo.data;
        let offset = 1 + 32 + 32; // Skip key + update authority + mint
        
        // Parse name
        const nameLength = data.readUInt32LE(offset);
        offset += 4;
        const name = data.slice(offset, offset + nameLength).toString('utf-8').replace(/\0/g, '').trim();
        offset += nameLength;
        
        // Parse symbol
        const symbolLength = data.readUInt32LE(offset);
        offset += 4;
        const symbol = data.slice(offset, offset + symbolLength).toString('utf-8').replace(/\0/g, '').trim();
        offset += symbolLength;
        
        // Parse URI
        const uriLength = data.readUInt32LE(offset);
        offset += 4;
        const uri = data.slice(offset, offset + uriLength).toString('utf-8').replace(/\0/g, '').trim();
        
        if (name && symbol) {
          parsedMetadata = { name, symbol, uri };
        }
        
        console.log('✅ Parsed metadata:', parsedMetadata);
      } catch (parseError) {
        console.warn('⚠️ Failed to parse metadata:', parseError);
      }
    }

    // Get mint account info
    const mintAccountInfo = await connection.getAccountInfo(mintPublicKey);
    let decimals = 9;
    let supply = '0';

    if (mintAccountInfo) {
      try {
        // Parse mint account data
        const mintData = mintAccountInfo.data;
        const isInitialized = mintData[45] === 1;
        
        if (isInitialized) {
          decimals = mintData[44];
          // Supply is stored as u64 at offset 36
          const supplyBuffer = mintData.slice(36, 44);
          supply = Buffer.from(supplyBuffer).readBigUInt64LE(0).toString();
        }
      } catch (parseError) {
        console.warn('⚠️ Failed to parse mint account:', parseError);
      }
    }

    // Try to fetch JSON metadata if URI exists
    let imageUrl: string | undefined;
    let description: string | undefined;

    if (parsedMetadata.uri) {
      try {
        console.log('🔗 Fetching JSON metadata from:', parsedMetadata.uri);
        const metadataResponse = await fetch(parsedMetadata.uri);
        
        if (metadataResponse.ok) {
          const jsonMetadata = await metadataResponse.json();
          imageUrl = jsonMetadata.image;
          description = jsonMetadata.description;
          console.log('✅ JSON metadata fetched:', { imageUrl: !!imageUrl, description: !!description });
        } else {
          console.log('⚠️ JSON metadata not accessible:', metadataResponse.status);
        }
      } catch (jsonError) {
        console.warn('⚠️ Failed to fetch JSON metadata:', jsonError);
      }
    }

    const tokenInfo = {
      mintAddress,
      metadataAccount: metadataAddress.toString(),
      name: parsedMetadata.name,
      symbol: parsedMetadata.symbol,
      uri: parsedMetadata.uri,
      decimals,
      supply,
      hasMetadata,
      imageUrl,
      description,
    };

    console.log('📊 Final token info:', tokenInfo);

    res.status(200).json({
      success: true,
      tokenInfo,
      poolInfo: {
        // TODO: Add DBC pool info if needed
      },
    });

  } catch (error) {
    console.error('Token info error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
