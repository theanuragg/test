import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

// R2 Configuration
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

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

/**
 * Check if a token image exists in R2 storage
 */
async function checkR2Image(tokenMint: string): Promise<string | null> {
  if (!R2_PUBLIC_URL) {
    console.warn('⚠️ R2_PUBLIC_URL not configured, skipping R2 image check');
    return null;
  }
  
  try {
    console.log(`🔍 Checking R2 storage for token: ${tokenMint}`);
    console.log(`🔗 R2 base URL: ${R2_PUBLIC_URL}`);
    
    // Try different image formats with timeout
    const imageFormats = ['png', 'jpg', 'jpeg', 'svg'];
    
    for (const format of imageFormats) {
      const imageUrl = `${R2_PUBLIC_URL}/tokens/${tokenMint}.${format}`;
      
      try {
        console.log(`🔍 Checking format: ${format} at ${imageUrl}`);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        const response = await fetch(imageUrl, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`🖼️ Found R2 image for ${tokenMint}: ${imageUrl}`);
          return imageUrl;
        } else {
          console.log(`ℹ️ R2 image not found for ${tokenMint}.${format}: ${response.status}`);
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          console.log(`⏰ R2 image check timed out for ${tokenMint}.${format}`);
        } else {
          console.log(`ℹ️ R2 image check failed for ${tokenMint}.${format}:`, e.message);
        }
        // Continue to next format
        continue;
      }
    }
    
    console.log(`ℹ️ No R2 image found for ${tokenMint} in any format`);
    return null;
  } catch (error) {
    console.warn(`❌ Error checking R2 image for ${tokenMint}:`, error);
    return null;
  }
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
    console.log('🔧 Configuration:');
    console.log('  - RPC_URL:', RPC_URL);
    console.log('  - R2_PUBLIC_URL:', R2_PUBLIC_URL || 'NOT SET');
    console.log('  - Environment:', process.env.NODE_ENV);

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

    // Image priority: Metadata URI -> R2 -> Placeholder
    let imageUrl: string | undefined;
    let description: string | undefined;

    // 1. Try to fetch JSON metadata if URI exists (with timeout)
    if (parsedMetadata.uri) {
      try {
        console.log('🔗 Fetching JSON metadata from:', parsedMetadata.uri);
        
        // Create AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        const metadataResponse = await fetch(parsedMetadata.uri, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TokenInfo/1.0)'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (metadataResponse.ok) {
          const jsonMetadata = await metadataResponse.json();
          imageUrl = jsonMetadata.image;
          description = jsonMetadata.description;
          console.log('✅ JSON metadata fetched:', { imageUrl: !!imageUrl, description: !!description });
        } else {
          console.log('⚠️ JSON metadata not accessible:', metadataResponse.status);
        }
      } catch (jsonError) {
        if (jsonError.name === 'AbortError') {
          console.warn('⏰ JSON metadata fetch timed out, skipping...');
        } else {
          console.warn('⚠️ Failed to fetch JSON metadata:', jsonError);
        }
      }
    }

    // 2. Try R2 storage as fallback if no image from metadata
    if (!imageUrl) {
      console.log(`🔍 Checking R2 storage for image: ${mintAddress}`);
      const r2ImageUrl = await checkR2Image(mintAddress);
      if (r2ImageUrl) {
        imageUrl = r2ImageUrl;
        console.log('🖼️ Using R2 image for', mintAddress);
      } else {
        console.log('ℹ️ No R2 image found for', mintAddress);
      }
    }

    // 3. Use placeholder as last resort
    if (!imageUrl) {
      imageUrl = `https://via.placeholder.com/64x64/6366f1/ffffff?text=${parsedMetadata.symbol.charAt(0)}`;
      console.log('🖼️ Using placeholder image for', mintAddress, 'symbol:', parsedMetadata.symbol);
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
