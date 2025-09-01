import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  createMetadataAccount, 
  TokenMetadata, 
  createDefaultCreators,
  hasMetadataAccount,
  getMetadataAddress
} from '../../lib/metaplex-metadata';

const RPC_URL = process.env.RPC_URL as string;

if (!RPC_URL) {
  throw new Error('Missing required environment variable: RPC_URL');
}

interface CreateMetadataRequest {
  mintAddress: string;
  userWallet: string;
  tokenName: string;
  tokenSymbol: string;
  metadataUri: string;
  sellerFeeBasisPoints?: number;
}

interface CreateMetadataResponse {
  success: boolean;
  metadataTx?: string;
  metadataAddress?: string;
  alreadyExists?: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateMetadataResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { 
      mintAddress, 
      userWallet, 
      tokenName, 
      tokenSymbol, 
      metadataUri,
      sellerFeeBasisPoints = 0
    }: CreateMetadataRequest = req.body;

    // Validate required fields
    if (!mintAddress || !userWallet || !tokenName || !tokenSymbol || !metadataUri) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: mintAddress, userWallet, tokenName, tokenSymbol, metadataUri'
      });
    }

    console.log('📝 Creating metadata account for token:', { tokenName, tokenSymbol, mintAddress });

    // Setup connection
    const connection = new Connection(RPC_URL, 'confirmed');
    const mintPublicKey = new PublicKey(mintAddress);
    const payerPublicKey = new PublicKey(userWallet);

    // Check if metadata account already exists
    const metadataExists = await hasMetadataAccount(connection, mintPublicKey);
    
    if (metadataExists) {
      const metadataAddress = getMetadataAddress(mintPublicKey);
      console.log('ℹ️ Metadata account already exists at:', metadataAddress.toString());
      
      return res.status(200).json({
        success: true,
        alreadyExists: true,
        metadataAddress: metadataAddress.toString()
      });
    }

    // Create on-chain metadata account
    const tokenMetadata: TokenMetadata = {
      name: tokenName,
      symbol: tokenSymbol,
      uri: metadataUri,
      sellerFeeBasisPoints,
      creators: createDefaultCreators(userWallet),
    };

    const metadataResult = await createMetadataAccount(
      mintPublicKey,
      payerPublicKey,
      tokenMetadata
    );

    // Set transaction properties
    const { blockhash } = await connection.getLatestBlockhash();
    metadataResult.transaction.feePayer = payerPublicKey;
    metadataResult.transaction.recentBlockhash = blockhash;

    console.log('✅ Created metadata transaction for address:', metadataResult.metadataAddress.toString());

    res.status(200).json({
      success: true,
      metadataTx: metadataResult.transaction
        .serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        })
        .toString('base64'),
      metadataAddress: metadataResult.metadataAddress.toString(),
    });

  } catch (error) {
    console.error('Create metadata error:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    res.status(500).json({ success: false, error: errorMessage });
  }
}
