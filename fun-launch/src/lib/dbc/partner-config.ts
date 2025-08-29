/**
 * Partner DBC Configuration
 * 
 * This module defines the pre-configured DBC settings for the launchpad.
 * This config key will be used for all token launches on the platform.
 */

import { BN } from 'bn.js';
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
      buildCurveMode: 1, // buildCurveWithMarketCap
      initialMarketCap: 5000, // $5K starting market cap
      migrationMarketCap: 75000, // $75K migration threshold
      totalTokenSupply: 1000000000, // 1B tokens
      migrationOption: 1, // Migrate to DAMM v2
      tokenBaseDecimal: 9,
      tokenQuoteDecimal,
      
      // Vesting: 10% of tokens locked for 6 months
      lockedVestingParam: {
        totalLockedVestingAmount: 100000000, // 100M tokens (10%)
        numberOfVestingPeriod: 24, // 24 periods
        cliffUnlockAmount: 100000000, // All tokens in cliff
        totalVestingDuration: 2592000, // 30 days in seconds
        cliffDurationFromMigrationTime: 0, // No cliff delay
      },
      
      // Fee Schedule: 2% flat fee with anti-sniping
      baseFeeParams: {
        baseFeeMode: 0, // Flat fee
        feeSchedulerParam: {
          startingFeeBps: 200, // 2% starting fee
          endingFeeBps: 200, // 2% ending fee
          numberOfPeriod: 0, // No periods (flat)
          totalDuration: 0, // No duration (flat)
        },
      },
      
      // Advanced Settings
      dynamicFeeEnabled: true, // Anti-sniping protection
      activationType: 1, // Timestamp-based
      collectFeeMode: 0, // Quote token fees
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
      tokenUpdateAuthority: 1, // Immutable
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
