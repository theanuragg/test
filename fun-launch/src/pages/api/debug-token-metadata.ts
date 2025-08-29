import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';

const RPC_URL = process.env.RPC_URL as string;
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

interface DebugTokenResponse {
  success: boolean;
  mintAddress?: string;
  metadataAddress?: string;
  metadataExists?: boolean;
  metadataAccountInfo?: any;
  mintAccountInfo?: any;
  possibleIssues?: string[];
  recommendations?: string[];
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DebugTokenResponse>
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

    console.log('🔍 Debugging token metadata for:', mintAddress);

    const connection = new Connection(RPC_URL, 'confirmed');
    const mintPublicKey = new PublicKey(mintAddress);

    // Calculate expected metadata address
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPublicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    console.log('📍 Expected metadata address:', metadataAddress.toString());

    // Check mint account
    const mintAccountInfo = await connection.getAccountInfo(mintPublicKey);
    console.log('🪙 Mint account exists:', !!mintAccountInfo);

    // Check metadata account
    const metadataAccountInfo = await connection.getAccountInfo(metadataAddress);
    console.log('📝 Metadata account exists:', !!metadataAccountInfo);

    const possibleIssues = [];
    const recommendations = [];

    if (!mintAccountInfo) {
      possibleIssues.push('Mint account does not exist');
      recommendations.push('Verify the mint address is correct');
    } else {
      console.log('✅ Mint account found');
      console.log('🔧 Mint data length:', mintAccountInfo.data.length);
      console.log('🏛️ Mint owner:', mintAccountInfo.owner.toString());
    }

    if (!metadataAccountInfo) {
      possibleIssues.push('Metadata account was not created by Meteora DBC');
      recommendations.push('Check if name/symbol/uri parameters were valid');
      recommendations.push('Verify mint authority was correct during pool creation');
      recommendations.push('Check if transaction failed silently');
    } else {
      console.log('✅ Metadata account found!');
      console.log('📝 Metadata data length:', metadataAccountInfo.data.length);
      console.log('🏛️ Metadata owner:', metadataAccountInfo.owner.toString());
      
      if (metadataAccountInfo.owner.toString() !== TOKEN_METADATA_PROGRAM_ID.toString()) {
        possibleIssues.push('Metadata account has wrong owner program');
      }
    }

    // Additional checks
    if (mintAccountInfo && !metadataAccountInfo) {
      possibleIssues.push('Mint exists but metadata missing - likely authority issue');
      recommendations.push('The DBC SDK tried to create metadata but failed');
      recommendations.push('Check that the mint keypair signed the transaction');
      recommendations.push('Verify name/symbol/uri are not empty or too long');
    }

    res.status(200).json({
      success: true,
      mintAddress,
      metadataAddress: metadataAddress.toString(),
      metadataExists: !!metadataAccountInfo,
      metadataAccountInfo: metadataAccountInfo ? {
        owner: metadataAccountInfo.owner.toString(),
        dataLength: metadataAccountInfo.data.length,
        lamports: metadataAccountInfo.lamports,
      } : null,
      mintAccountInfo: mintAccountInfo ? {
        owner: mintAccountInfo.owner.toString(),
        dataLength: mintAccountInfo.data.length,
        lamports: mintAccountInfo.lamports,
      } : null,
      possibleIssues,
      recommendations,
    });

  } catch (error) {
    console.error('Debug error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
