import { PublicKey } from '@solana/web3.js';
import type { DbcConfig, BuildCurveWithMarketCap } from './types';
import { loadLocalDbcConfig, getLocalDbcConfigSection, getNetworkConfig } from './config-loader';

/**
 * Studio Configuration Template for Fun-Launch
 * 
 * This module provides configuration templates based on the local dbc_config.jsonc
 * and allows fun-launch to customize specific parameters while maintaining
 * compatibility with studio's validation rules.
 */

// Network-specific quote mint addresses
export const QUOTE_MINT_ADDRESSES = {
  mainnet: {
    USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    SOL: 'So11111111111111111111111111111111111111112',
    JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
  },
  devnet: {
    USDC: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
    SOL: 'So11111111111111111111111111111111111111112',
    JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN'
  }
};

// Network-specific RPC URLs
export const RPC_URLS = {
  mainnet: 'https://api.mainnet-beta.solana.com',
  devnet: 'https://api.devnet.solana.com'
};

/**
 * Get default studio configuration based on official Meteora documentation
 */
export function getStudioDefaultConfig(): BuildCurveWithMarketCap {
  return {
    buildCurveMode: 1, // buildCurveWithMarketCap
    initialMarketCap: 5000, // Starting market cap in quote token terms
    migrationMarketCap: 75000, // Migration threshold in quote token terms
    totalTokenSupply: 1000000000, // 1B tokens
    migrationOption: 1, // Migrate to DAMM v2
    tokenBaseDecimal: 9, // Token decimals
    tokenQuoteDecimal: 6, // Quote token decimals (USDC)
    
    // Vesting configuration
    lockedVestingParam: {
      totalLockedVestingAmount: 100000000, // 10% of total supply
      numberOfVestingPeriod: 24, // 24 periods
      cliffUnlockAmount: 100000000, // 10% cliff unlock
      totalVestingDuration: 2592000, // 30 days in seconds
      cliffDurationFromMigrationTime: 0, // No cliff delay
    },
    
    // Fee configuration
    baseFeeParams: {
      baseFeeMode: 0, // Linear fee scheduler
      feeSchedulerParam: {
        startingFeeBps: 200, // 2% starting fee
        endingFeeBps: 200, // 2% ending fee
        numberOfPeriod: 0, // No periods (constant fee)
        totalDuration: 0, // No duration (constant fee)
      },
    },
    
    // Advanced settings
    dynamicFeeEnabled: true, // Enable anti-sniper protection
    activationType: 1, // Timestamp-based activation
    collectFeeMode: 0, // Collect fees in quote token
    migrationFeeOption: 3, // 2% LP fee on migration
    tokenType: 0, // SPL Token standard
    
    // LP distribution (must total 100%)
    partnerLpPercentage: 25, // Partner claimable LP
    creatorLpPercentage: 25, // Creator claimable LP
    partnerLockedLpPercentage: 25, // Partner locked LP
    creatorLockedLpPercentage: 25, // Creator locked LP
    creatorTradingFeePercentage: 50, // 50% fee sharing
    
    // Fee collection
    leftover: 0, // No leftover tokens
    tokenUpdateAuthority: 1, // Immutable token
    migrationFee: {
      feePercentage: 0, // No migration fee
      creatorFeePercentage: 0, // No creator migration fee
    },
    leftoverReceiver: 'Cfjz7DS41AAFPU4BVbLVG2MJAWGsEp99xvmiUag46Vuo',
    feeClaimer: 'Cfjz7DS41AAFPU4BVbLVG2MJAWGsEp99xvmiUag46Vuo'
  };
}

/**
 * Generate a DBC configuration using local dbc_config.jsonc as template
 */
export function generateDbcConfig(
  tokenName: string,
  tokenSymbol: string,
  metadataUrl: string,
  quoteMint: string,
  network: 'mainnet' | 'devnet' = 'mainnet',
  overrides: Partial<BuildCurveWithMarketCap> = {}
): DbcConfig {
  // Start with local studio configuration
  const studioConfig = getStudioDefaultConfig();
  
  // Get network-specific settings
  const networkConfig = getNetworkConfig(network);
  
  // Determine token quote decimal based on quote mint
  const tokenQuoteDecimal = quoteMint.includes('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') || 
                           quoteMint.includes('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr') ? 6 : 9;

  // Create the final configuration
  const config: DbcConfig = {
    rpcUrl: networkConfig.rpcUrl,
    dryRun: false,
    keypairFilePath: './keypair.json', // Not used in fun-launch context
    computeUnitPriceMicroLamports: 100000,
    quoteMint,
    dbcConfig: {
      ...studioConfig,
      tokenQuoteDecimal,
      ...overrides, // Apply user overrides
    },
    dbcPool: {
      name: tokenName,
      symbol: tokenSymbol,
      uri: metadataUrl,
    }
  };

  return config;
}

