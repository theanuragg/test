import { NextApiRequest, NextApiResponse } from 'next';
import AWS from 'aws-sdk';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
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
const PUBLIC_R2_URL = process.env.R2_PUBLIC_URL  || 'https://pub-0047415c6eef40ddb3797845cba68874.r2.dev';

if (!PUBLIC_R2_URL) {
  throw new Error('Missing required environment variable: R2_PUBLIC_URL');
}

// Types
type UploadRequest = {
  tokenLogo: string;
  tokenName: string;
  tokenSymbol: string;
  mint: string;
  userWallet: string;
};

type UploadResponse = {
  success: boolean;
  poolTx?: string;
  imageUrl?: string;
  metadataUrl?: string;
  mintAddress?: string;
  message?: string;
  error?: string;
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

export default async function handler(req: NextApiRequest, res: NextApiResponse<UploadResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { tokenLogo, tokenName, tokenSymbol, mint, userWallet } = req.body as UploadRequest;

    // Validate required fields
    if (!tokenLogo || !tokenName || !tokenSymbol || !mint || !userWallet) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    console.log('🚀 Starting token creation with metadata for:', { tokenName, tokenSymbol, mint });
    console.log('🔍 Meteora DBC will create metadata account automatically');

    // Setup connection
    const connection = new Connection(RPC_URL, 'confirmed');
    const payerPublicKey = new PublicKey(userWallet);
    const mintPublicKey = new PublicKey(mint);

    // Upload image and metadata to R2
    const imageUrl = await uploadImage(tokenLogo, mint);
    if (!imageUrl) {
      return res.status(400).json({ success: false, error: 'Failed to upload image' });
    }

    const metadataUrl = await uploadMetadata({ tokenName, tokenSymbol, mint, image: imageUrl });
    if (!metadataUrl) {
      return res.status(400).json({ success: false, error: 'Failed to upload metadata' });
    }

    console.log('✅ Uploaded metadata to R2:', metadataUrl);

    // Create pool transaction (Meteora DBC handles metadata account creation)
    const poolTx = await createPoolTransaction({
      mint,
      tokenName,
      tokenSymbol,
      metadataUrl,
      userWallet,
    });

    console.log('✅ Pool transaction created!');
    console.log('📝 JSON metadata uploaded to R2:', metadataUrl);
    console.log('🖼️ Image uploaded to R2:', imageUrl);
    console.log('🔍 Meteora DBC will create metadata account automatically');

    const response: UploadResponse = {
      success: true,
      poolTx: poolTx
        .serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        })
        .toString('base64'),
      imageUrl,
      metadataUrl,
      mintAddress: mint,
      message: `✅ Pool transaction ready! Meteora DBC will create metadata account with name: ${tokenName}`,
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Upload error:', error);
    
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

// Increase body size limit to accommodate base64-encoded images (<2MB raw ~ ~2.7MB base64)
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '5mb',
    },
  },
};

async function uploadImage(tokenLogo: string, mint: string): Promise<string | false> {
  try {
    const matches = tokenLogo.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      console.error('Invalid base64 format');
      return false;
    }

    const [, contentType, base64Data] = matches;

    if (!contentType || !base64Data) {
      console.error('Missing contentType or base64Data');
      return false;
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');
    const fileName = `tokens/${mint}.${contentType.split('/')[1]}`;

    await uploadToR2(fileBuffer, contentType, fileName);
    console.log('fileName', `${PUBLIC_R2_URL}/${fileName}`);
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

  console.log('📝 Uploading metadata to R2...');
  console.log('📄 Metadata content:', JSON.stringify(metadata, null, 2));
  console.log('📂 File name:', fileName);
  console.log('🔗 Expected URL:', `${PUBLIC_R2_URL}/${fileName}`);

  try {
    const uploadResult = await uploadToR2(Buffer.from(JSON.stringify(metadata, null, 2)), 'application/json', fileName);
    console.log('✅ R2 upload result:', uploadResult);
    console.log('🎯 Metadata should be accessible at:', `${PUBLIC_R2_URL}/${fileName}`);
    
    return `${PUBLIC_R2_URL}/${fileName}`;
  } catch (error) {
    console.error('❌ Error uploading metadata to R2:', error);
    console.error('📋 Upload details:', {
      fileName,
      metadataSize: JSON.stringify(metadata).length,
      bucket: R2_BUCKET,
      publicUrl: PUBLIC_R2_URL,
    });
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
        ACL: 'public-read', // Make the file publicly readable
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
}: {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  metadataUrl: string;
  userWallet: string;
}) {
  const connection = new Connection(RPC_URL, 'confirmed');
  const client = new DynamicBondingCurveClient(connection, 'confirmed');

  const poolTx = await client.pool.createPool({
    config: new PublicKey(POOL_CONFIG_KEY),
    baseMint: new PublicKey(mint),
    name: tokenName,
    symbol: tokenSymbol,
    uri: metadataUrl,
    payer: new PublicKey(userWallet),
    poolCreator: new PublicKey(userWallet),
  });

  const { blockhash } = await connection.getLatestBlockhash();
  poolTx.feePayer = new PublicKey(userWallet);
  poolTx.recentBlockhash = blockhash;

  return poolTx;
}
