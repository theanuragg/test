import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

// Environment variables
const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

interface CheckStatusRequest {
  poolAddress: string;
}

interface CheckStatusResponse {
  success: boolean;
  data?: {
    isMigrated: boolean;
    migrationProgress: number;
    currentQuoteReserve: string;
    migrationThreshold: string;
    isReadyForMigration: boolean;
    migrationOption: number;
    migrationFeeOption: number;
    poolStatus: string;
  };
  error?: string;
}

/**
 * Check migration status for a specific pool
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<CheckStatusResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { poolAddress }: CheckStatusRequest = req.body;

    // Validate required fields
    if (!poolAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: poolAddress'
      });
    }

    console.log('🔍 Checking migration status for pool:', poolAddress);

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

    // 3. Get pool state
    const poolState = await dbcClient.state.getPool(poolPublicKey);
    if (!poolState) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found'
      });
    }

    // 4. Get pool config
    const poolConfig = await dbcClient.state.getPoolConfig(poolState.config);
    if (!poolConfig) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get pool configuration'
      });
    }

    // 5. Calculate migration progress
    const currentQuoteReserve = poolState.quoteReserve;
    const migrationThreshold = poolConfig.migrationQuoteThreshold;
    const progress = Math.min((currentQuoteReserve.toNumber() / migrationThreshold.toNumber()) * 100, 100);
    const isReadyForMigration = currentQuoteReserve.gte(migrationThreshold);

    // 6. Determine pool status
    let poolStatus = 'Active';
    if (poolState.isMigrated) {
      poolStatus = 'Migrated to DAMM';
    } else if (isReadyForMigration) {
      poolStatus = 'Ready for Migration';
    } else if (progress > 50) {
      poolStatus = 'Approaching Migration';
    } else if (progress > 10) {
      poolStatus = 'Building Liquidity';
    } else {
      poolStatus = 'Early Stage';
    }

    // 7. Return status data
    const response: CheckStatusResponse = {
      success: true,
      data: {
        isMigrated: poolState.isMigrated,
        migrationProgress: progress,
        currentQuoteReserve: currentQuoteReserve.toString(),
        migrationThreshold: migrationThreshold.toString(),
        isReadyForMigration,
        migrationOption: poolConfig.migrationOption,
        migrationFeeOption: poolConfig.migrationFeeOption,
        poolStatus
      }
    };

    console.log('✅ Migration status retrieved successfully');
    console.log('📊 Status:', response.data);

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error in check-migration-status API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      error: `Failed to check migration status: ${errorMessage}`
    });
  }
}
