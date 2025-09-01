/**
 * Partner DBC Configuration
 * 
 * This module defines the pre-configured DBC settings for the launchpad.
 * Based on official Meteora documentation and best practices.
 */

import { PublicKey } from '@solana/web3.js';

// Partner's wallet addresses (replace with actual addresses)
const PARTNER_WALLET = process.env.PARTNER_WALLET || 'YOUR_PARTNER_WALLET_ADDRESS';
const FEE_CLAIMER = process.env.FEE_CLAIMER || PARTNER_WALLET;
const LEFTOVER_RECEIVER = process.env.LEFTOVER_RECEIVER || PARTNER_WALLET;

// Quote mint addresses
const QUOTE_MINTS = {
  USDC_MAINNET: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDC_DEVNET: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
  SOL_MAINNET: 'So11111111111111111111111111111111111111112',
  SOL_DEVNET: 'So11111111111111111111111111111111111111112',
  JUP_MAINNET: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
};

export interface PartnerDbcConfig {
  // Basic Configuration
  rpcUrl: string;
  dryRun: boolean;
  computeUnitPriceMicroLamports: number;
  quoteMint: string;
  
  // DBC Configuration
  dbcConfig: {
    buildCurveMode: number;
    initialMarketCap: number;
    migrationMarketCap: number;
    totalTokenSupply: number;
    migrationOption: number;
    tokenBaseDecimal: number;
    tokenQuoteDecimal: number;
    
    // Vesting Configuration
    lockedVestingParam: {
      totalLockedVestingAmount: number;
      numberOfVestingPeriod: number;
      cliffUnlockAmount: number;
      totalVestingDuration: number;
      cliffDurationFromMigrationTime: number;
    };
    
    // Fee Configuration
    baseFeeParams: {
      baseFeeMode: number;
      feeSchedulerParam: {
        startingFeeBps: number;
        endingFeeBps: number;
        numberOfPeriod: number;
        totalDuration: number;
      };
    };
    
    // Advanced Settings
    dynamicFeeEnabled: boolean;
    activationType: number;
    collectFeeMode: number;
    migrationFeeOption: number;
    tokenType: number;
    
    // LP Distribution
    partnerLpPercentage: number;
    creatorLpPercentage: number;
    partnerLockedLpPercentage: number;
    creatorLockedLpPercentage: number;
    creatorTradingFeePercentage: number;
    
    // Fee Collection
    leftover: number;
    tokenUpdateAuthority: number;
    migrationFee: {
      feePercentage: number;
      creatorFeePercentage: number;
    };
    leftoverReceiver: string;
    feeClaimer: string;
  };
}

/**
 * Generate partner DBC configuration for different networks and quote tokens
 * Based on official Meteora documentation
 */
export function generatePartnerDbcConfig(
  network: 'mainnet' | 'devnet' = 'mainnet',
  quoteToken: 'USDC' | 'SOL' | 'JUP' = 'USDC'
): PartnerDbcConfig {
  const rpcUrl = network === 'mainnet' 
    ? 'https://api.mainnet-beta.solana.com'
    : 'https://api.devnet.solana.com';
    
  const quoteMint = quoteToken === 'USDC' 
    ? (network === 'mainnet' ? QUOTE_MINTS.USDC_MAINNET : QUOTE_MINTS.USDC_DEVNET)
    : quoteToken === 'SOL'
    ? (network === 'mainnet' ? QUOTE_MINTS.SOL_MAINNET : QUOTE_MINTS.SOL_DEVNET)
    : QUOTE_MINTS.JUP_MAINNET;
    
  const tokenQuoteDecimal = quoteToken === 'USDC' ? 6 : 9;

  return {
    rpcUrl,
    dryRun: false,
    computeUnitPriceMicroLamports: 100000,
    quoteMint,
    
    dbcConfig: {
      // Build Curve Mode: 1 = buildCurveWithMarketCap (official Meteora mode)
      buildCurveMode: 1,
      
      // Market Cap Configuration (in USD) - Virtual bonding curve parameters
      initialMarketCap: 5000, // $5K virtual curve starting point (not actual market cap)
      migrationMarketCap: 75000, // $75K migration threshold
      
      // Token Supply: 1B tokens (standard for launchpads)
      totalTokenSupply: 1000000000,
      
      // Migration: 1 = Migrate to DAMM v2 (official Meteora migration)
      migrationOption: 1,
      
      // Token Decimals
      tokenBaseDecimal: 9, // Standard for most tokens
      tokenQuoteDecimal,
      
      // Vesting: 10% of tokens locked for 6 months (standard vesting)
      lockedVestingParam: {
        totalLockedVestingAmount: 100000000, // 100M tokens (10%)
        numberOfVestingPeriod: 24, // 24 periods (monthly unlocks)
        cliffUnlockAmount: 0, // No cliff unlock
        totalVestingDuration: 15768000, // 6 months in seconds (182.5 days)
        cliffDurationFromMigrationTime: 0, // No cliff delay
      },
      
      // Fee Schedule: 2% flat fee (standard launchpad fee)
      baseFeeParams: {
        baseFeeMode: 0, // Flat fee mode
        feeSchedulerParam: {
          startingFeeBps: 200, // 2% starting fee
          endingFeeBps: 200, // 2% ending fee
          numberOfPeriod: 0, // No periods (flat)
          totalDuration: 0, // No duration (flat)
        },
      },
      
      // Advanced Settings (based on official Meteora docs)
      dynamicFeeEnabled: true, // Anti-sniping protection
      activationType: 1, // Timestamp-based activation
      collectFeeMode: 0, // Quote token fees (USDC)
      migrationFeeOption: 3, // 2% LP fee on migration
      tokenType: 0, // SPL token
      
      // LP Distribution: 50/50 split between partner and creator
      partnerLpPercentage: 25, // 25% to partner
      creatorLpPercentage: 25, // 25% to creator
      partnerLockedLpPercentage: 25, // 25% locked for partner
      creatorLockedLpPercentage: 25, // 25% locked for creator
      creatorTradingFeePercentage: 50, // 50% of trading fees to creator
      
      // Fee Collection
      leftover: 0, // No leftover
      tokenUpdateAuthority: 1, // Immutable (cannot be changed)
      migrationFee: {
        feePercentage: 0, // No migration fee
        creatorFeePercentage: 0, // No creator migration fee
      },
      leftoverReceiver: LEFTOVER_RECEIVER,
      feeClaimer: FEE_CLAIMER,
    },
  };
}