/**
 * Create a user-friendly configuration template
 */
export function createConfigTemplate(
  tokenName: string,
  tokenSymbol: string,
  metadataUrl: string,
  quoteMint: string,
  network: 'mainnet' | 'devnet' = 'mainnet'
) {
  const config = generateDbcConfig(tokenName, tokenSymbol, metadataUrl, quoteMint, network);
  
  return {
    // Basic pool info
    pool: {
      name: config.dbcPool?.name || tokenName,
      symbol: config.dbcPool?.symbol || tokenSymbol,
      metadataUrl: config.dbcPool?.uri || metadataUrl,
      quoteMint: config.quoteMint,
      network,
    },
    
    // Launch parameters (from local dbc_config.jsonc)
    launch: {
      initialMarketCap: config.dbcConfig?.initialMarketCap || 5000,
      migrationMarketCap: config.dbcConfig?.migrationMarketCap || 75000,
      totalTokenSupply: config.dbcConfig?.totalTokenSupply || 1000000000,
      migrationOption: config.dbcConfig?.migrationOption === 1 ? 'DAMM V2' : 'DAMM V1',
      tokenBaseDecimal: config.dbcConfig?.tokenBaseDecimal || 9,
      tokenQuoteDecimal: config.dbcConfig?.tokenQuoteDecimal || 6,
    },
    
    // Fee structure (from local dbc_config.jsonc)
    fees: {
      startingFeeBps: config.dbcConfig?.baseFeeParams.feeSchedulerParam.startingFeeBps || 200,
      endingFeeBps: config.dbcConfig?.baseFeeParams.feeSchedulerParam.endingFeeBps || 200,
      migrationFeeOption: config.dbcConfig?.migrationFeeOption || 3,
      creatorTradingFeePercentage: config.dbcConfig?.creatorTradingFeePercentage || 50,
      dynamicFeeEnabled: config.dbcConfig?.dynamicFeeEnabled || true,
    },
    
    // LP distribution (from local dbc_config.jsonc)
    lpDistribution: {
      partnerLpPercentage: config.dbcConfig?.partnerLpPercentage || 25,
      creatorLpPercentage: config.dbcConfig?.creatorLpPercentage || 25,
      partnerLockedLpPercentage: config.dbcConfig?.partnerLockedLpPercentage || 25,
      creatorLockedLpPercentage: config.dbcConfig?.creatorLockedLpPercentage || 25,
    },
    
    // Vesting parameters (from local dbc_config.jsonc)
    vesting: {
      totalLockedVestingAmount: config.dbcConfig?.lockedVestingParam.totalLockedVestingAmount || 100000000,
      numberOfVestingPeriod: config.dbcConfig?.lockedVestingParam.numberOfVestingPeriod || 24,
      cliffUnlockAmount: config.dbcConfig?.lockedVestingParam.cliffUnlockAmount || 100000000,
      totalVestingDuration: config.dbcConfig?.lockedVestingParam.totalVestingDuration || 2592000,
      cliffDurationFromMigrationTime: config.dbcConfig?.lockedVestingParam.cliffDurationFromMigrationTime || 0,
    },
    
    // Advanced settings (from local dbc_config.jsonc)
    advanced: {
      buildCurveMode: config.dbcConfig?.buildCurveMode || 1,
      activationType: config.dbcConfig?.activationType === 1 ? 'Timestamp' : 'Slot',
      collectFeeMode: config.dbcConfig?.collectFeeMode === 0 ? 'Quote Token' : 'Output Token',
      tokenType: config.dbcConfig?.tokenType === 0 ? 'SPL' : 'Token 2022',
      tokenUpdateAuthority: config.dbcConfig?.tokenUpdateAuthority === 1 ? 'Immutable' : 'Creator Update Authority',
      leftover: config.dbcConfig?.leftover || 0,
      leftoverReceiver: config.dbcConfig?.leftoverReceiver || 'Cfjz7DS41AAFPU4BVbLVG2MJAWGsEp99xvmiUag46Vuo',
      feeClaimer: config.dbcConfig?.feeClaimer || 'Cfjz7DS41AAFPU4BVbLVG2MJAWGsEp99xvmiUag46Vuo',
    }
  };
}

