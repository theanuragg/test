import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

const RPC_URL = process.env.RPC_URL as string;
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

interface CreateSimpleMetadataRequest {
  mintAddress: string;
  userWallet: string;
  tokenName: string;
  tokenSymbol: string;
  metadataUri: string;
}

interface CreateSimpleMetadataResponse {
  success: boolean;
  metadataAddress?: string;
  transactionBase64?: string;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreateSimpleMetadataResponse>
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
    }: CreateSimpleMetadataRequest = req.body;

    // Validate required fields
    if (!mintAddress || !userWallet || !tokenName || !tokenSymbol || !metadataUri) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: mintAddress, userWallet, tokenName, tokenSymbol, metadataUri'
      });
    }

    console.log('📝 Creating metadata account for:', { tokenName, tokenSymbol, mintAddress });

    const connection = new Connection(RPC_URL, 'confirmed');
    const mintPublicKey = new PublicKey(mintAddress);
    const payerPublicKey = new PublicKey(userWallet);

    // Calculate metadata account address (PDA)
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mintPublicKey.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    console.log('📍 Metadata PDA:', metadataAddress.toString());

    // Check if metadata account already exists
    const metadataAccountInfo = await connection.getAccountInfo(metadataAddress);
    
    if (metadataAccountInfo) {
      console.log('ℹ️ Metadata account already exists');
      return res.status(200).json({
        success: true,
        metadataAddress: metadataAddress.toString(),
        message: 'Metadata account already exists for this mint',
      });
    }

    // Create simple metadata instruction using raw instruction data
    const instructionData = createSimpleMetadataData(tokenName, tokenSymbol, metadataUri);

    const accounts = [
      { pubkey: metadataAddress, isSigner: false, isWritable: true },    // metadata
      { pubkey: mintPublicKey, isSigner: false, isWritable: false },     // mint
      { pubkey: payerPublicKey, isSigner: true, isWritable: false },     // mint authority
      { pubkey: payerPublicKey, isSigner: true, isWritable: true },      // payer
      { pubkey: payerPublicKey, isSigner: false, isWritable: false },    // update authority
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }, // system program
      { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false }, // rent sysvar
    ];

    const instruction = {
      keys: accounts,
      programId: TOKEN_METADATA_PROGRAM_ID,
      data: instructionData,
    };

    const transaction = new Transaction().add(instruction);

    // Set recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payerPublicKey;

    const transactionBase64 = transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString('base64');

    console.log('✅ Metadata transaction created successfully');

    res.status(200).json({
      success: true,
      metadataAddress: metadataAddress.toString(),
      transactionBase64,
      message: `Metadata account transaction created for ${tokenName} (${tokenSymbol})`,
    });

  } catch (error) {
    console.error('Create simple metadata error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

/**
 * Creates simple metadata instruction data for CreateMetadataAccountV3
 * This is a simplified version that works reliably
 */
function createSimpleMetadataData(name: string, symbol: string, uri: string): Buffer {
  // Instruction discriminator for CreateMetadataAccountV3
  const discriminator = Buffer.from([42]); // 0x2a
  
  // Create buffers for string data
  const nameBytes = Buffer.from(name, 'utf-8');
  const symbolBytes = Buffer.from(symbol, 'utf-8');
  const uriBytes = Buffer.from(uri, 'utf-8');
  
  // Calculate total size needed
  const dataSize = 
    4 + nameBytes.length +     // name length + data
    4 + symbolBytes.length +   // symbol length + data  
    4 + uriBytes.length +      // uri length + data
    2 +                        // seller fee basis points
    1 +                        // creators option (None = 0)
    1 +                        // collection option (None = 0)
    1 +                        // uses option (None = 0)
    1 +                        // isMutable
    1;                         // collectionDetails option (None = 0)
  
  const data = Buffer.alloc(dataSize);
  let offset = 0;
  
  // Name
  data.writeUInt32LE(nameBytes.length, offset);
  offset += 4;
  nameBytes.copy(data, offset);
  offset += nameBytes.length;
  
  // Symbol
  data.writeUInt32LE(symbolBytes.length, offset);
  offset += 4;
  symbolBytes.copy(data, offset);
  offset += symbolBytes.length;
  
  // URI
  data.writeUInt32LE(uriBytes.length, offset);
  offset += 4;
  uriBytes.copy(data, offset);
  offset += uriBytes.length;
  
  // Seller fee basis points (0)
  data.writeUInt16LE(0, offset);
  offset += 2;
  
  // Creators (None)
  data.writeUInt8(0, offset);
  offset += 1;
  
  // Collection (None)
  data.writeUInt8(0, offset);
  offset += 1;
  
  // Uses (None)
  data.writeUInt8(0, offset);
  offset += 1;
  
  // isMutable (true)
  data.writeUInt8(1, offset);
  offset += 1;
  
  // collectionDetails (None)
  data.writeUInt8(0, offset);
  offset += 1;
  
  return Buffer.concat([discriminator, data]);
}
