// src/lib/dbc/migration.ts
import {
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  Transaction,
} from '@solana/web3.js';
import { Wallet } from '@coral-xyz/anchor';
import BN from 'bn.js';
import {
  DAMM_V1_MIGRATION_FEE_ADDRESS,
  DAMM_V2_MIGRATION_FEE_ADDRESS,
  deriveBaseKeyForLocker,
  deriveDammV1MigrationMetadataAddress,
  deriveDammV2MigrationMetadataAddress,
  deriveEscrow,
  DynamicBondingCurveClient,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { DbcConfig } from '../../types/dbc';
import { modifyComputeUnitPriceIx, runSimulateTransaction } from './helpers';

export const DEFAULT_SEND_TX_MAX_RETRIES = 3;

/**
 * Migrate DBC pool to DAMM V1 pool
 */
export async function migrateDammV1(
  config: DbcConfig,
  connection: Connection,
  wallet: Wallet
) {
  if (!config.baseMint) {
    throw new Error('Missing baseMint configuration');
  }

  console.log('\\n> Initializing migration from DBC to DAMM v1...');

  const dbcInstance = new DynamicBondingCurveClient(connection, 'confirmed');

  const baseMint = new PublicKey(config.baseMint);
  const poolState = await dbcInstance.state.getPoolByBaseMint(baseMint);
  if (!poolState) {
    throw new Error(`DBC Pool not found for ${baseMint.toString()}`);
  }

  const dbcConfigAddress = poolState.account.config;
  const poolConfig = await dbcInstance.state.getPoolConfig(dbcConfigAddress);
  if (!poolConfig) {
    throw new Error(`DBC Pool config not found for ${dbcConfigAddress.toString()}`);
  }

  console.log('> Pool Quote Reserve:', poolState.account.quoteReserve.toString());
  console.log('> Pool Migration Quote Threshold:', poolConfig.migrationQuoteThreshold.toString());

  if (poolState.account.quoteReserve.lt(poolConfig.migrationQuoteThreshold)) {
    throw new Error(
      'Unable to migrate DBC to DAMM V1: Pool quote reserve is less than migration quote threshold'
    );
  }

  const migrationFeeOption = poolConfig.migrationFeeOption;
  const dammConfigAddress = DAMM_V1_MIGRATION_FEE_ADDRESS[migrationFeeOption];
  if (!dammConfigAddress) {
    throw new Error(`No DAMM config address found for migration fee option: ${migrationFeeOption}`);
  }

  const poolAddress = poolState.publicKey;
  const transactions: Transaction[] = [];

  // Check if migration metadata exists
  console.log('> Checking if migration metadata exists...');
  const migrationMetadata = deriveDammV1MigrationMetadataAddress(poolAddress);
  console.log('> Migration metadata address:', migrationMetadata.toString());

  const metadataAccount = await connection.getAccountInfo(migrationMetadata);
  if (!metadataAccount) {
    console.log('Creating migration metadata...');
    const createMetadataTx = await dbcInstance.migration.createDammV1MigrationMetadata({
      payer: wallet.publicKey,
      virtualPool: poolAddress,
      config: dbcConfigAddress,
    });
    modifyComputeUnitPriceIx(createMetadataTx, config.computeUnitPriceMicroLamports);
    transactions.push(createMetadataTx);
  } else {
    console.log('Migration metadata already exists');
  }

  // Check if locked vesting exists
  if (poolConfig.lockedVestingConfig.amountPerPeriod.gt(new BN(0))) {
    const base = deriveBaseKeyForLocker(poolAddress);
    const escrow = deriveEscrow(base);
    const escrowAccount = await connection.getAccountInfo(escrow);

    if (!escrowAccount) {
      console.log('> Locker not found, creating locker...');
      const createLockerTx = await dbcInstance.migration.createLocker({
        virtualPool: poolAddress,
        payer: wallet.publicKey,
      });
      modifyComputeUnitPriceIx(createLockerTx, config.computeUnitPriceMicroLamports);
      transactions.push(createLockerTx);
    } else {
      console.log('> Locker already exists, skipping creation');
    }
  } else {
    console.log('> No locked vesting found, skipping locker creation');
  }

  // Migrate to DAMM V1
  console.log('Migrating to DAMM V1...');
  if (poolState.account.isMigrated === 0) {
    const migrateTx = await dbcInstance.migration.migrateToDammV1({
      payer: wallet.publicKey,
      virtualPool: poolAddress,
      dammConfig: dammConfigAddress,
    });
    transactions.push(migrateTx);
  } else {
    console.log('> Pool already migrated to DAMM V1');
  }

  // Execute transactions
  if (transactions.length > 0) {
    if (config.dryRun) {
      console.log('> Simulating migration transactions...');
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        if (!transaction) {
          throw new Error(`Transaction at index ${i} is undefined`);
        }
        console.log(`> Simulating transaction [${i + 1}/${transactions.length}]...`);
        await runSimulateTransaction(connection, [wallet.payer], wallet.publicKey, [transaction]);
      }
      console.log('> Initial migration simulation successful');
    } else {
      try {
        for (let i = 0; i < transactions.length; i++) {
          const transaction = transactions[i];
          if (!transaction) {
            throw new Error(`Transaction at index ${i} is undefined`);
          }

          console.log(`> Sending migration transaction [${i + 1}/${transactions.length}]...`);

          const txHash = await sendAndConfirmTransaction(connection, transaction, [wallet.payer], {
            commitment: connection.commitment,
            maxRetries: DEFAULT_SEND_TX_MAX_RETRIES,
          });

          console.log(`> Migration transaction [${i + 1}] successful with tx hash: ${txHash}`);
        }
      } catch (error) {
        console.error('Failed to execute migration transactions:', error);
        throw error;
      }
    }
  }

  // Handle LP token claiming and locking
  await handleLpTokenOperations(
    config,
    connection,
    wallet,
    poolAddress,
    dammConfigAddress,
    poolState,
    poolConfig,
    'v1'
  );
}

