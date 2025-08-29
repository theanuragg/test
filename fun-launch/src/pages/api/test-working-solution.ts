import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { 
  createWorkingMetadataAccount,
  TokenMetadata,
  checkMetadataExists,
} from '../../lib/working-metadata';

const RPC_URL = process.env.RPC_URL as string;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    console.log('🧪 Testing working metadata solution...');
    
    const connection = new Connection(RPC_URL, 'confirmed');
    const testMint = Keypair.generate().publicKey;
    const testPayer = Keypair.generate().publicKey;
    
    const testMetadata: TokenMetadata = {
      name: 'Working Test Token',
      symbol: 'WORK',
      uri: 'https://example.com/working-metadata.json',
    };

    console.log('📝 Creating metadata account...');

    const result = await createWorkingMetadataAccount(
      connection,
      testMint,
      testPayer,
      testMetadata
    );

    console.log('✅ Success! Metadata transaction created');
    console.log('📍 Metadata address:', result.metadataAddress.toString());
    console.log('📋 Instructions:', result.transaction.instructions.length);

    const transactionBase64 = result.transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString('base64');

    res.status(200).json({
      success: true,
      message: 'Working metadata solution confirmed!',
      metadataAddress: result.metadataAddress.toString(),
      transactionSize: transactionBase64.length,
      instructionCount: result.transaction.instructions.length,
    });

  } catch (error) {
    console.error('❌ Working solution test failed:', error);
    
    res.status(500).json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
