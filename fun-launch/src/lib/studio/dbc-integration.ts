import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import {
  buildCurve,
  buildCurveWithLiquidityWeights,
  buildCurveWithMarketCap,
  buildCurveWithTwoSegments,
  ConfigParameters,
  DynamicBondingCurveClient,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';

// Import local helper functions
import { modifyComputeUnitPriceIx, runSimulateTransaction, DEFAULT_SEND_TX_MAX_RETRIES } from './helpers';

// Import local types
import type { 
  DbcConfig, 
  BuildCurveWithMarketCap, 
  LockedVesting, 
  BaseFee, 
  FeeSchedulerParams,
  DbcPool 
} from './types';

/**
 * Official Meteora Migration Fee Addresses
 * Source: https://docs.meteora.ag/developer-guide/guides/dbc/overview
 */

// DAMM v1 Migration Fee Config Keys
export const DAMM_V1_MIGRATION_FEE_ADDRESS = [
  '8f848CEy8eY6PhJ3VcemtBDzPPSD4Vq7aJczLZ3o8MmX', // Option 0: LP Fee 0.25%
  'HBxB8Lf14Yj8pqeJ8C4qDb5ryHL7xwpuykz31BLNYr7S', // Option 1: LP Fee 0.3%
  '7v5vBdUQHTNeqk1HnduiXcgbvCyVEZ612HLmYkQoAkik', // Option 2: LP Fee 1%
  'EkvP7d5yKxovj884d2DwmBQbrHUWRLGK6bympzrkXGja', // Option 3: LP Fee 2%
  '9EZYAJrcqNWNQzP2trzZesP7XKMHA1jEomHzbRsdX8R2', // Option 4: LP Fee 4%
  '8cdKo87jZU2R12KY1BUjjRPwyjgdNjLGqSGQyrDshhud', // Option 5: LP Fee 6%
] as const;

// DAMM v2 Migration Fee Config Keys
export const DAMM_V2_MIGRATION_FEE_ADDRESS = [
  '7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd', // Option 0: LP Fee 0.25%
  '2nHK1kju6XjphBLbNxpM5XRGFj7p9U8vvNzyZiha1z6k', // Option 1: LP Fee 0.3%
  'Hv8Lmzmnju6m7kcokVKvwqz7QPmdX9XfKjJsXz8RXcjp', // Option 2: LP Fee 1%
  '2c4cYd4reUYVRAB9kUUkrq55VPyy2FNQ3FDL4o12JXmq', // Option 3: LP Fee 2%
  'AkmQWebAwFvWk55wBoCr5D62C6VVDTzi84NJuD9H7cFD', // Option 4: LP Fee 4%
  'DbCRBj8McvPYHJG1ukj8RE15h2dCNUdTAESG49XpQ44u', // Option 5: LP Fee 6%
  'A8gMrEPJkacWkcb3DGwtJwTe16HktSEfvwtuDh2MCtck', // Option 6: LP Fee 8%
] as const;

/**
 * Migration Keeper Addresses
 * Source: https://docs.meteora.ag/developer-guide/guides/dbc/overview
 */
export const MIGRATION_KEEPERS = {
  KEEPER_1: 'CQdrEsYAxRqkwmpycuTwnMKggr3cr9fqY8Qma4J9TudY', // 10 SOL, 750 USDC, 1500 JUP
  KEEPER_2: 'DeQ8dPv6ReZNQ45NfiWwS5CchWpB2BVq1QMyNV8L2uSW', // >= 750 USD
} as const;

/**
 * Studio DBC Integration for Fun-Launch
 * 
 * This module provides direct integration with Meteora Studio's DBC logic,
 * allowing fun-launch to create DBC configurations and pools using the
 * same battle-tested code as the studio CLI.
 */

/**
 * Create a DBC config using studio's logic
 * This is a direct port of studio's createDbcConfig function
 */
export async function createDbcConfig(
  config: DbcConfig,
  connection: Connection,
  wallet: Wallet,
  quoteMint: PublicKey
): Promise<PublicKey> {
  console.log('🚀 Creating DBC config using studio integration...');
  
  if (!config.dbcConfig) {
    throw new Error('Missing dbc configuration');
  }

  // Check if using an existing config key address
  if (config.dbcConfigAddress) {
    console.log(`📊 Using existing config key: ${config.dbcConfigAddress.toString()}`);
    return config.dbcConfigAddress;
  }

  let curveConfig: ConfigParameters | null = null;

  // Build curve configuration based on mode
  const buildCurveMode = (config.dbcConfig as any).buildCurveMode;
  if (buildCurveMode === 0) {
    curveConfig = buildCurve(config.dbcConfig as any);
  } else if (buildCurveMode === 1) {
    curveConfig = buildCurveWithMarketCap(config.dbcConfig as any);
  } else if (buildCurveMode === 2) {
    curveConfig = buildCurveWithTwoSegments(config.dbcConfig as any);
  } else if (buildCurveMode === 3) {
    curveConfig = buildCurveWithLiquidityWeights(config.dbcConfig as any);
  } else {
    throw new Error(
      `Unsupported DBC build curve mode: ${buildCurveMode}`
    );
  }

  if (!curveConfig) {
    throw new Error('Failed to build curve config');
  }

  const dbcInstance = new DynamicBondingCurveClient(connection, 'confirmed');

  // Generate new config keypair
  const configKeypair = Keypair.generate();
  console.log(`📊 Generated config keypair: ${configKeypair.publicKey.toString()}`);

  // Create config transaction
  const createConfigTx = await dbcInstance.partner.createConfig({
    config: configKeypair.publicKey,
    quoteMint,
    feeClaimer: new PublicKey(config.dbcConfig.feeClaimer),
    leftoverReceiver: new PublicKey(config.dbcConfig.leftoverReceiver),
    payer: wallet.publicKey,
    ...curveConfig,
  });

  // Add compute unit price modification
  modifyComputeUnitPriceIx(createConfigTx as any, config.computeUnitPriceMicroLamports);

  if (config.dryRun) {
    console.log(`🔄 Simulating create config transaction...`);
    await runSimulateTransaction(connection, [wallet.payer, configKeypair], wallet.publicKey, [
      createConfigTx,
    ]);
    console.log(`✅ Config simulation successful`);
  } else {
    console.log(`📤 Sending create config transaction...`);
    const createConfigTxHash = await sendAndConfirmTransaction(
      connection,
      createConfigTx,
      [wallet.payer, configKeypair],
      {
        commitment: connection.commitment,
        maxRetries: DEFAULT_SEND_TX_MAX_RETRIES,
      }
    ).catch((err) => {
      console.error('❌ Failed to create config:', err);
      throw err;
    });

    console.log(`✅ Config created successfully with tx hash: ${createConfigTxHash}`);
    console.log(`📊 Config public key: ${configKeypair.publicKey.toString()}`);

    console.log(`⏳ Waiting for config transaction to be finalized...`);
    await connection.confirmTransaction(createConfigTxHash, 'finalized');
    console.log(`✅ Config transaction finalized`);
  }

  return configKeypair.publicKey;
}

/**
 * Create a DBC pool using an existing pre-configured DBC config key
 * This function does NOT create a new config, it uses the existing one
 */
export async function createDbcPoolWithExistingConfig(
  config: DbcConfig,
  connection: Connection,
  wallet: Wallet,
  quoteMint: PublicKey,
  baseMint: Keypair
): Promise<void> {
  console.log('🏊 Creating DBC pool using existing pre-configured config...');
  
  if (!config.dbcPool) {
    throw new Error('Missing dbc pool configuration');
  }

  if (!config.dbcConfigAddress) {
    throw new Error('Missing dbc config address - cannot use existing config');
  }

  console.log(`📊 Using existing config: ${config.dbcConfigAddress.toString()}`);

  const dbcInstance = new DynamicBondingCurveClient(connection, 'confirmed');

  if (config.dryRun) {
    console.log(`🔄 Simulating create pool transaction...`);
    try {
      const createPoolTx = await dbcInstance.pool.createPool({
        baseMint: baseMint.publicKey,
        config: config.dbcConfigAddress,
        name: config.dbcPool.name,
        symbol: config.dbcPool.symbol,
        uri: config.dbcPool.uri,
        payer: wallet.publicKey,
        poolCreator: wallet.publicKey,
      });

      modifyComputeUnitPriceIx(createPoolTx as any, config.computeUnitPriceMicroLamports);

      await runSimulateTransaction(connection, [wallet.payer, baseMint], wallet.publicKey, [
        createPoolTx,
      ]);
      console.log(`✅ Pool simulation successful`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⚠️ Pool simulation failed (expected in dry-run mode): ${errorMessage}`);
      console.log(`ℹ️ This is normal since the config doesn't exist on-chain during dry-run`);
    }
  } else {
    console.log(`📤 Creating pool transaction...`);
    const createPoolTx = await dbcInstance.pool.createPool({
      baseMint: baseMint.publicKey,
      config: config.dbcConfigAddress,
      name: config.dbcPool.name,
      symbol: config.dbcPool.symbol,
      uri: config.dbcPool.uri,
      payer: wallet.publicKey,
      poolCreator: wallet.publicKey,
    });

    modifyComputeUnitPriceIx(createPoolTx as any, config.computeUnitPriceMicroLamports);

    console.log(`📤 Sending create pool transaction...`);
    const createPoolTxHash = await sendAndConfirmTransaction(
      connection,
      createPoolTx,
      [wallet.payer, baseMint],
      {
        commitment: connection.commitment,
        maxRetries: DEFAULT_SEND_TX_MAX_RETRIES,
      }
    ).catch((err) => {
      console.error('❌ Failed to create pool:', err);
      throw err;
    });

    console.log(`✅ Pool created successfully with tx hash: ${createPoolTxHash}`);
  }
}

/**
 * Create a DBC pool using studio's logic
 * This is a direct port of studio's createDbcPool function
 */
export async function createDbcPool(
  config: DbcConfig,
  connection: Connection,
  wallet: Wallet,
  quoteMint: PublicKey,
  baseMint: Keypair
): Promise<void> {
  console.log('🏊 Creating DBC pool using studio integration...');
  
  if (!config.dbcConfig) {
    throw new Error('Missing dbc configuration');
  }
  if (!config.dbcPool) {
    throw new Error('Missing dbc pool configuration');
  }

  // Create DBC config first
  const configPublicKey = await createDbcConfig(config, connection, wallet, quoteMint);

  const dbcInstance = new DynamicBondingCurveClient(connection, 'confirmed');

  if (config.dryRun) {
    console.log(`🔄 Simulating create pool transaction...`);
    try {
      const createPoolTx = await dbcInstance.pool.createPool({
        baseMint: baseMint.publicKey,
        config: configPublicKey,
        name: config.dbcPool.name,
        symbol: config.dbcPool.symbol,
        uri: config.dbcPool.uri,
        payer: wallet.publicKey,
        poolCreator: wallet.publicKey,
      });

      modifyComputeUnitPriceIx(createPoolTx as any, config.computeUnitPriceMicroLamports);

      await runSimulateTransaction(connection, [wallet.payer, baseMint], wallet.publicKey, [
        createPoolTx,
      ]);
      console.log(`✅ Pool simulation successful`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`⚠️ Pool simulation failed (expected in dry-run mode): ${errorMessage}`);
      console.log(`ℹ️ This is normal since the config doesn't exist on-chain during dry-run`);
    }
  } else {
    console.log(`📤 Creating pool transaction...`);
    const createPoolTx = await dbcInstance.pool.createPool({
      baseMint: baseMint.publicKey,
      config: configPublicKey,
      name: config.dbcPool.name,
      symbol: config.dbcPool.symbol,
      uri: config.dbcPool.uri,
      payer: wallet.publicKey,
      poolCreator: wallet.publicKey,
    });

    modifyComputeUnitPriceIx(createPoolTx as any, config.computeUnitPriceMicroLamports);

    console.log(`📤 Sending create pool transaction...`);
    const createPoolTxHash = await sendAndConfirmTransaction(
      connection,
      createPoolTx,
      [wallet.payer, baseMint],
      {
        commitment: connection.commitment,
        maxRetries: DEFAULT_SEND_TX_MAX_RETRIES,
      }
    ).catch((err) => {
      console.error('❌ Failed to create pool:', err);
      throw err;
    });

    console.log(`✅ Pool created successfully with tx hash: ${createPoolTxHash}`);
  }
}

/**
 * Create both DBC config and pool in a single operation
 * This is the main entry point for fun-launch
 */
export async function createDbcConfigAndPool(
  config: DbcConfig,
  connection: Connection,
  wallet: Wallet,
  quoteMint: PublicKey,
  baseMint: Keypair
): Promise<{ configPublicKey: PublicKey; poolCreated: boolean }> {
  console.log('🚀 Starting DBC pool creation with pre-configured config...');
  
  try {
    // Use pre-configured config key from environment
    const configPublicKey = new PublicKey(process.env.POOL_CONFIG_KEY!);
    
    // Create pool using the pre-configured config
    await createDbcPool(config, connection, wallet, quoteMint, baseMint);
    
    return {
      configPublicKey,
      poolCreated: true
    };
  } catch (error) {
    console.error('❌ Error in createDbcConfigAndPool:', error);
    throw error;
  }
}

/**
 * Validate DBC configuration against studio's constraints
 */
export function validateDbcConfig(config: DbcConfig): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.dbcConfig) {
    errors.push('Missing dbc configuration');
    return { isValid: false, errors };
  }

  // Validate buildCurveMode
  if (config.dbcConfig.buildCurveMode < 0 || config.dbcConfig.buildCurveMode > 3) {
    errors.push('buildCurveMode must be between 0 and 3');
  }

  // Validate market caps for buildCurveMode 1
  if (config.dbcConfig.buildCurveMode === 1) {
    const marketCapConfig = config.dbcConfig as BuildCurveWithMarketCap;
    if (marketCapConfig.initialMarketCap <= 0) {
      errors.push('initialMarketCap must be greater than 0');
    }
    if (marketCapConfig.migrationMarketCap <= marketCapConfig.initialMarketCap) {
      errors.push('migrationMarketCap must be greater than initialMarketCap');
    }
  }

  // Validate token supply
  if (config.dbcConfig.totalTokenSupply <= 0) {
    errors.push('totalTokenSupply must be greater than 0');
  }

  // Validate fee percentages
  if (config.dbcConfig.creatorTradingFeePercentage < 0 || config.dbcConfig.creatorTradingFeePercentage > 100) {
    errors.push('creatorTradingFeePercentage must be between 0 and 100');
  }

  // Validate LP percentages
  const totalLpPercentage = config.dbcConfig.partnerLpPercentage + 
                           config.dbcConfig.creatorLpPercentage + 
                           config.dbcConfig.partnerLockedLpPercentage + 
                           config.dbcConfig.creatorLockedLpPercentage;
  
  if (totalLpPercentage !== 100) {
    errors.push('Total LP percentages must equal 100%');
  }

  // Validate vesting parameters
  if (config.dbcConfig.lockedVestingParam.totalLockedVestingAmount > config.dbcConfig.totalTokenSupply) {
    errors.push('Total locked vesting amount cannot exceed total token supply');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Estimate transaction costs for DBC operations
 */
export function estimateDbcCosts(network: 'mainnet' | 'devnet'): {
  poolCreation: number;
  total: number;
} {
  const baseCost = network === 'mainnet' ? 0.003 : 0.001;
  
  return {
    poolCreation: baseCost,
    total: baseCost
  };
}

/**
 * Get migration fee address for a given migration option and target DAMM version
 * Uses official migration fee addresses from Meteora documentation
 */
export function getMigrationFeeAddress(
  migrationFeeOption: number,
  targetDamm: 'v1' | 'v2'
): string {
  if (targetDamm === 'v1') {
    if (migrationFeeOption >= DAMM_V1_MIGRATION_FEE_ADDRESS.length) {
      throw new Error(`Invalid migration fee option for DAMM v1: ${migrationFeeOption}`);
    }
    return DAMM_V1_MIGRATION_FEE_ADDRESS[migrationFeeOption];
  } else {
    if (migrationFeeOption >= DAMM_V2_MIGRATION_FEE_ADDRESS.length) {
      throw new Error(`Invalid migration fee option for DAMM v2: ${migrationFeeOption}`);
    }
    return DAMM_V2_MIGRATION_FEE_ADDRESS[migrationFeeOption];
  }
}

/**
 * Check if a pool is ready for migration based on its quote reserve
 */
export async function checkMigrationReadiness(
  connection: Connection,
  poolAddress: string
): Promise<{ ready: boolean; currentReserve: string; threshold: string; progress: number }> {
  const dbcInstance = new DynamicBondingCurveClient(connection, 'confirmed');
  const poolPubkey = new PublicKey(poolAddress);
  
  const [poolState, poolConfig] = await Promise.all([
    dbcInstance.state.getPool(poolPubkey),
    dbcInstance.state.getPoolConfig(poolPubkey),
  ]);

  if (!poolState || !poolConfig) {
    throw new Error('Pool or pool config not found');
  }

  const currentReserve = poolState.quoteReserve.toString();
  const threshold = poolConfig.migrationQuoteThreshold.toString();
  const progress = poolConfig.migrationQuoteThreshold.isZero() 
    ? 0 
    : Math.min((poolState.quoteReserve.toNumber() / poolConfig.migrationQuoteThreshold.toNumber()) * 100, 100);

  return {
    ready: poolState.quoteReserve.gte(poolConfig.migrationQuoteThreshold),
    currentReserve,
    threshold,
    progress
  };
}
