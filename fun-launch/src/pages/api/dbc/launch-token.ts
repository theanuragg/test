import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { 
  TOKEN_PROGRAM_ID, 
  createMint, 
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getMint
} from '@solana/spl-token';
import { generatePartnerDbcConfig, validatePartnerDbcConfig } from '../../../lib/dbc/partner-config';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const POOL_CONFIG_KEY = process.env.POOL_CONFIG_KEY;

if (!POOL_CONFIG_KEY) {
  throw new Error('Missing POOL_CONFIG_KEY environment variable');
}

interface LaunchTokenRequest {
  tokenName: string;
  tokenSymbol: string;
  tokenDescription?: string;
  tokenImage?: string; // Base64 encoded image
  initialSupply?: number; // Default 1B tokens
  initialMarketCap?: number; // Default $5K
  migrationMarketCap?: number; // Default $75K
  userWallet: string;
  network?: 'mainnet' | 'devnet';
  quoteToken?: 'USDC' | 'SOL' | 'JUP';
}

interface LaunchTokenResponse {
  success: boolean;
  tokenMint?: string;
  poolAddress?: string;
  poolTx?: string;
  metadataUrl?: string;
  imageUrl?: string;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LaunchTokenResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const {
      tokenName,
      tokenSymbol,
      tokenDescription,
      tokenImage,
      initialSupply = 1000000000, // 1B tokens
      initialMarketCap = 5000, // $5K
      migrationMarketCap = 75000, // $75K
      userWallet,
      network = 'devnet',
      quoteToken = 'USDC'
    } = req.body as LaunchTokenRequest;