/**
 * Convert user-friendly input to studio-compatible configuration
 */
export function convertUserInputToStudioConfig(userInput: {
  tokenName: string;
  tokenSymbol: string;
  metadataUrl: string;
  quoteMint: string;
  network: 'mainnet' | 'devnet';
  // Optional overrides
  initialMarketCap?: number;
  migrationMarketCap?: number;
  creatorTradingFeePercentage?: number;
  dynamicFeeEnabled?: boolean;
  migrationFeeOption?: number;
  creatorLpPercentage?: number;
  partnerLpPercentage?: number;
  creatorLockedLpPercentage?: number;
  partnerLockedLpPercentage?: number;
}): DbcConfig {
  const overrides: Partial<BuildCurveWithMarketCap> = {};
  
  // Apply user overrides if provided
  if (userInput.initialMarketCap !== undefined) {
    overrides.initialMarketCap = userInput.initialMarketCap;
  }
  if (userInput.migrationMarketCap !== undefined) {
    overrides.migrationMarketCap = userInput.migrationMarketCap;
  }
  if (userInput.creatorTradingFeePercentage !== undefined) {
    overrides.creatorTradingFeePercentage = userInput.creatorTradingFeePercentage;
  }
  if (userInput.dynamicFeeEnabled !== undefined) {
    overrides.dynamicFeeEnabled = userInput.dynamicFeeEnabled;
  }
  if (userInput.migrationFeeOption !== undefined) {
    overrides.migrationFeeOption = userInput.migrationFeeOption;
  }
  if (userInput.creatorLpPercentage !== undefined) {
    overrides.creatorLpPercentage = userInput.creatorLpPercentage;
  }
  if (userInput.partnerLpPercentage !== undefined) {
    overrides.partnerLpPercentage = userInput.partnerLpPercentage;
  }
  if (userInput.creatorLockedLpPercentage !== undefined) {
    overrides.creatorLockedLpPercentage = userInput.creatorLockedLpPercentage;
  }
  if (userInput.partnerLockedLpPercentage !== undefined) {
    overrides.partnerLockedLpPercentage = userInput.partnerLockedLpPercentage;
  }
  
  return generateDbcConfig(
    userInput.tokenName,
    userInput.tokenSymbol,
    userInput.metadataUrl,
    userInput.quoteMint,
    userInput.network,
    overrides
  );
}

/**
 * Get quote mint address for a given token and network
 */
export function getQuoteMintAddress(token: 'USDC' | 'SOL' | 'JUP', network: 'mainnet' | 'devnet'): string {
  return QUOTE_MINT_ADDRESSES[network][token];
}

/**
 * Validate quote mint address for a given network
 */
export function validateQuoteMintAddress(quoteMint: string, network: 'mainnet' | 'devnet'): boolean {
  const validAddresses = Object.values(QUOTE_MINT_ADDRESSES[network]);
  return validAddresses.includes(quoteMint);
}

/**
 * Get token quote decimal for a given quote mint
 */
export function getTokenQuoteDecimal(quoteMint: string): number {
  // USDC has 6 decimals (both mainnet and devnet)
  if (quoteMint.includes('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v') || 
      quoteMint.includes('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr')) {
    return 6;
  }
  // SOL and other tokens typically have 9 decimals
  return 9;
}

/**
 * Get the current local configuration template
 */
export function getCurrentLocalConfig(): any {
  try {
    const config = loadLocalDbcConfig();
    return {
      basic: {
        rpcUrl: config.rpcUrl,
        dryRun: config.dryRun,
        computeUnitPriceMicroLamports: config.computeUnitPriceMicroLamports,
        quoteMint: config.quoteMint,
      },
      dbc: config.dbcConfig,
      pool: config.dbcPool,
    };
  } catch (error) {
    console.error('❌ Error loading current local config:', error);
    return null;
  }
}
