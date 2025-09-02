import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

// Environment variables
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

interface AutoMigrateRequest {
  poolAddress: string;
  userWallet: string; // Payer wallet
}

interface AutoMigrateResponse {
  success: boolean;
  transactionSignature?: string;
  error?: string;
  migrationProgress?: number;
  isReady?: boolean;
}

/**
 * Automatically migrate a DBC pool to DAMM v2 when it reaches migration threshold
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<AutoMigrateResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { poolAddress, userWallet }: AutoMigrateRequest = req.body;

    // Validate required fields
    if (!poolAddress || !userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: poolAddress, userWallet'
      });
    }

    console.log('🚀 Starting automatic migration to DAMM v2...');
    console.log('📋 Migration details:', { poolAddress, userWallet });

    // 1. Set up connection
    const connection = new Connection(RPC_URL, 'confirmed');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');

    // 2. Validate pool address
    let poolPublicKey: PublicKey;
    try {
      poolPublicKey = new PublicKey(poolAddress);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid pool address format'
      });
    }

    // 3. Validate user wallet
    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(userWallet);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user wallet format'
      });
    }

    // 4. Check if pool exists and get state
    console.log('🔍 Checking pool state...');
    const poolState = await dbcClient.state.getPool(poolPublicKey);
    if (!poolState) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found'
      });
    }

    // 5. Check if already migrated
    if (poolState.isMigrated) {
      return res.status(400).json({
        success: false,
        error: 'Pool has already been migrated'
      });
    }

    // 6. Get pool config
    console.log('⚙️ Getting pool configuration...');
    const poolConfig = await dbcClient.state.getPoolConfig(poolState.config);
    if (!poolConfig) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get pool configuration'
      });
    }

    // 7. Verify migration option is DAMM v2
    if (poolConfig.migrationOption !== 1) {
      return res.status(400).json({
        success: false,
        error: 'Pool is not configured for DAMM v2 migration'
      });
    }

    // 8. Check migration readiness
    console.log('📊 Checking migration readiness...');
    const currentQuoteReserve = poolState.quoteReserve;
    const migrationThreshold = poolConfig.migrationQuoteThreshold;
    const progress = Math.min((currentQuoteReserve.toNumber() / migrationThreshold.toNumber()) * 100, 100);
    const isReady = currentQuoteReserve.gte(migrationThreshold);

    console.log(`📊 Migration progress: ${progress.toFixed(2)}%`);
    console.log(`💰 Current quote reserve: ${currentQuoteReserve.toString()}`);
    console.log(`🎯 Migration threshold: ${migrationThreshold.toString()}`);
    console.log(`✅ Ready for migration: ${isReady}`);

    if (!isReady) {
      return res.status(400).json({
        success: false,
        error: `Pool not ready for migration. Progress: ${progress.toFixed(2)}%`,
        migrationProgress: progress,
        isReady: false
      });
    }

    // 9. Get DAMM v2 config address
    const dammV2ConfigAddress = getDammV2ConfigAddress(poolConfig.migrationFeeOption);
    console.log(`🎯 Using DAMM v2 config: ${dammV2ConfigAddress.toString()}`);

    // 10. Create migration metadata if needed
    console.log('📝 Ensuring migration metadata exists...');
    try {
      const metadataAddress = dbcClient.migration.deriveDammV2MigrationMetadataAddress(poolPublicKey);
      const metadataAccount = await connection.getAccountInfo(metadataAddress);
      
      if (!metadataAccount) {
        console.log('📝 Creating DAMM v2 migration metadata...');
        const createMetadataTx = await dbcClient.migration.createDammV2MigrationMetadata({
          payer: userPublicKey,
          virtualPool: poolPublicKey,
          config: poolState.config
        });

        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        createMetadataTx.recentBlockhash = blockhash;
        createMetadataTx.feePayer = userPublicKey;

        const metadataSignature = await connection.sendTransaction(createMetadataTx, [userPublicKey]);
        await connection.confirmTransaction(metadataSignature, 'confirmed');
        console.log('✅ Migration metadata created:', metadataSignature);
      } else {
        console.log('✅ Migration metadata already exists');
      }
    } catch (error) {
      console.warn('⚠️ Warning: Could not create migration metadata:', error);
      // Continue with migration - metadata might be created automatically
    }

    // 11. Create locker if vesting is enabled
    if (hasLockedVesting(poolConfig)) {
      console.log('🔒 Creating locker for vesting...');
      try {
        const createLockerTx = await dbcClient.migration.createLocker({
          payer: userPublicKey,
          virtualPool: poolPublicKey
        });

        const { blockhash } = await connection.getLatestBlockhash('confirmed');
        createLockerTx.recentBlockhash = blockhash;
        createLockerTx.feePayer = userPublicKey;

        const lockerSignature = await connection.sendTransaction(createLockerTx, [userPublicKey]);
        await connection.confirmTransaction(lockerSignature, 'confirmed');
        console.log('✅ Locker created:', lockerSignature);
      } catch (error) {
        console.warn('⚠️ Warning: Could not create locker:', error);
        // Continue with migration - locker might already exist
      }
    }

    // 12. Perform migration to DAMM v2
    console.log('🔄 Executing migration to DAMM v2...');
    const migrationTx = await dbcClient.migration.migrateToDammV2({
      payer: userPublicKey,
      virtualPool: poolPublicKey,
      dammConfig: dammV2ConfigAddress
    });

    // 13. Sign and send migration transaction
    const { blockhash } = await connection.getLatestBlockhash('confirmed');
    migrationTx.transaction.recentBlockhash = blockhash;
    migrationTx.transaction.feePayer = userPublicKey;

    console.log('📝 Sending migration transaction...');
    const signature = await connection.sendTransaction(
      migrationTx.transaction,
      [
        migrationTx.firstPositionNftKeypair,
        migrationTx.secondPositionNftKeypair
      ],
      { skipPreflight: false }
    );

    // 14. Wait for confirmation
    console.log('⏳ Waiting for transaction confirmation...');
    await connection.confirmTransaction(signature, 'confirmed');

    console.log('✅ Migration to DAMM v2 completed successfully!');
    console.log(`🔗 Transaction: ${signature}`);

    // 15. Return success response
    res.status(200).json({
      success: true,
      transactionSignature: signature,
      migrationProgress: 100,
      isReady: true
    });

  } catch (error) {
    console.error('❌ Error in auto-migrate-damm-v2 API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      error: `Migration failed: ${errorMessage}`
    });
  }
}

/**
 * Check if pool has locked vesting
 */
function hasLockedVesting(poolConfig: any): boolean {
  try {
    return (
      poolConfig.lockedVestingConfig.amountPerPeriod.gt(0) ||
      poolConfig.lockedVestingConfig.cliffUnlockAmount.gt(0)
    );
  } catch (error) {
    return false;
  }
}

/**
 * Get DAMM v2 config address based on migration fee option
 */
function getDammV2ConfigAddress(migrationFeeOption: number): PublicKey {
  // These are the official DAMM v2 migration fee addresses
  const DAMM_V2_MIGRATION_FEE_ADDRESSES: { [key: number]: string } = {
    0: '7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd', // 25 bps
    1: '7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd', // 30 bps
    2: '7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd', // 100 bps
    3: '7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd', // 200 bps
    4: '7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd', // 400 bps
    5: '7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd', // 600 bps
    6: '7F6dnUcRuyM2TwR8myT1dYypFXpPSxqwKNSFNkxyNESd', // Customizable
  };

  const address = DAMM_V2_MIGRATION_FEE_ADDRESSES[migrationFeeOption] || DAMM_V2_MIGRATION_FEE_ADDRESSES[0];
  return new PublicKey(address);
}
