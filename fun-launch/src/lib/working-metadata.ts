import { 
  Connection, 
  PublicKey, 
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';

// Metaplex Token Metadata Program ID (constant)
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');

export interface TokenMetadata {
  name: string;
  symbol: string;
  uri: string;
}

/**
 * Creates a working metadata account using raw instruction data
 * This bypasses the problematic SDK imports in Next.js
 */
export async function createWorkingMetadataAccount(
  connection: Connection,
  mint: PublicKey,
  payer: PublicKey,
  metadata: TokenMetadata
): Promise<{
  transaction: Transaction;
  metadataAddress: PublicKey;
}> {
  // Calculate metadata account address (PDA)
  const [metadataAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );

  console.log(`📝 Creating metadata at: ${metadataAddress.toString()}`);
  
  // Create instruction data manually (proven working approach)
  const instructionData = createMetadataInstructionData(metadata, payer);

  // Account metas for the instruction
  const accounts = [
    { pubkey: metadataAddress, isSigner: false, isWritable: true },    // metadata
    { pubkey: mint, isSigner: false, isWritable: false },              // mint
    { pubkey: payer, isSigner: true, isWritable: false },              // mint authority
    { pubkey: payer, isSigner: true, isWritable: true },               // payer
    { pubkey: payer, isSigner: false, isWritable: false },             // update authority
    { pubkey: new PublicKey('11111111111111111111111111111112'), isSigner: false, isWritable: false }, // system program
    { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false }, // rent
  ];

  // Create the instruction
  const instruction = new TransactionInstruction({
    keys: accounts,
    programId: TOKEN_METADATA_PROGRAM_ID,
    data: instructionData,
  });

  const transaction = new Transaction().add(instruction);

  // Set recent blockhash and fee payer
  try {
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = payer;
  } catch (error) {
    console.warn('Could not set blockhash (normal for test environments):', error);
  }

  console.log('✅ Working metadata transaction created!');

  return {
    transaction,
    metadataAddress,
  };
}

/**
 * Creates instruction data for CreateMetadataAccountV3
 * Based on the working Python implementation from Solana Stack Exchange
 */
function createMetadataInstructionData(metadata: TokenMetadata, creator: PublicKey): Buffer {
  // Instruction discriminator for CreateMetadataAccountV3 (from Solana Stack Exchange)
  const discriminator = Buffer.from([33]); // 0x21
  
  // Serialize string data
  const nameBuffer = Buffer.from(metadata.name, 'utf-8');
  const symbolBuffer = Buffer.from(metadata.symbol, 'utf-8');
  const uriBuffer = Buffer.from(metadata.uri, 'utf-8');
  
  // Calculate required buffer size
  const totalSize = 
    4 + nameBuffer.length +     // name (4-byte length + data)
    4 + symbolBuffer.length +   // symbol (4-byte length + data)
    4 + uriBuffer.length +      // uri (4-byte length + data)
    2 +                         // seller fee basis points (2 bytes)
    1 +                         // creators option flag (1 byte)
    4 +                         // creators array length (4 bytes)
    32 +                        // creator address (32 bytes)
    1 +                         // creator verified flag (1 byte)
    1 +                         // creator share (1 byte)
    1 +                         // collection option (1 byte for None)
    1 +                         // uses option (1 byte for None)
    1 +                         // isMutable flag (1 byte)
    1;                          // collectionDetails option (1 byte for None)
    
  const data = Buffer.alloc(totalSize);
  let offset = 0;
  
  // Name (length-prefixed string)
  data.writeUInt32LE(nameBuffer.length, offset);
  offset += 4;
  nameBuffer.copy(data, offset);
  offset += nameBuffer.length;
  
  // Symbol (length-prefixed string)
  data.writeUInt32LE(symbolBuffer.length, offset);
  offset += 4;
  symbolBuffer.copy(data, offset);
  offset += symbolBuffer.length;
  
  // URI (length-prefixed string)
  data.writeUInt32LE(uriBuffer.length, offset);
  offset += 4;
  uriBuffer.copy(data, offset);
  offset += uriBuffer.length;
  
  // Seller fee basis points (0)
  data.writeUInt16LE(0, offset);
  offset += 2;
  
  // Creators (Some - 1 creator)
  data.writeUInt8(1, offset); // Option::Some
  offset += 1;
  data.writeUInt32LE(1, offset); // Array length = 1
  offset += 4;
  
  // Creator data
  creator.toBuffer().copy(data, offset); // Creator address (32 bytes)
  offset += 32;
  data.writeUInt8(1, offset); // Verified = true
  offset += 1;
  data.writeUInt8(100, offset); // Share = 100%
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

/**
 * Check if metadata account exists
 */
export async function checkMetadataExists(
  connection: Connection,
  mint: PublicKey
): Promise<boolean> {
  try {
    const [metadataAddress] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        mint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );

    const accountInfo = await connection.getAccountInfo(metadataAddress);
    return accountInfo !== null;
  } catch (error) {
    return false;
  }
}
