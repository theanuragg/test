import { NextApiRequest, NextApiResponse } from 'next';
import * as AWS from 'aws-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

// Environment variables with type assertions
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID as string;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY as string;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID as string;
const R2_BUCKET = process.env.R2_BUCKET as string;
const RPC_URL = process.env.RPC_URL as string;
const POOL_CONFIG_KEY = process.env.POOL_CONFIG_KEY as string;

if (
  !R2_ACCESS_KEY_ID ||
  !R2_SECRET_ACCESS_KEY ||
  !R2_ACCOUNT_ID ||
  !R2_BUCKET ||
  !RPC_URL ||
  !POOL_CONFIG_KEY
) {
  throw new Error('Missing required environment variables');
}

const PRIVATE_R2_URL = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const PUBLIC_R2_URL = 'https://pub-85c7f5f0dc104dc784e656b623d999e5.r2.dev'; // (where can we got this)

// Types
type UploadRequest = {
  tokenLogo: string;
  tokenName: string;
  tokenSymbol: string;
  mint: string;
  userWallet: string;
  quoteTokens: string[];
  poolType: 'DBC' | 'Standard';
};

type Metadata = {
  name: string;
  symbol: string;
  image: string;
};

type MetadataUploadParams = {
  tokenName: string;
  tokenSymbol: string;
  mint: string;
  image: string;
};