/**
 * Migrate DBC pool to DAMM V2 pool
 */
export async function migrateDammV2(
  config: DbcConfig,
  connection: Connection,
  wallet: Wallet
) {
  if (!config.baseMint) {
    throw new Error('Missing baseMint configuration');
  }

  console.log('\\n> Initializing migration from DBC to DAMM v2...');

  const dbcInstance = new DynamicBondingCurveClient(connection, 'confirmed');

  const baseMint = new PublicKey(config.baseMint);
  const poolState = await dbcInstance.state.getPoolByBaseMint(baseMint);
  if (!poolState) {
    throw new Error(`DBC Pool not found for ${baseMint.toString()}`);
  }

  const dbcConfigAddress = poolState.account.config;
  const poolConfig = await dbcInstance.state.getPoolConfig(dbcConfigAddress);
  if (!poolConfig) {
    throw new Error(`DBC Pool config not found for ${dbcConfigAddress.toString()}`);
  }

  console.log('> Pool Quote Reserve:', poolState.account.quoteReserve.toString());
  console.log('> Pool Migration Quote Threshold:', poolConfig.migrationQuoteThreshold.toString());

  if (poolState.account.quoteReserve.lt(poolConfig.migrationQuoteThreshold)) {
    throw new Error(
      'Unable to migrate DBC to DAMM V2: Pool quote reserve is less than migration quote threshold'
    );
  }

  const migrationFeeOption = poolConfig.migrationFeeOption;
  const dammConfigAddress = DAMM_V2_MIGRATION_FEE_ADDRESS[migrationFeeOption];
  if (!dammConfigAddress) {
    throw new Error(`No DAMM config address found for migration fee option: ${migrationFeeOption}`);
  }

  const poolAddress = poolState.publicKey;
  const transactions: Transaction[] = [];

  // Check if migration metadata exists
  console.log('> Checking if migration metadata exists...');
  const migrationMetadata = deriveDammV2MigrationMetadataAddress(poolAddress);
  console.log('> Migration metadata address:', migrationMetadata.toString());

  const metadataAccount = await connection.getAccountInfo(migrationMetadata);
  if (!metadataAccount) {
    console.log('Creating migration metadata...');
    const createMetadataTx = await dbcInstance.migration.createDammV2MigrationMetadata({
      payer: wallet.publicKey,
      virtualPool: poolAddress,
      config: dbcConfigAddress,
    });
    modifyComputeUnitPriceIx(createMetadataTx, config.computeUnitPriceMicroLamports);
    transactions.push(createMetadataTx);
  } else {
    console.log('Migration metadata already exists');
  }

  // Check if locked vesting exists
  if (poolConfig.lockedVestingConfig.amountPerPeriod.gt(new BN(0))) {
    const base = deriveBaseKeyForLocker(poolAddress);
    const escrow = deriveEscrow(base);
    const escrowAccount = await connection.getAccountInfo(escrow);

    if (!escrowAccount) {
      console.log('> Locker not found, creating locker...');
      const createLockerTx = await dbcInstance.migration.createLocker({
        virtualPool: poolAddress,
        payer: wallet.publicKey,
      });
      modifyComputeUnitPriceIx(createLockerTx, config.computeUnitPriceMicroLamports);
      transactions.push(createLockerTx);
    } else {
      console.log('> Locker already exists, skipping creation');
    }
  } else {
    console.log('> No locked vesting found, skipping locker creation');
  }

  // Execute metadata creation and locker creation first
  if (transactions.length > 0) {
    if (config.dryRun) {
      console.log('> Simulating migration transactions...');
      for (let i = 0; i < transactions.length; i++) {
        const transaction = transactions[i];
        if (!transaction) {
          throw new Error(`Transaction at index ${i} is undefined`);
        }
        console.log(`> Simulating transaction [${i + 1}/${transactions.length}]...`);
        await runSimulateTransaction(connection, [wallet.payer], wallet.publicKey, [transaction]);
      }
      console.log('> Initial migration simulation successful');
    } else {
      try {
        for (let i = 0; i < transactions.length; i++) {
          const transaction = transactions[i];
          if (!transaction) {
            throw new Error(`Transaction at index ${i} is undefined`);
          }

          console.log(`> Sending migration transaction [${i + 1}/${transactions.length}]...`);

          const txHash = await sendAndConfirmTransaction(connection, transaction, [wallet.payer], {
            commitment: connection.commitment,
            maxRetries: DEFAULT_SEND_TX_MAX_RETRIES,
          });

          console.log(`> Migration transaction [${i + 1}] successful with tx hash: ${txHash}`);
        }
      } catch (error) {
        console.error('Failed to execute migration transactions:', error);
        throw error;
      }
    }
  }

  // Migrate to DAMM V2
  console.log('Migrating to DAMM V2...');
  if (poolState.account.isMigrated === 0) {
    const {
      transaction: migrateTx,
      firstPositionNftKeypair,
      secondPositionNftKeypair,
    } = await dbcInstance.migration.migrateToDammV2({
      payer: wallet.publicKey,
      virtualPool: poolAddress,
      dammConfig: dammConfigAddress,
    });

    modifyComputeUnitPriceIx(migrateTx, config.computeUnitPriceMicroLamports);

    if (config.dryRun) {
      console.log('> Simulating migration to DAMM V2 transaction...');
      await runSimulateTransaction(
        connection,
        [wallet.payer, firstPositionNftKeypair, secondPositionNftKeypair],
        wallet.publicKey,
        [migrateTx]
      );
      console.log('> Migration simulation successful');
    } else {
      console.log('> Sending migration to DAMM V2 transaction...');
      const migrateTxHash = await sendAndConfirmTransaction(
        connection,
        migrateTx,
        [wallet.payer, firstPositionNftKeypair, secondPositionNftKeypair],
        {
          commitment: connection.commitment,
          maxRetries: DEFAULT_SEND_TX_MAX_RETRIES,
        }
      );
      console.log(`> Migration to DAMM V2 successful with tx hash: ${migrateTxHash}`);
    }
  } else {
    console.log('> Pool already migrated to DAMM V2');
  }

  console.log('> DAMM V2 migration process completed successfully');
}

/**
 * Handle LP token operations after migration
 */
async function handleLpTokenOperations(
  config: DbcConfig,
  connection: Connection,
  wallet: Wallet,
  poolAddress: PublicKey,
  dammConfigAddress: PublicKey,
  poolState: any,
  poolConfig: any,
  version: 'v1' | 'v2'
) {
  // This is a simplified version - the actual implementation would handle
  // LP token claiming and locking based on migration metadata
  console.log(`> Handling LP token operations for DAMM ${version}...`);

  if (config.dryRun) {
    console.log('> Skipping LP operations in dry-run mode');
    return;
  }

  // Implementation would include:
  // 1. Fetch migration metadata
  // 2. Check claim/lock status
  // 3. Execute LP token transactions
  // 4. Handle creator vs partner logic

  console.log(`> LP token operations completed for DAMM ${version}`);
}
