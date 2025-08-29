import { PublicKey } from '@solana/web3.js';

/**
 * Local Type Definitions for Fun-Launch Studio Integration
 * 
 * These types mirror the studio's types but are defined locally
 * to avoid external dependencies.
 */

export interface DbcConfig {
  rpcUrl: string;
  dryRun: boolean;
  keypairFilePath: string;
  computeUnitPriceMicroLamports: number;
  quoteMint: string;
  dbcConfig?: BuildCurveWithMarketCap | null;
  dbcConfigAddress?: PublicKey | null;
  dbcPool?: DbcPool | null;
  dbcSwap?: DbcSwap | null;
}

export interface BuildCurveWithMarketCap {
  buildCurveMode: 1; // buildCurveWithMarketCap
  initialMarketCap: number;
  migrationMarketCap: number;
  totalTokenSupply: number;
  migrationOption: number;
  tokenBaseDecimal: number;
  tokenQuoteDecimal: number;
  lockedVestingParam: LockedVesting;
  baseFeeParams: BaseFee;
  dynamicFeeEnabled: boolean;
  activationType: number;
  collectFeeMode: number;
  migrationFeeOption: number;
  tokenType: number;
  partnerLpPercentage: number;
  creatorLpPercentage: number;
  partnerLockedLpPercentage: number;
  creatorLockedLpPercentage: number;
  creatorTradingFeePercentage: number;
  leftover: number;
  tokenUpdateAuthority: number;
  migrationFee: {
    feePercentage: number;
    creatorFeePercentage: number;
  };
  leftoverReceiver: string;
  feeClaimer: string;
}

export interface LockedVesting {
  totalLockedVestingAmount: number;
  numberOfVestingPeriod: number;
  cliffUnlockAmount: number;
  totalVestingDuration: number;
  cliffDurationFromMigrationTime: number;
}

export interface BaseFee {
  baseFeeMode: 0 | 1 | 2; // 0: Linear Fee Scheduler, 1: Exponential Fee Scheduler, 2: Rate Limiter
  feeSchedulerParam?: FeeSchedulerParams; // For modes 0 and 1
  rateLimiterParam?: RateLimiterParams; // For mode 2
}

export interface FeeSchedulerParams {
  startingFeeBps: number; // Starting fee in basis points (max 9900 = 99%)
  endingFeeBps: number; // Ending fee in basis points (min 1 = 0.01%)
  numberOfPeriod: number; // Number of periods
  totalDuration: number; // Total duration
}

export interface RateLimiterParams {
  baseFeeBps: number; // Base fee in basis points (max 9900 = 99%)
  feeIncrementBps: number; // Fee increment in basis points (max 9900 - baseFeeBps)
  referenceAmount: number; // Reference amount (not in lamports)
  maxLimiterDuration: number; // Maximum limiter duration
}

export interface DbcPool {
  name: string;
  symbol: string;
  uri: string;
}

export interface DbcSwap {
  amountIn: number;
  slippageBps: number;
  swapBaseForQuote: boolean;
  referralTokenAccount: string | null;
}
