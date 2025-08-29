import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { createDbcConfigAndPool, validateDbcConfig, estimateDbcCosts } from '../../lib/studio/dbc-integration';
import { 
  generateDbcConfig, 
  createConfigTemplate, 
  convertUserInputToStudioConfig,
  getQuoteMintAddress,
  validateQuoteMintAddress 
} from '../../lib/studio/config-template';

// Environment variables
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'mainnet';
const PARTNER_CONFIG_KEY = process.env.POOL_CONFIG_KEY;

interface CreatePoolRequest {
  tokenName: string;
  tokenSymbol: string;
  metadataUrl: string;
  userWallet: string;
  quoteMint?: string; // Optional, defaults to USDC
  // Optional overrides from studio's dbc_config.jsonc
  initialMarketCap?: number;
  migrationMarketCap?: number;
  creatorTradingFeePercentage?: number;
  dynamicFeeEnabled?: boolean;
  migrationFeeOption?: number;
  creatorLpPercentage?: number;
  partnerLpPercentage?: number;
  creatorLockedLpPercentage?: number;
  partnerLockedLpPercentage?: number;
}

interface CreatePoolResponse {
  success: boolean;
  configPublicKey?: string;
  baseMintKeypair?: number[];
  configTemplate?: any; // Configuration template for preview
  estimatedCosts?: any;
  error?: string;
}

/**
 * Creates a pool using studio's DBC logic with dbc_config.jsonc integration
 * This endpoint eliminates the need for pre-configured POOL_CONFIG_KEY
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatePoolResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { 
      tokenName, 
      tokenSymbol, 
      metadataUrl, 
      userWallet, 
      quoteMint,
      initialMarketCap,
      migrationMarketCap,
      creatorTradingFeePercentage,
      dynamicFeeEnabled,
      migrationFeeOption,
      creatorLpPercentage,
      partnerLpPercentage,
      creatorLockedLpPercentage,
      partnerLockedLpPercentage
    }: CreatePoolRequest = req.body;

    // Validate required fields
    if (!tokenName || !tokenSymbol || !metadataUrl || !userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: tokenName, tokenSymbol, metadataUrl, userWallet'
      });
    }

    console.log('🚀 Starting pool creation with studio dbc_config.jsonc integration...');
    console.log('📋 Pool details:', { tokenName, tokenSymbol, metadataUrl, userWallet });

    // 1. Set up connection and wallet
    const connection = new Connection(RPC_URL, 'confirmed');
    const wallet = {
      publicKey: new PublicKey(userWallet),
      payer: new PublicKey(userWallet),
    } as any; // Type assertion for studio integration compatibility

    // 2. Determine quote mint (default to USDC)
    const defaultQuoteMint = getQuoteMintAddress('USDC', NETWORK as 'mainnet' | 'devnet');
    const finalQuoteMint = quoteMint || defaultQuoteMint;
    
    // Validate quote mint address
    if (!validateQuoteMintAddress(finalQuoteMint, NETWORK as 'mainnet' | 'devnet')) {
      return res.status(400).json({
        success: false,
        error: `Invalid quote mint address for ${NETWORK}: ${finalQuoteMint}`
      });
    }
    
    console.log(`💱 Using quote mint: ${finalQuoteMint}`);

    // 3. Generate DBC configuration using studio's dbc_config.jsonc as template
    console.log('⚙️ Generating DBC configuration from studio template...');
    
    const dbcConfig = convertUserInputToStudioConfig({
      tokenName,
      tokenSymbol,
      metadataUrl,
      quoteMint: finalQuoteMint,
      network: NETWORK as 'mainnet' | 'devnet',
      initialMarketCap,
      migrationMarketCap,
      creatorTradingFeePercentage,
      dynamicFeeEnabled,
      migrationFeeOption,
      creatorLpPercentage,
      partnerLpPercentage,
      creatorLockedLpPercentage,
      partnerLockedLpPercentage
    });

    // 4. Validate configuration against studio constraints
    console.log('🔍 Validating configuration against studio constraints...');
    const validation = validateDbcConfig(dbcConfig);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: `Configuration validation failed: ${validation.errors.join(', ')}`
      });
    }

    // 5. Create configuration template for preview
    const configTemplate = createConfigTemplate(
      tokenName,
      tokenSymbol,
      metadataUrl,
      finalQuoteMint,
      NETWORK as 'mainnet' | 'devnet'
    );

    // 6. Estimate costs
    const estimatedCosts = estimateDbcCosts(NETWORK as 'mainnet' | 'devnet');

    console.log('📊 Configuration template:', JSON.stringify(configTemplate, null, 2));
    console.log('💰 Estimated costs:', estimatedCosts);

    // 7. Generate base mint keypair
    const baseMint = Keypair.generate();
    console.log(`🪙 Generated base mint: ${baseMint.publicKey.toString()}`);

    // 8. Create pool using studio's DBC logic
    console.log('🏊 Creating pool using studio integration...');
    // Force use of existing partner config if available
    if (PARTNER_CONFIG_KEY) {
      // set dbcConfig to use existing config
      (dbcConfig as any).dbcConfigAddress = new PublicKey(PARTNER_CONFIG_KEY);
    }
    const result = await createDbcConfigAndPool(
      dbcConfig,
      connection,
      wallet,
      new PublicKey(finalQuoteMint),
      baseMint
    );

    // 9. Return success response with configuration template
    const response: CreatePoolResponse = {
      success: true,
      configPublicKey: result.configPublicKey.toString(),
      baseMintKeypair: Array.from(baseMint.secretKey),
      configTemplate, // Include the configuration template for reference
      estimatedCosts, // Include cost estimation
    };

    console.log('✅ Pool creation completed successfully');
    console.log(`🪙 Base Mint: ${baseMint.publicKey.toString()}`);
    console.log(`📊 Config Public Key: ${result.configPublicKey.toString()}`);
    console.log('📋 Configuration used:', JSON.stringify(configTemplate, null, 2));

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error in create-pool-with-studio API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      error: `Failed to create pool: ${errorMessage}`
    });
  }
}
