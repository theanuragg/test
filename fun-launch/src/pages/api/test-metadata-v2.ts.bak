import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { 
  createMetadataAccountForMint,
  TokenMetadata,
} from '../../lib/metadata-helper';

const RPC_URL = process.env.RPC_URL as string;

interface TestMetadataV2Response {
  success: boolean;
  functionExists?: boolean;
  metadataAddress?: string;
  transactionCreated?: boolean;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestMetadataV2Response>
) {
  try {
    console.log('🧪 Testing Metaplex v2.13.0 metadata creation...');
    
    // Test function exists
    if (typeof createMetadataAccountForMint !== 'function') {
      return res.status(500).json({
        success: false,
        functionExists: false,
        error: 'createMetadataAccountForMint function not found'
      });
    }

    console.log('✅ Function exists, testing with dummy data...');

    const connection = new Connection(RPC_URL, 'confirmed');
    const testMint = Keypair.generate().publicKey;
    const testPayer = Keypair.generate().publicKey;
    
    const testMetadata: TokenMetadata = {
      name: 'Test Token V2',
      symbol: 'TESTV2',
      uri: 'https://example.com/metadata.json',
      sellerFeeBasisPoints: 0,
      creators: [{
        address: testPayer.toString(),
        verified: true,
        share: 100,
      }],
    };

    console.log('🔧 Creating metadata transaction...');

    const result = await createMetadataAccountForMint(
      connection,
      testMint,
      testPayer,
      testMetadata
    );

    console.log('✅ Metadata transaction created successfully!');
    console.log('📍 Metadata address:', result.metadataAddress.toString());
    console.log('📋 Transaction has', result.transaction.instructions.length, 'instruction(s)');

    res.status(200).json({
      success: true,
      functionExists: true,
      metadataAddress: result.metadataAddress.toString(),
      transactionCreated: true,
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      functionExists: typeof createMetadataAccountForMint === 'function',
    });
  }
}
