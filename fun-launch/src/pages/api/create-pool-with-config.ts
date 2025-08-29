import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import { createDbcPool } from '../../lib/studio/dbc-integration';
import { 
  generateDbcConfig, 
  getQuoteMintAddress,
  validateQuoteMintAddress 
} from '../../lib/studio/config-template';

// Environment variables
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const NETWORK = process.env.NEXT_PUBLIC_NETWORK || 'mainnet';

interface CreatePoolWithConfigRequest {
  userWallet: string;
  configPublicKey: string; // Existing DBC config key
  tokenName: string;
  tokenSymbol: string;
  metadataUrl: string;
  quoteMint?: string; // Optional, defaults to USDC
}

interface CreatePoolWithConfigResponse {
  success: boolean;
  baseMint?: string;
  baseMintKeypair?: number[];
  poolCreated?: boolean;
  error?: string;
}

/**
 * Creates a pool using an existing DBC config key
 * This endpoint requires a pre-created DBC config key
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CreatePoolWithConfigResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { 
      userWallet, 
      configPublicKey,
      tokenName,
      tokenSymbol,
      metadataUrl,
      quoteMint
    }: CreatePoolWithConfigRequest = req.body;

    // Validate required fields
    if (!userWallet || !configPublicKey || !tokenName || !tokenSymbol || !metadataUrl) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userWallet, configPublicKey, tokenName, tokenSymbol, metadataUrl'
      });
    }

    console.log('🏊 Starting pool creation with existing DBC config...');
    console.log('📋 Pool details:', { userWallet, configPublicKey, tokenName, tokenSymbol });

    // 1. Set up connection and wallet
    const connection = new Connection(RPC_URL, 'confirmed');
    const wallet = {
      publicKey: new PublicKey(userWallet),
      payer: new PublicKey(userWallet),
    } as any; // Type assertion for studio integration compatibility

    // 2. Validate config public key
    try {
      new PublicKey(configPublicKey);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid config public key format'
      });
    }

    // 3. Determine quote mint (default to USDC)
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
    console.log(`📊 Using existing config: ${configPublicKey}`);

    // 4. Generate DBC configuration with existing config key
    console.log('⚙️ Generating DBC configuration with existing config key...');
    
    const dbcConfig = generateDbcConfig(
      tokenName,
      tokenSymbol,
      metadataUrl,
      finalQuoteMint,
      NETWORK as 'mainnet' | 'devnet'
    );

    // 5. Set the existing config key
    dbcConfig.dbcConfigAddress = new PublicKey(configPublicKey);

    // 6. Generate base mint keypair
    const baseMint = Keypair.generate();
    console.log(`🪙 Generated base mint: ${baseMint.publicKey.toString()}`);

    // 7. Create pool using existing config
    console.log('🏊 Creating pool using existing DBC config...');
    await createDbcPool(
      dbcConfig,
      connection,
      wallet,
      new PublicKey(finalQuoteMint),
      baseMint
    );

    // 8. Return success response
    const response: CreatePoolWithConfigResponse = {
      success: true,
      baseMint: baseMint.publicKey.toString(),
      baseMintKeypair: Array.from(baseMint.secretKey),
      poolCreated: true,
    };

    console.log('✅ Pool created successfully with existing config');
    console.log(`🪙 Base Mint: ${baseMint.publicKey.toString()}`);
    console.log(`📊 Config Public Key: ${configPublicKey}`);

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error in create-pool-with-config API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      error: `Failed to create pool with config: ${errorMessage}`
    });
  }
}
