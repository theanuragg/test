#!/usr/bin/env node

/**
 * Auto-Migration Cron Job Script
 * 
 * This script can be run as a cron job to automatically check all pools
 * and migrate them to DAMM v2 when they reach the threshold.
 * 
 * Usage:
 * - Run manually: node scripts/auto-migration-cron.js
 * - Set up cron job: */5 * * * * cd /path/to/fun-launch && node scripts/auto-migration-cron.js
 * - Run every 5 minutes
 */

const fetch = require('node-fetch');

// Configuration
const CONFIG = {
  // Your API base URL (update this for production)
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:3000',
  
  // User wallet that will sign migrations (should be a partner wallet)
  PARTNER_WALLET: process.env.PARTNER_WALLET,
  
  // RPC endpoint for checking pools
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Migration settings
  BATCH_SIZE: 10, // Process pools in batches
  DELAY_BETWEEN_BATCHES: 2000, // 2 seconds between batches
};

// Logging utility
const log = (level, message, data = null) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
  
  if (data) {
    console.log(logMessage, JSON.stringify(data, null, 2));
  } else {
    console.log(logMessage);
  }
};

// Check if required environment variables are set
if (!CONFIG.PARTNER_WALLET) {
  log('error', 'PARTNER_WALLET environment variable is required');
  process.exit(1);
}

/**
 * Get all pools that need migration monitoring
 */
async function getAllPools() {
  try {
    log('info', 'Fetching all pools...');
    
    // This would typically call your pools list API
    // For now, we'll use a mock response structure
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/pools/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        userWallet: CONFIG.PARTNER_WALLET,
        includeAll: true // Include all pools, not just user's
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch pools');
    }

    log('info', `Found ${result.pools?.length || 0} pools to monitor`);
    return result.pools || [];
    
  } catch (error) {
    log('error', 'Failed to fetch pools', { error: error.message });
    return [];
  }
}

/**
 * Check migration status for a single pool
 */
async function checkPoolMigrationStatus(poolAddress) {
  try {
    const response = await fetch(`${CONFIG.API_BASE_URL}/api/migration/check-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poolAddress }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to check migration status');
    }

    return result.data;
    
  } catch (error) {
    log('error', `Failed to check migration status for pool ${poolAddress}`, { error: error.message });
    return null;
  }
}

/**
 * Trigger migration for a pool
 */
async function triggerMigration(poolAddress, poolData) {
  try {
    log('info', `Triggering migration for pool ${poolAddress}`, { 
      tokenSymbol: poolData.tokenSymbol,
      currentReserve: poolData.currentQuoteReserve,
      threshold: poolData.migrationThreshold 
    });

    const response = await fetch(`${CONFIG.API_BASE_URL}/api/migration/background-migration`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        poolAddress,
        userWallet: CONFIG.PARTNER_WALLET,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.success) {
      log('success', `Migration successful for pool ${poolAddress}`, {
        transactionSignature: result.transactionSignature,
        tokenSymbol: poolData.tokenSymbol
      });
      return { success: true, transactionSignature: result.transactionSignature };
    } else {
      throw new Error(result.error || 'Migration failed');
    }
    
  } catch (error) {
    log('error', `Failed to migrate pool ${poolAddress}`, { error: error.message });
    return { success: false, error: error.message };
  }
}

/**
 * Process pools in batches
 */
async function processPoolsInBatches(pools) {
  const readyPools = [];
  
  // First, check migration status for all pools
  log('info', 'Checking migration status for all pools...');
  
  for (let i = 0; i < pools.length; i++) {
    const pool = pools[i];
    const status = await checkPoolMigrationStatus(pool.poolAddress);
    
    if (status && status.isReadyForMigration && !status.isMigrated) {
      readyPools.push({ ...pool, ...status });
      log('info', `Pool ${pool.tokenSymbol} ready for migration`, {
        progress: `${status.migrationProgress.toFixed(1)}%`,
        currentReserve: status.currentQuoteReserve,
        threshold: status.migrationThreshold
      });
    }
    
    // Small delay to avoid overwhelming the API
    if (i < pools.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  if (readyPools.length === 0) {
    log('info', 'No pools ready for migration');
    return;
  }
  
  log('info', `Found ${readyPools.length} pools ready for migration`);
  
  // Process ready pools in batches
  for (let i = 0; i < readyPools.length; i += CONFIG.BATCH_SIZE) {
    const batch = readyPools.slice(i, i + CONFIG.BATCH_SIZE);
    
    log('info', `Processing batch ${Math.floor(i / CONFIG.BATCH_SIZE) + 1}/${Math.ceil(readyPools.length / CONFIG.BATCH_SIZE)}`);
    
    // Process batch concurrently
    const batchPromises = batch.map(pool => triggerMigration(pool.poolAddress, pool));
    const batchResults = await Promise.allSettled(batchPromises);
    
    // Log batch results
    batchResults.forEach((result, index) => {
      const pool = batch[index];
      if (result.status === 'fulfilled' && result.value.success) {
        log('success', `Batch migration successful for ${pool.tokenSymbol}`);
      } else {
        log('error', `Batch migration failed for ${pool.tokenSymbol}`, {
          error: result.status === 'rejected' ? result.reason : result.value.error
        });
      }
    });
    
    // Delay between batches
    if (i + CONFIG.BATCH_SIZE < readyPools.length) {
      log('info', `Waiting ${CONFIG.DELAY_BETWEEN_BATCHES}ms before next batch...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.DELAY_BETWEEN_BATCHES));
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  try {
    log('info', '🚀 Starting auto-migration cron job...');
    log('info', 'Configuration', CONFIG);
    
    // Get all pools
    const pools = await getAllPools();
    
    if (pools.length === 0) {
      log('info', 'No pools found to monitor');
      return;
    }
    
    // Process pools
    await processPoolsInBatches(pools);
    
    log('info', '✅ Auto-migration cron job completed successfully');
    
  } catch (error) {
    log('error', 'Auto-migration cron job failed', { error: error.message });
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    log('error', 'Unhandled error in main function', { error: error.message });
    process.exit(1);
  });
}

module.exports = { main, getAllPools, checkPoolMigrationStatus, triggerMigration };
