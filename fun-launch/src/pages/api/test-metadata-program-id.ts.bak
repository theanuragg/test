import { NextApiRequest, NextApiResponse } from 'next';
import { getMetadataAddress } from '../../lib/metaplex-metadata';
import { PublicKey } from '@solana/web3.js';

interface TestResponse {
  success: boolean;
  metadataProgramId: string;
  testMintAddress: string;
  derivedMetadataAddress: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestResponse>
) {
  try {
    // Test with a dummy mint address
    const testMint = new PublicKey('So11111111111111111111111111111111111111112');
    
    // Try to derive metadata address
    const metadataAddress = getMetadataAddress(testMint);
    
    res.status(200).json({
      success: true,
      metadataProgramId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
      testMintAddress: testMint.toString(),
      derivedMetadataAddress: metadataAddress.toString(),
    });
    
  } catch (error) {
    console.error('Test error:', error);
    
    res.status(500).json({
      success: false,
      metadataProgramId: 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
      testMintAddress: 'So11111111111111111111111111111111111111112',
      derivedMetadataAddress: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
