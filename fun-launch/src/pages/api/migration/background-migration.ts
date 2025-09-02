import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DbcClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

// This endpoint can be called by cron jobs or webhooks to automatically migrate pools
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { poolAddress, userWallet } = req.body;

    if (!poolAddress || !userWallet) {
      return res.status(400).json({ 
        error: 'Missing required parameters: poolAddress and userWallet' 
      });
    }

    // Validate pool address
    let poolPublicKey: PublicKey;
    try {
      poolPublicKey = new PublicKey(poolAddress);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid pool address' });
    }

    // Validate user wallet
    let userPublicKey: PublicKey;
    try {
      userPublicKey = new PublicKey(userWallet);
    } catch (error) {
      return res.status(400).json({ error: 'Invalid user wallet address' });
    }

    // Connect to Solana devnet
    const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com', 'confirmed');
    
    // Initialize DBC client
    const dbcClient = new DbcClient(connection);

    // Check if pool is ready for migration
    const poolState = await dbcClient.state.getPoolState(poolPublicKey);
    if (!poolState) {
      return res.status(404).json({ error: 'Pool not found' });
    }

    // Get pool config
    const poolConfig = await dbcClient.state.getPoolConfig(poolState.config);
    if (!poolConfig) {
      return res.status(404).json({ error: 'Pool config not found' });
    }

    // Check if pool is ready for migration
    const currentQuoteReserves = (poolState as any).quoteReserves?.toNumber() || 0;
    const migrationThreshold = poolConfig.migrationQuoteThreshold?.toNumber() || 0;
    
    if (currentQuoteReserves < migrationThreshold) {
      return res.status(400).json({ 
        error: 'Pool not ready for migration',
        currentQuoteReserves,
        migrationThreshold,
        progress: (currentQuoteReserves / migrationThreshold) * 100
      });
    }

    // Check if already migrated
    if ((poolState as any).isMigrated) {
      return res.status(400).json({ error: 'Pool already migrated' });
    }

    // Check migration option (should be 1 for DAMM v2)
    if (poolConfig.migrationOption !== 1) {
      return res.status(400).json({ 
        error: 'Pool not configured for DAMM v2 migration',
        migrationOption: poolConfig.migrationOption
      });
    }

    console.log(`🚀 Background migration: Pool ${poolAddress} ready for DAMM v2 migration`);

    // Execute migration
    const migrationResult = await dbcClient.migration.migrateToDammV2(
      poolPublicKey,
      userPublicKey
    );

    if (migrationResult.success) {
      console.log(`✅ Background migration successful: ${migrationResult.transactionSignature}`);
      
      return res.status(200).json({
        success: true,
        message: 'Pool successfully migrated to DAMM v2',
        transactionSignature: migrationResult.transactionSignature,
        poolAddress,
        migratedAt: new Date().toISOString()
      });
    } else {
      console.error(`❌ Background migration failed: ${migrationResult.error}`);
      
      return res.status(500).json({
        success: false,
        error: 'Migration failed',
        details: migrationResult.error,
        poolAddress
      });
    }

  } catch (error) {
    console.error('Background migration error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
      poolAddress: req.body?.poolAddress
    });
  }
}
