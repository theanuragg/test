import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import BN from 'bn.js';

export interface MigrationCheckResult {
  isReady: boolean;
  currentQuoteReserve: BN;
  migrationThreshold: BN;
  progress: number;
  poolAddress: string;
  configAddress: string;
}

export interface MigrationResult {
  success: boolean;
  transactionSignature?: string;
  error?: string;
  newPoolAddress?: string;
}

export class AutomaticMigrationService {
  private dbcClient: DynamicBondingCurveClient;
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
    this.dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
  }

  /**
   * Check if a pool is ready for migration
   */
  async checkMigrationReadiness(poolAddress: string): Promise<MigrationCheckResult> {
    try {
      console.log(`🔍 Checking migration readiness for pool: ${poolAddress}`);

      // Get pool state
      const poolState = await this.dbcClient.state.getPool(poolAddress);
      if (!poolState) {
        throw new Error('Pool not found');
      }

      // Get pool config
      const poolConfig = await this.dbcClient.state.getPoolConfig(poolState.config);
      if (!poolConfig) {
        throw new Error('Pool config not found');
      }

      // Check if already migrated
      if (poolState.isMigrated) {
        return {
          isReady: false,
          currentQuoteReserve: poolState.quoteReserve,
          migrationThreshold: poolConfig.migrationQuoteThreshold,
          progress: 100,
          poolAddress,
          configAddress: poolState.config.toString()
        };
      }

      // Calculate progress
      const currentQuoteReserve = poolState.quoteReserve;
      const migrationThreshold = poolConfig.migrationQuoteThreshold;
      const progress = Math.min((currentQuoteReserve.toNumber() / migrationThreshold.toNumber()) * 100, 100);

      // Check if ready (threshold reached)
      const isReady = currentQuoteReserve.gte(migrationThreshold);

      console.log(`📊 Migration progress: ${progress.toFixed(2)}%`);
      console.log(`💰 Current quote reserve: ${currentQuoteReserve.toString()}`);
      console.log(`🎯 Migration threshold: ${migrationThreshold.toString()}`);
      console.log(`✅ Ready for migration: ${isReady}`);

      return {
        isReady,
        currentQuoteReserve,
        migrationThreshold,
        progress,
        poolAddress,
        configAddress: poolState.config.toString()
      };

    } catch (error) {
      console.error('❌ Error checking migration readiness:', error);
      throw error;
    }
  }

  /**
   * Automatically migrate pool to DAMM v2
   */
  async migrateToDammV2(
    poolAddress: string, 
    payer: PublicKey
  ): Promise<MigrationResult> {
    try {
      console.log(`🚀 Starting automatic migration to DAMM v2 for pool: ${poolAddress}`);

      // Check if ready for migration
      const migrationCheck = await this.checkMigrationReadiness(poolAddress);
      if (!migrationCheck.isReady) {
        return {
          success: false,
          error: `Pool not ready for migration. Progress: ${migrationCheck.progress.toFixed(2)}%`
        };
      }

      // Get pool state
      const poolState = await this.dbcClient.state.getPool(poolAddress);
      if (!poolState) {
        throw new Error('Pool not found');
      }

      // Get pool config
      const poolConfig = await this.dbcClient.state.getPoolConfig(poolState.config);
      if (!poolConfig) {
        throw new Error('Pool config not found');
      }

      // Verify migration option is DAMM v2
      if (poolConfig.migrationOption !== 1) {
        return {
          success: false,
          error: 'Pool is not configured for DAMM v2 migration'
        };
      }

      // Perform migration
      console.log('🔄 Executing migration to DAMM v2...');
      const migrationTx = await this.dbcClient.migration.migrateToDammV2({
        payer,
        virtualPool: new PublicKey(poolAddress),
        dammConfig: this.getDammV2ConfigAddress(poolConfig.migrationFeeOption)
      });

      // Sign and send transaction
      const { blockhash } = await this.connection.getLatestBlockhash('confirmed');
      migrationTx.transaction.recentBlockhash = blockhash;
      migrationTx.transaction.feePayer = payer;

      // Sign with required keypairs
      const signature = await this.connection.sendTransaction(
        migrationTx.transaction,
        [
          migrationTx.firstPositionNftKeypair,
          migrationTx.secondPositionNftKeypair
        ],
        { skipPreflight: false }
      );

      // Wait for confirmation
      await this.connection.confirmTransaction(signature, 'confirmed');

      console.log('✅ Migration to DAMM v2 completed successfully!');
      console.log(`🔗 Transaction: ${signature}`);

      return {
        success: true,
        transactionSignature: signature,
        newPoolAddress: poolAddress // The pool address remains the same
      };

    } catch (error) {
      console.error('❌ Error during migration to DAMM v2:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check if pool has locked vesting
   */
  private hasLockedVesting(poolConfig: any): boolean {
    return (
      poolConfig.lockedVestingConfig.amountPerPeriod.gt(new BN(0)) ||
      poolConfig.lockedVestingConfig.cliffUnlockAmount.gt(new BN(0))
    );
  }

  /**
   * Get DAMM v2 config address based on migration fee option
   */
  private getDammV2ConfigAddress(migrationFeeOption: number): PublicKey {
    // These are the official DAMM v2 migration fee addresses
    const DAMM_V2_MIGRATION_FEE_ADDRESSES = {
      0: new PublicKey('7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd'), // 25 bps
      1: new PublicKey('7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd'), // 30 bps
      2: new PublicKey('7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd'), // 100 bps
      3: new PublicKey('7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd'), // 200 bps
      4: new PublicKey('7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd'), // 400 bps
      5: new PublicKey('7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd'), // 600 bps
      6: new PublicKey('7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd'), // Customizable
    };

    return DAMM_V2_MIGRATION_FEE_ADDRESSES[migrationFeeOption as keyof typeof DAMM_V2_MIGRATION_FEE_ADDRESSES] || 
           DAMM_V2_MIGRATION_FEE_ADDRESSES[0];
  }

  /**
   * Get all pools ready for migration
   */
  async getPoolsReadyForMigration(): Promise<MigrationCheckResult[]> {
    try {
      console.log('🔍 Scanning all pools for migration readiness...');

      // Get all pools
      const allPools = await this.dbcClient.state.getPools();
      const readyPools: MigrationCheckResult[] = [];

      for (const pool of allPools) {
        try {
          const migrationCheck = await this.checkMigrationReadiness(pool.publicKey.toString());
          if (migrationCheck.isReady) {
            readyPools.push(migrationCheck);
          }
        } catch (error) {
          console.warn(`⚠️ Error checking pool ${pool.publicKey.toString()}:`, error);
          continue;
        }
      }

      console.log(`✅ Found ${readyPools.length} pools ready for migration`);
      return readyPools;

    } catch (error) {
      console.error('❌ Error getting pools ready for migration:', error);
      throw error;
    }
  }
}