// R2 client setup
const r2 = new AWS.S3({
  endpoint: PRIVATE_R2_URL,
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tokenLogo, tokenName, tokenSymbol, mint, userWallet, quoteTokens, poolType } = req.body as UploadRequest;

    // Validate required fields
    if (!tokenLogo || !tokenName || !tokenSymbol || !mint || !userWallet || !quoteTokens || quoteTokens.length === 0 || !poolType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Upload image and metadata
    const imageUrl = await uploadImage(tokenLogo, mint);
    if (!imageUrl) {
      return res.status(400).json({ error: 'Failed to upload image' });
    }

    const metadataUrl = await uploadMetadata({ tokenName, tokenSymbol, mint, image: imageUrl });
    if (!metadataUrl) {
      return res.status(400).json({ error: 'Failed to upload metadata' });
    }

    // Create pool transaction
    console.log('🚀 Creating DBC Pool:', {
      tokenName,
      tokenSymbol,
      mint,
      poolType,
      quoteTokens,
      userWallet,
      metadataUrl
    });

    const poolTx = await createPoolTransaction({
      mint,
      tokenName,
      tokenSymbol,
      metadataUrl,
      userWallet,
      quoteTokens,
      poolType,
    });

    // Log transaction details
    console.log('📝 Pool Transaction Created:', {
      feePayer: poolTx.feePayer?.toBase58(),
      recentBlockhash: poolTx.recentBlockhash,
      instructions: poolTx.instructions.length,
      signers: poolTx.signatures.length
    });

    // Extract pool ID from the transaction (this will be the mint address for now)
    const poolId = mint;
    
    console.log('✅ Pool Creation Successful:', {
      poolId,
      tokenName,
      tokenSymbol,
      poolType,
      quoteTokens
    });

    res.status(200).json({
      success: true,
      poolTx: poolTx
        .serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        })
        .toString('base64'),
      poolId,
      poolInfo: {
        tokenName,
        tokenSymbol,
        mint,
        poolType,
        quoteTokens,
        metadataUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}

async function uploadImage(tokenLogo: string, mint: string): Promise<string | false> {
  const matches = tokenLogo.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    return false;
  }

  const [, contentType, base64Data] = matches;

  if (!contentType || !base64Data) {
    return false;
  }

  const fileBuffer = Buffer.from(base64Data, 'base64');
  const fileName = `images/${mint}.${contentType.split('/')[1]}`;

  try {
    await uploadToR2(fileBuffer, contentType, fileName);
    return `${PUBLIC_R2_URL}/${fileName}`;
  } catch (error) {
    console.error('Error uploading image:', error);
    return false;
  }
}

async function uploadMetadata(params: MetadataUploadParams): Promise<string | false> {
  const metadata: Metadata = {
    name: params.tokenName,
    symbol: params.tokenSymbol,
    image: params.image,
  };
  const fileName = `metadata/${params.mint}.json`;

  try {
    await uploadToR2(Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json', fileName);
    return `${PUBLIC_R2_URL}/${fileName}`;
  } catch (error) {
    console.error('Error uploading metadata:', error);
    return false;
  }
}

async function uploadToR2(
  fileBuffer: Buffer,
  contentType: string,
  fileName: string
): Promise<AWS.S3.PutObjectOutput> {
  return new Promise((resolve, reject) => {
    r2.putObject(
      {
        Bucket: R2_BUCKET,
        Key: fileName,
        Body: fileBuffer,
        ContentType: contentType,
      },
      (err, data) => {
        if (err) {
          reject(err);
        } else {
          resolve(data);
        }
      }
    );
  });
}

async function createPoolTransaction({
  mint,
  tokenName,
  tokenSymbol,
  metadataUrl,
  userWallet,
  quoteTokens,
  poolType,
}: {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  metadataUrl: string;
  userWallet: string;
  quoteTokens: string[];
  poolType: 'DBC' | 'Standard';
}) {
  const connection = new Connection(RPC_URL, 'confirmed');
  const client = new DynamicBondingCurveClient(connection, 'confirmed');

  let poolTx;
  
  if (poolType === 'DBC') {
    // For DBC pools, create pools for each quote token
    if (quoteTokens.length === 0) {
      throw new Error('At least one quote token is required for DBC pools');
    }
    
    console.log('🔧 DBC Pool Configuration:', {
      config: POOL_CONFIG_KEY,
      baseMint: mint,
      name: tokenName,
      symbol: tokenSymbol,
      quoteTokens,
      poolCreator: userWallet
    });
    
    // Create the first pool (we'll extend this to handle multiple quote tokens)
    poolTx = await client.pool.createPool({
      config: new PublicKey(POOL_CONFIG_KEY),
      baseMint: new PublicKey(mint),
      name: tokenName,
      symbol: tokenSymbol,
      uri: metadataUrl,
      payer: new PublicKey(userWallet),
      poolCreator: new PublicKey(userWallet),
    });
    
    console.log('🏗️ DBC Pool Transaction Built:', {
      instructions: poolTx.instructions.length,
      signers: poolTx.signatures.length,
      baseMint: mint,
      quoteTokens: quoteTokens.join(', ')
    });
    
    // TODO: For multiple quote tokens, we would need to create additional pools
    // or use a different DBC configuration that supports multiple quote tokens
    console.log(`✅ DBC pool transaction created for ${tokenName} with quote tokens: ${quoteTokens.join(', ')}`);
  } else {
    // Standard pool creation
    console.log('🔧 Standard Pool Configuration:', {
      config: POOL_CONFIG_KEY,
      baseMint: mint,
      name: tokenName,
      symbol: tokenSymbol,
      poolCreator: userWallet
    });
    
    poolTx = await client.pool.createPool({
      config: new PublicKey(POOL_CONFIG_KEY),
      baseMint: new PublicKey(mint),
      name: tokenName,
      symbol: tokenSymbol,
      uri: metadataUrl,
      payer: new PublicKey(userWallet),
      poolCreator: new PublicKey(userWallet),
    });
    
    console.log('🏗️ Standard Pool Transaction Built:', {
      instructions: poolTx.instructions.length,
      signers: poolTx.signatures.length,
      baseMint: mint
    });
  }

  const { blockhash } = await connection.getLatestBlockhash();
  poolTx.feePayer = new PublicKey(userWallet);
  poolTx.recentBlockhash = blockhash;

  return poolTx;
}
