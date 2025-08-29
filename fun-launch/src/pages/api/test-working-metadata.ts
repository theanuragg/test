import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { 
  createMetadataAccount, 
  TokenMetadata, 
  createDefaultCreators,
} from '../../lib/metaplex-metadata';

const RPC_URL = process.env.RPC_URL as string;

interface TestWorkingMetadataResponse {
  success: boolean;
  instructionCreated?: boolean;
  metadataAddress?: string;
  transactionBase64?: string;
  instructionData?: any;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TestWorkingMetadataResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    // Test with valid dummy data
    const testMint = Keypair.generate().publicKey; // Generate a valid test mint
    const testPayer = Keypair.generate().publicKey; // Generate a valid test payer
    
    const testMetadata: TokenMetadata = {
      name: 'Test Token',
      symbol: 'TEST',
      uri: 'https://example.com/metadata.json',
      sellerFeeBasisPoints: 0,
      creators: createDefaultCreators(testPayer.toString()),
    };

    console.log('🧪 Testing metadata instruction creation...');

    const connection = new Connection(RPC_URL, 'confirmed');
    
    const result = await createMetadataAccount(
      testMint,
      testPayer,
      testMetadata,
      connection
    );

    console.log('✅ Metadata instruction created successfully!');
    console.log('📍 Metadata address:', result.metadataAddress.toString());
    
    // Serialize transaction to base64 to verify it contains actual instructions
    const transactionBase64 = result.transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString('base64');

    // Get instruction details
    const instructions = result.transaction.instructions;
    const firstInstruction = instructions[0];
    
    const instructionData = {
      programId: firstInstruction.programId.toString(),
      accountsCount: firstInstruction.keys.length,
      dataLength: firstInstruction.data.length,
      accounts: firstInstruction.keys.map(key => ({
        pubkey: key.pubkey.toString(),
        isSigner: key.isSigner,
        isWritable: key.isWritable,
      })),
    };

    res.status(200).json({
      success: true,
      instructionCreated: true,
      metadataAddress: result.metadataAddress.toString(),
      transactionBase64: transactionBase64,
      instructionData: instructionData,
    });

  } catch (error) {
    console.error('❌ Test failed:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    res.status(500).json({ 
      success: false, 
      error: `Test failed: ${errorMessage}`,
      instructionCreated: false,
    });
  }
}
