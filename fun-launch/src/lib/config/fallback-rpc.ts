// Fallback RPC Configuration
// Provides multiple layers of fallback for maximum reliability

import { Connection } from '@solana/web3.js';

// Multiple fallback strategies
const FALLBACK_STRATEGIES = {
  // Strategy 1: Fast endpoints (low latency)
  fast: [
    'https://solana-api.projectserum.com',
    'https://solana.public-rpc.com',
  ],
  
  // Strategy 2: Reliable endpoints (high uptime)
  reliable: [
    'https://api.mainnet-beta.solana.com',
    'https://solana.getblock.io/mainnet/',
  ],
  
  // Strategy 3: Backup endpoints (when others fail)
  backup: [
    'https://solana.rpc.extrnode.com',
    'https://rpc.ankr.com/solana',
  ],
  
  // Strategy 4: Emergency endpoints (last resort)
  emergency: [
    'https://solana.public-rpc.com',
    'https://api.mainnet-beta.solana.com',
  ],
};

// Connection cache
let connectionCache: Connection | null = null;
let lastCacheTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get fallback connection with multiple strategies
export async function getFallbackConnection(): Promise<Connection> {
  // Return cached connection if still valid
  if (connectionCache && (Date.now() - lastCacheTime) < CACHE_DURATION) {
    try {
      // Quick health check
      await testConnectionQuick(connectionCache);
      return connectionCache;
    } catch (error) {
      console.warn('Cached connection failed health check, trying fresh connection');
      connectionCache = null;
    }
  }

  // Try each strategy in order
  const strategies = Object.entries(FALLBACK_STRATEGIES);
  
  for (const [strategyName, endpoints] of strategies) {
    console.log(`🔄 Trying ${strategyName} strategy with ${endpoints.length} endpoints`);
    
    for (const endpoint of endpoints) {
      try {
        const connection = new Connection(endpoint, 'confirmed');
        
        // Test with strategy-specific timeout
        const timeout = getStrategyTimeout(strategyName);
        await testConnectionWithTimeout(connection, endpoint, timeout);
        
        // Cache the successful connection
        connectionCache = connection;
        lastCacheTime = Date.now();
        
        console.log(`✅ Using ${strategyName} endpoint: ${endpoint}`);
        return connection;
        
      } catch (error) {
        console.error(`❌ ${strategyName} endpoint ${endpoint} failed:`, error);
      }
    }
    
    console.log(`⚠️ All ${strategyName} endpoints failed, trying next strategy`);
  }
  
  throw new Error('All fallback strategies failed. Please check your internet connection and try again.');
}

// Get timeout based on strategy
function getStrategyTimeout(strategy: string): number {
  switch (strategy) {
    case 'fast':
      return 5000; // 5 seconds for fast endpoints
    case 'reliable':
      return 8000; // 8 seconds for reliable endpoints
    case 'backup':
      return 12000; // 12 seconds for backup endpoints
    case 'emergency':
      return 20000; // 20 seconds for emergency endpoints
    default:
      return 10000; // Default 10 seconds
  }
}

// Test connection with specific timeout
async function testConnectionWithTimeout(connection: Connection, endpoint: string, timeout: number): Promise<number> {
  console.log(`🔄 Testing ${endpoint} with ${timeout}ms timeout`);
  
  const slotPromise = connection.getSlot();
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
  );
  
  const slot = await Promise.race([slotPromise, timeoutPromise]);
  console.log(`✅ Endpoint ${endpoint} responded successfully`);
  return slot;
}

// Quick health check for cached connections
async function testConnectionQuick(connection: Connection): Promise<number> {
  const timeout = 3000; // Quick 3-second timeout for health checks
  
  const slotPromise = connection.getSlot();
  const timeoutPromise = new Promise<never>((_, reject) => 
    setTimeout(() => reject(new Error(`Health check timeout after ${timeout}ms`)), timeout)
  );
  
  return await Promise.race([slotPromise, timeoutPromise]);
}

// Test all fallback endpoints
export async function testFallbackEndpoints() {
  const results = [];
  
  for (const [strategyName, endpoints] of Object.entries(FALLBACK_STRATEGIES)) {
    for (const endpoint of endpoints) {
      try {
        const connection = new Connection(endpoint, 'confirmed');
        const startTime = Date.now();
        
        const timeout = getStrategyTimeout(strategyName);
        const slot = await testConnectionWithTimeout(connection, endpoint, timeout);
        const responseTime = Date.now() - startTime;
        
        results.push({
          strategy: strategyName,
          endpoint,
          success: true,
          slot,
          responseTime,
          timeout,
        });
        
      } catch (error) {
        results.push({
          strategy: strategyName,
          endpoint,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timeout: getStrategyTimeout(strategyName),
        });
      }
    }
  }
  
  return results;
}

// Clear cache
export function clearFallbackCache() {
  connectionCache = null;
  lastCacheTime = 0;
}

// Get cache status
export function getFallbackCacheStatus() {
  return {
    hasCachedConnection: connectionCache !== null,
    lastCacheTime,
    cacheAge: connectionCache ? Date.now() - lastCacheTime : 0,
    isCacheValid: connectionCache && (Date.now() - lastCacheTime) < CACHE_DURATION,
  };
}
