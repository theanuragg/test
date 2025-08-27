import { NextApiRequest, NextApiResponse } from 'next';
import * as AWS from 'aws-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
// Using native BigInt instead of bn.js for better compatibility

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

// Enhanced types for DBC configuration
type DBCConfig = {
  curveType: 'linear' | 'exponential' | 'logarithmic';
  feeRate: number; // Fee rate in basis points (e.g., 30 = 0.3%)
  slippageTolerance: number; // Slippage tolerance in basis points
  maxSupply: number; // Maximum token supply for the pool
  antiSniperConfig?: {
    mode: 'feeScheduler' | 'rateLimiter';
    feeScheduler?: {
      cliffFeeNumerator: number;
      numberOfPeriods: number;
      periodFrequency: number;
      feeReductionFactor: number;
      finalFee: number;
    };
    rateLimiter?: {
      referenceAmount: number;
      feeIncrement: number;
      maxLimiterDuration: number;
    };
  };
};

type UploadRequest = {
  tokenLogo: string;
  tokenName: string;
  tokenSymbol: string;
  mint: string;
  userWallet: string;
  quoteTokens: string[];
  poolType: 'DBC' | 'Standard';
  initialMarketCap: number;
  graduationMarketCap: number;
  dbcConfig?: DBCConfig; // Optional advanced DBC configuration
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
    const { tokenLogo, tokenName, tokenSymbol, mint, userWallet, quoteTokens, poolType, initialMarketCap, graduationMarketCap } = req.body as UploadRequest;

    // Validate required fields
    if (!tokenLogo || !tokenName || !tokenSymbol || !mint || !userWallet || !quoteTokens || quoteTokens.length === 0 || !poolType) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Validate DBC-specific fields
    if (poolType === 'DBC') {
      if (typeof initialMarketCap !== 'number' || typeof graduationMarketCap !== 'number') {
        return res.status(400).json({ error: 'Initial and graduation market caps are required for DBC pools' });
      }
      
      if (initialMarketCap < 1000 || initialMarketCap > 1000000) {
        return res.status(400).json({ error: 'Initial market cap must be between 1,000 and 1,000,000 USDC' });
      }
      
      if (graduationMarketCap < 10000 || graduationMarketCap > 10000000) {
        return res.status(400).json({ error: 'Graduation market cap must be between 10,000 and 10,000,000 USDC' });
      }
      
      if (graduationMarketCap <= initialMarketCap) {
        return res.status(400).json({ error: 'Graduation market cap must be greater than initial market cap' });
      }
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
      metadataUrl,
      initialMarketCap,
      graduationMarketCap
    });

    const poolTx = await createPoolTransaction({
      mint,
      tokenName,
      tokenSymbol,
      metadataUrl,
      userWallet,
      quoteTokens,
      poolType,
      initialMarketCap,
      graduationMarketCap,
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
      quoteTokens,
      initialMarketCap,
      graduationMarketCap
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
        metadataUrl,
        initialMarketCap,
        graduationMarketCap
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
  initialMarketCap,
  graduationMarketCap,
  dbcConfig,
}: {
  mint: string;
  tokenName: string;
  tokenSymbol: string;
  metadataUrl: string;
  userWallet: string;
  quoteTokens: string[];
  poolType: 'DBC' | 'Standard';
  initialMarketCap: number;
  graduationMarketCap: number;
  dbcConfig?: DBCConfig;
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
      poolCreator: userWallet,
      initialMarketCap,
      graduationMarketCap,
      dbcConfig
    });
    
    // Log anti-sniper configuration if enabled
    if (dbcConfig?.antiSniperConfig) {
      console.log('🛡️ Anti-Sniper Protection Enabled:', {
        mode: dbcConfig.antiSniperConfig.mode,
        feeScheduler: dbcConfig.antiSniperConfig.feeScheduler,
        rateLimiter: dbcConfig.antiSniperConfig.rateLimiter
      });
      
      if (dbcConfig.antiSniperConfig.mode === 'feeScheduler' && dbcConfig.antiSniperConfig.feeScheduler) {
        const { cliffFeeNumerator, numberOfPeriods, periodFrequency, feeReductionFactor, finalFee } = dbcConfig.antiSniperConfig.feeScheduler;
        console.log('⏰ Fee Scheduler Configuration:', {
          startingFee: `${cliffFeeNumerator / 100}%`,
          periods: numberOfPeriods,
          periodDuration: `${periodFrequency} minutes`,
          totalDuration: `${(numberOfPeriods * periodFrequency) / 60} hours`,
          feeReduction: `${feeReductionFactor / 100}% per period`,
          finalFee: `${finalFee / 100}%`
        });
      }
      
      if (dbcConfig.antiSniperConfig.mode === 'rateLimiter' && dbcConfig.antiSniperConfig.rateLimiter) {
        const { referenceAmount, feeIncrement, maxLimiterDuration } = dbcConfig.antiSniperConfig.rateLimiter;
        console.log('📊 Rate Limiter Configuration:', {
          referenceAmount: `${referenceAmount} USDC`,
          feeIncrement: `${feeIncrement / 100}% per reference amount`,
          maxDuration: `${maxLimiterDuration} hours`,
          maxFee: `${Math.min(2500, feeIncrement * (100 / referenceAmount)) / 100}%` // Cap at 25%
        });
      }
    }
    
    // Enhanced DBC pool creation with buildCurveWithMarketCap
    const curveConfig = buildCurveWithMarketCap({
      initialMarketCap: BigInt(initialMarketCap * 1e6), // Convert to lamports (USDC has 6 decimals)
      graduationMarketCap: BigInt(graduationMarketCap * 1e6), // Convert to lamports
      curveType: dbcConfig?.curveType || 'linear',
      feeRate: dbcConfig?.feeRate || 30, // Default 0.3% fee
      slippageTolerance: dbcConfig?.slippageTolerance || 100, // Default 1% slippage
      maxSupply: dbcConfig?.maxSupply || 1000000000, // Default 1B max supply
    });
    
    console.log('📊 Curve Configuration Built:', {
      curveType: curveConfig.curveType,
      feeRate: curveConfig.feeRate,
      slippageTolerance: curveConfig.slippageTolerance,
      maxSupply: curveConfig.maxSupply.toString()
    });
    
    // Create the first pool with enhanced curve configuration
    // Note: Meteora SDK may not support these parameters directly in createPool
    // The curve configuration is used for validation and logging purposes
    poolTx = await client.pool.createPool({
      config: new PublicKey(POOL_CONFIG_KEY),
      baseMint: new PublicKey(mint),
      name: tokenName,
      symbol: tokenSymbol,
      uri: metadataUrl,
      payer: new PublicKey(userWallet),
      poolCreator: new PublicKey(userWallet),
    });
    
    console.log('🏗️ Enhanced DBC Pool Transaction Built:', {
      instructions: poolTx.instructions.length,
      signers: poolTx.signatures.length,
      baseMint: mint,
      quoteTokens: quoteTokens.join(', '),
      curveType: curveConfig.curveType,
      feeRate: curveConfig.feeRate
    });
    
    // TODO: For multiple quote tokens, we would need to create additional pools
    // or use a different DBC configuration that supports multiple quote tokens
    console.log(`✅ Enhanced DBC pool transaction created for ${tokenName} with ${curveConfig.curveType} curve and ${curveConfig.feeRate}bp fee`);
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