/**
 * Get quote mint address for a given token and network
 */
export function getQuoteMintAddress(
  token: 'USDC' | 'SOL' | 'JUP',
  network: 'mainnet' | 'devnet'
): string {
  switch (token) {
    case 'USDC':
      return network === 'mainnet' ? QUOTE_MINTS.USDC_MAINNET : QUOTE_MINTS.USDC_DEVNET;
    case 'SOL':
      return network === 'mainnet' ? QUOTE_MINTS.SOL_MAINNET : QUOTE_MINTS.SOL_DEVNET;
    case 'JUP':
      return QUOTE_MINTS.JUP_MAINNET;
    default:
      return QUOTE_MINTS.USDC_MAINNET;
  }
}

/**
 * Validate partner DBC configuration
 */
export function validatePartnerDbcConfig(config: PartnerDbcConfig): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate LP percentages sum to 100
  const totalLpPercentage = config.dbcConfig.partnerLpPercentage +
                           config.dbcConfig.creatorLpPercentage +
                           config.dbcConfig.partnerLockedLpPercentage +
                           config.dbcConfig.creatorLockedLpPercentage;

  if (totalLpPercentage !== 100) {
    errors.push(`Total LP percentages must equal 100%, got ${totalLpPercentage}%`);
  }

  // Validate market caps
  if (config.dbcConfig.initialMarketCap >= config.dbcConfig.migrationMarketCap) {
    errors.push('Migration market cap must be greater than initial market cap');
  }

  // Validate vesting
  if (config.dbcConfig.lockedVestingParam.totalLockedVestingAmount > config.dbcConfig.totalTokenSupply) {
    errors.push('Total locked vesting amount cannot exceed total token supply');
  }

  // Validate fee percentages
  if (config.dbcConfig.creatorTradingFeePercentage < 0 || config.dbcConfig.creatorTradingFeePercentage > 100) {
    errors.push('Creator trading fee percentage must be between 0 and 100');
  }

  // Validate build curve mode
  if (config.dbcConfig.buildCurveMode !== 1) {
    errors.push('Build curve mode must be 1 (buildCurveWithMarketCap) for launchpads');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get configuration summary for display
 */
export function getConfigSummary(config: PartnerDbcConfig): {
  initialMarketCap: string;
  migrationMarketCap: string;
  totalSupply: string;
  vestingPercentage: string;
  tradingFee: string;
  lpDistribution: string;
} {
  return {
    initialMarketCap: `$${config.dbcConfig.initialMarketCap.toLocaleString()}`,
    migrationMarketCap: `$${config.dbcConfig.migrationMarketCap.toLocaleString()}`,
    totalSupply: `${(config.dbcConfig.totalTokenSupply / 1e9).toLocaleString()}B`,
    vestingPercentage: `${((config.dbcConfig.lockedVestingParam.totalLockedVestingAmount / config.dbcConfig.totalTokenSupply) * 100).toFixed(1)}%`,
    tradingFee: `${(config.dbcConfig.baseFeeParams.feeSchedulerParam.startingFeeBps / 100).toFixed(1)}%`,
    lpDistribution: `${config.dbcConfig.creatorLpPercentage + config.dbcConfig.creatorLockedLpPercentage}% Creator / ${config.dbcConfig.partnerLpPercentage + config.dbcConfig.partnerLockedLpPercentage}% Partner`,
  };
}

/**
 * Calculate bonding curve progress using official Meteora formula
 * Based on: https://docs.meteora.ag/overview/products/dbc/bonding-curve-formulas
 */
export function calculateBondingCurveProgress(
  currentBaseReserve: number,
  totalTokenSupply: number = 1000000000,
  reservedTokens: number = 206900000
): number {
  // Official Meteora formula: Progress = 100 - ((leftTokens * 100) / availableForSale)
  const availableForSale = totalTokenSupply - reservedTokens;
  const leftTokens = Math.max(0, currentBaseReserve - reservedTokens);
  const progress = 100 - ((leftTokens * 100) / availableForSale);
  
  return Math.max(0, Math.min(100, progress));
}

/**
 * Calculate token price using official Meteora bonding curve formula
 * Based on: https://docs.meteora.ag/overview/products/dbc/bonding-curve-formulas
 */
export function calculateTokenPrice(
  quoteReserve: number,
  baseReserve: number,
  quoteDecimals: number = 6
): number {
  if (baseReserve === 0) return 0;
  
  // Price = quoteReserve / baseReserve
  const price = quoteReserve / baseReserve;
  
  // Convert to proper decimal format
  return price / Math.pow(10, quoteDecimals);
}

/**
 * Calculate market cap using official Meteora formula
 */
export function calculateMarketCap(
  price: number,
  totalSupply: number,
  baseDecimals: number = 9
): number {
  const totalSupplyInTokens = totalSupply / Math.pow(10, baseDecimals);
  return price * totalSupplyInTokens;
}