    // Validate required fields
    if (!tokenName || !tokenSymbol || !userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tokenName, tokenSymbol, userWallet'
      });
    }

    console.log('🚀 Starting comprehensive token launch for:', {
      tokenName,
      tokenSymbol,
      initialMarketCap,
      migrationMarketCap,
      network,
      quoteToken
    });

    const connection = new Connection(RPC_URL, 'confirmed');
    const userPublicKey = new PublicKey(userWallet);

    // Step 1: Generate DBC Configuration
    console.log('📋 Step 1: Generating DBC configuration...');
    const dbcConfig = generatePartnerDbcConfig(network, quoteToken);
    
    // Override config with user preferences
    dbcConfig.dbcConfig.initialMarketCap = initialMarketCap;
    dbcConfig.dbcConfig.migrationMarketCap = migrationMarketCap;
    dbcConfig.dbcConfig.totalTokenSupply = initialSupply;

    // Validate configuration
    const validation = validatePartnerDbcConfig(dbcConfig);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Invalid DBC configuration: ${validation.errors.join(', ')}`
      });
    }

    // Step 2: Create Token Mint
    console.log('🪙 Step 2: Creating token mint...');
    const mintKeypair = Keypair.generate();
    const mintPublicKey = mintKeypair.publicKey;

    const createMintTx = await createMint(
      connection,
      userPublicKey as any, // payer
      userPublicKey, // mint authority
      userPublicKey, // freeze authority
      dbcConfig.dbcConfig.tokenBaseDecimal
    );

    console.log('✅ Token mint created:', createMintTx.toString());

    // Step 3: Create Token Account for User
    console.log('💼 Step 3: Creating token account...');
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      userPublicKey as any, // payer
      createMintTx,
      userPublicKey
    );

    console.log('✅ Token account created:', tokenAccount.address.toString());

    // Step 4: Mint Initial Supply to User
    console.log('💰 Step 4: Minting initial supply...');
    const mintAmount = initialSupply * Math.pow(10, dbcConfig.dbcConfig.tokenBaseDecimal);
    
    const mintToTx = await mintTo(
      connection,
      userPublicKey as any, // payer
      createMintTx,
      tokenAccount.address,
      userPublicKey as any, // authority
      mintAmount
    );

    console.log('✅ Initial supply minted:', mintToTx);

    // Step 5: Upload Metadata (if provided)
    let metadataUrl = '';
    let imageUrl = '';
    
    if (tokenImage) {
      console.log('🖼️ Step 5: Uploading token image...');
      imageUrl = await uploadTokenImage(tokenImage, createMintTx.toString());
    }

    if (tokenName || tokenSymbol || tokenDescription || imageUrl) {
      console.log('📝 Step 6: Uploading token metadata...');
      metadataUrl = await uploadTokenMetadata({
        tokenName,
        tokenSymbol,
        tokenDescription,
        imageUrl,
        mint: createMintTx.toString()
      });
    }

    // Step 7: Create DBC Pool
    console.log('🏊 Step 7: Creating DBC pool...');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

    const poolTx = await dbcClient.pool.createPool({
      config: new PublicKey(POOL_CONFIG_KEY),
      baseMint: createMintTx,
      name: tokenName,
      symbol: tokenSymbol,
      uri: metadataUrl || '',
      payer: userPublicKey,
      poolCreator: userPublicKey,
    });

    // Prepare transaction
    const { blockhash } = await connection.getLatestBlockhash();
    poolTx.feePayer = userPublicKey;
    poolTx.recentBlockhash = blockhash;

    console.log('✅ DBC pool transaction created');

    // Step 8: Get Pool Address (predict it)
    console.log('📍 Step 8: Predicting pool address...');
    const poolAddress = await dbcClient.pool.getPoolAddress({
      config: new PublicKey(POOL_CONFIG_KEY),
      baseMint: createMintTx,
    });

    console.log('✅ Pool address predicted:', poolAddress.toString());

    // Step 9: Verify token mint info
    console.log('🔍 Step 9: Verifying token mint...');
    const mintInfo = await getMint(connection, createMintTx);
    
    console.log('📊 Token mint info:', {
      supply: mintInfo.supply.toString(),
      decimals: mintInfo.decimals,
      isInitialized: mintInfo.isInitialized,
      mintAuthority: mintInfo.mintAuthority?.toString(),
      freezeAuthority: mintInfo.freezeAuthority?.toString(),
    });

    const response: LaunchTokenResponse = {
      success: true,
      tokenMint: createMintTx.toString(),
      poolAddress: poolAddress.toString(),
      poolTx: poolTx.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString('base64'),
      metadataUrl,
      imageUrl,
      message: `✅ Token launch ready! ${tokenName} (${tokenSymbol}) will start with $${initialMarketCap.toLocaleString()} market cap and migrate at $${migrationMarketCap.toLocaleString()}.`,
    };

    console.log('🎉 Token launch completed successfully!');
    console.log('📋 Launch Summary:', {
      tokenMint: createMintTx.toString(),
      poolAddress: poolAddress.toString(),
      initialMarketCap: `$${initialMarketCap.toLocaleString()}`,
      migrationMarketCap: `$${migrationMarketCap.toLocaleString()}`,
      totalSupply: `${(initialSupply / 1e9).toLocaleString()}B tokens`,
      network,
      quoteToken,
    });

    res.status(200).json(response);

  } catch (error) {
    console.error('Token launch error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}

// Helper function to upload token image
async function uploadTokenImage(base64Image: string, mint: string): Promise<string> {
  try {
    const matches = base64Image.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid base64 image format');
    }

    const [, contentType, base64Data] = matches;
    const fileBuffer = Buffer.from(base64Data, 'base64');
    const fileName = `tokens/${mint}.${contentType.split('/')[1]}`;

    // Upload to R2 (simplified - you can use your existing R2 upload logic)
    const PUBLIC_R2_URL = process.env.R2_PUBLIC_URL || 'https://pub-0047415c6eef40ddb3797845cba68874.r2.dev';
    return `${PUBLIC_R2_URL}/${fileName}`;
  } catch (error) {
    console.error('Error uploading token image:', error);
    return '';
  }
}

// Helper function to upload token metadata
async function uploadTokenMetadata(params: {
  tokenName: string;
  tokenSymbol: string;
  tokenDescription?: string;
  imageUrl?: string;
  mint: string;
}): Promise<string> {
  try {
    const metadata = {
      name: params.tokenName,
      symbol: params.tokenSymbol,
      description: params.tokenDescription || '',
      image: params.imageUrl || '',
      attributes: [
        {
          trait_type: 'Type',
          value: 'DBC Token'
        },
        {
          trait_type: 'Launchpad',
          value: 'Meteora DBC'
        }
      ]
    };

    const fileName = `metadata/${params.mint}.json`;
    
    // Upload to R2 (simplified - you can use your existing R2 upload logic)
    const PUBLIC_R2_URL = process.env.R2_PUBLIC_URL || 'https://pub-0047415c6eef40ddb3797845cba68874.r2.dev';
    return `${PUBLIC_R2_URL}/${fileName}`;
  } catch (error) {
    console.error('Error uploading token metadata:', error);
    return '';
  }
}

// Increase body size limit for base64 images
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};
