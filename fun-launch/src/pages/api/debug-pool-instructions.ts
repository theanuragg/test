import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const RPC_URL = process.env.RPC_URL as string;
const POOL_CONFIG_KEY = process.env.POOL_CONFIG_KEY as string;

interface DebugPoolResponse {
  success: boolean;
  transactionInstructions?: any[];
  metadataRelatedInstructions?: any[];
  poolTransaction?: string;
  analysis?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DebugPoolResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { 
      mint = '11111111111111111111111111111111111111111111', // Dummy mint
      tokenName = 'Test Token',
      tokenSymbol = 'TEST',
      metadataUrl = 'https://example.com/metadata.json',
      userWallet = '11111111111111111111111111111111111111111111' // Dummy wallet
    } = req.body;

    console.log('🔍 Debugging DBC pool creation instructions...');
    console.log('📋 Parameters:', { mint, tokenName, tokenSymbol, metadataUrl });

    const connection = new Connection(RPC_URL, 'confirmed');
    const client = new DynamicBondingCurveClient(connection, 'confirmed');

    // Create the pool transaction to analyze its instructions
    const poolTx = await client.pool.createPool({
      config: new PublicKey(POOL_CONFIG_KEY),
      baseMint: new PublicKey(mint),
      name: tokenName,
      symbol: tokenSymbol,
      uri: metadataUrl,
      payer: new PublicKey(userWallet),
      poolCreator: new PublicKey(userWallet),
    });

    console.log('✅ Pool transaction created, analyzing instructions...');

    // Analyze all instructions in the transaction
    const transactionInstructions = poolTx.instructions.map((instruction, index) => {
      return {
        instructionIndex: index,
        programId: instruction.programId.toString(),
        accountsCount: instruction.keys.length,
        dataLength: instruction.data.length,
        accounts: instruction.keys.map(key => ({
          pubkey: key.pubkey.toString(),
          isSigner: key.isSigner,
          isWritable: key.isWritable,
        })),
        // Check if this looks like a metadata instruction
        isMetadataInstruction: instruction.programId.toString() === 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s',
      };
    });

    // Filter for metadata-related instructions
    const metadataRelatedInstructions = transactionInstructions.filter(
      instruction => instruction.isMetadataInstruction
    );

    const analysis = metadataRelatedInstructions.length > 0 
      ? `✅ Found ${metadataRelatedInstructions.length} metadata instruction(s)! Meteora IS creating metadata accounts.`
      : `❌ No metadata instructions found. Meteora is NOT creating metadata accounts automatically.`;

    console.log('📊 Analysis:', analysis);
    console.log('📋 Total instructions:', transactionInstructions.length);
    console.log('🎯 Metadata instructions:', metadataRelatedInstructions.length);

    const poolTransactionBase64 = poolTx
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString('base64');

    res.status(200).json({
      success: true,
      transactionInstructions,
      metadataRelatedInstructions,
      poolTransaction: poolTransactionBase64,
      analysis,
    });

  } catch (error) {
    console.error('Debug pool error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
