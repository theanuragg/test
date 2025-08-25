// src/types/dbc.ts
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface MeteoraConfigBase {
  rpcUrl: string;
  dryRun: boolean;
  keypairFilePath: string;
  computeUnitPriceMicroLamports: number;
  quoteMint?: string;
  baseMint?: string;
}

export type DbcConfig = MeteoraConfigBase & {
  dbcConfig?: BuildCurve | BuildCurveWithMarketCap | BuildCurveWithTwoSegments | BuildCurveWithLiquidityWeights;
  dbcConfigAddress?: string | null;
  dbcPool?: DbcPool | null;
  dbcSwap?: DbcSwap | null;
};

export interface BuildCurve {
  buildCurveMode: 0;
  percentageSupplyOnMigration: number;
  migrationQuoteThreshold: number;
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
  migrationFee: MigrationFee;
  leftoverReceiver: string;
  feeClaimer: string;
}

export interface BuildCurveWithMarketCap {
  buildCurveMode: 1;
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
  migrationFee: MigrationFee;
  leftoverReceiver: string;
  feeClaimer: string;
}

export interface BuildCurveWithTwoSegments {
  buildCurveMode: 2;
  initialMarketCap: number;
  migrationMarketCap: number;
  percentageSupplyOnMigration: number;
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
  migrationFee: MigrationFee;
  leftoverReceiver: string;
  feeClaimer: string;
}

export interface BuildCurveWithLiquidityWeights {
  buildCurveMode: 3;
  initialMarketCap: number;
  migrationMarketCap: number;
  liquidityWeights: number[];
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
  migrationFee: MigrationFee;
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
  baseFeeMode: 0 | 1 | 2;
  feeSchedulerParam?: FeeSchedulerParams;
  rateLimiterParam?: RateLimiterParams;
}

export interface FeeSchedulerParams {
  startingFeeBps: number;
  endingFeeBps: number;
  numberOfPeriod: number;
  totalDuration: number;
}

export interface RateLimiterParams {
  baseFeeBps: number;
  feeIncrementBps: number;
  referenceAmount: number;
  maxLimiterDuration: number;
}

export interface MigrationFee {
  feePercentage: number;
  creatorFeePercentage: number;
}

export interface DbcPool {
  baseMintKeypairFilepath?: string;
  name: string;
  symbol: string;
  uri: string;
}

export interface DbcSwap {
  amountIn: number;
  slippageBps: number;
  swapBaseForQuote: boolean;
  referralTokenAccount?: string | null;
}

export interface PoolState {
  publicKey: PublicKey;
  account: {
    config: PublicKey;
    creator: PublicKey;
    quoteReserve: BN;
    isMigrated: number;
  };
}

export interface PoolConfig {
  quoteMint: PublicKey;
  migrationQuoteThreshold: BN;
  migrationFeeOption: number;
  activationType: number;
  lockedVestingConfig: {
    amountPerPeriod: BN;
  };
  feeClaimer: PublicKey;
}

export interface FeeMetrics {
  current: {
    creatorBaseFee: BN;
    creatorQuoteFee: BN;
    partnerBaseFee: BN;
    partnerQuoteFee: BN;
  };
}