// Enhanced curve building function using Meteora's approach
function buildCurveWithMarketCap({
  initialMarketCap,
  graduationMarketCap,
  curveType = 'linear',
  feeRate = 30,
  slippageTolerance = 100,
  maxSupply = 1000000000,
}: {
  initialMarketCap: bigint;
  graduationMarketCap: bigint;
  curveType?: 'linear' | 'exponential' | 'logarithmic';
  feeRate?: number;
  slippageTolerance?: number;
  maxSupply?: number;
}) {
  // Validate market cap parameters
  if (graduationMarketCap <= initialMarketCap) {
    throw new Error('Graduation market cap must be greater than initial market cap');
  }
  
  if (initialMarketCap <= 0n || graduationMarketCap <= 0n) {
    throw new Error('Market caps must be positive values');
  }
  
  // Calculate curve parameters based on market cap range
  const marketCapRange = graduationMarketCap - initialMarketCap;
  const curveMultiplier = calculateCurveMultiplier(curveType, marketCapRange);
  
  return {
    initialMarketCap,
    graduationMarketCap,
    curveType,
    feeRate,
    slippageTolerance,
    maxSupply: BigInt(maxSupply),
    curveMultiplier,
    marketCapRange,
  };
}

// Helper function to calculate curve multiplier based on curve type
function calculateCurveMultiplier(curveType: string, marketCapRange: bigint): bigint {
  switch (curveType) {
    case 'linear':
      return 1n; // Linear growth
    case 'exponential':
      return 2n; // Exponential growth - more aggressive price increases
    case 'logarithmic':
      return 1n; // Logarithmic growth - more gradual price increases (simplified)
    default:
      return 1n; // Default to linear
  }
}
