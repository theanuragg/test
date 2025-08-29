import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  getMetadataAddress,
  hasMetadataAccount
} from '../../lib/metaplex-metadata';

const RPC_URL = process.env.RPC_URL as string;

interface TestMetadataRequest {
  mintAddress: string;
}

interface TestMetadataResponse {
  success: boolean;
  mintAddress?: string;
  metadataAddress?: string;
  hasMetadata?: boolean;
  metadataInfo?: any;
  solscanUrl?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestMetadataResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { mintAddress }: TestMetadataRequest = req.body;

    if (!mintAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: mintAddress'
      });
    }

    console.log('🔍 Testing metadata for mint:', mintAddress);

    // Setup connection
    const connection = new Connection(RPC_URL, 'confirmed');
    const mintPublicKey = new PublicKey(mintAddress);

    // Get metadata address
    const metadataAddress = getMetadataAddress(mintPublicKey);
    console.log('📍 Metadata PDA:', metadataAddress.toString());

    // Check if metadata exists
    const hasMetadata = await hasMetadataAccount(connection, mintPublicKey);
    console.log('📝 Has metadata:', hasMetadata);

    let metadataInfo = null;

    if (hasMetadata) {
      try {
        // Try to fetch metadata account info
        const accountInfo = await connection.getAccountInfo(metadataAddress);
        if (accountInfo) {
          metadataInfo = {
            owner: accountInfo.owner.toString(),
            dataLength: accountInfo.data.length,
            lamports: accountInfo.lamports,
            executable: accountInfo.executable,
          };
        }
      } catch (error) {
        console.warn('Could not fetch metadata account info:', error);
      }
    }

    // Determine network for Solscan URL
    const network = process.env.NEXT_PUBLIC_NETWORK === 'mainnet' ? '' : '?cluster=devnet';
    const solscanUrl = `https://solscan.io/token/${mintAddress}${network}`;

    const response: TestMetadataResponse = {
      success: true,
      mintAddress,
      metadataAddress: metadataAddress.toString(),
      hasMetadata,
      metadataInfo,
      solscanUrl,
    };

    console.log('✅ Metadata test result:', {
      mintAddress,
      hasMetadata,
      metadataAddress: metadataAddress.toString(),
    });

    res.status(200).json(response);

  } catch (error) {
    console.error('Test metadata error:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    res.status(500).json({ success: false, error: errorMessage });
  }
}
