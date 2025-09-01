// Ultra Robust RPC Configuration
// This provides the most reliable RPC connection handling with multiple fallbacks

import { Connection } from '@solana/web3.js';

// Comprehensive list of RPC endpoints with reliability scores
const ULTRA_ENDPOINTS = [
  // High reliability endpoints (paid/fast)
  {
    endpoint: 'https://solana-api.projectserum.com',
    reliability: 0.9,
    timeout: 5000,
    maxRetries: 2,
  },
  {
    endpoint: 'https://solana.public-rpc.com',
    reliability: 0.8,
    timeout: 6000,
    maxRetries: 3,
  },
  // Medium reliability endpoints
  {
    endpoint: 'https://api.mainnet-beta.solana.com',
    reliability: 0.7,
    timeout: 8000,
    maxRetries: 3,
  },
  {
    endpoint: 'https://solana.getblock.io/mainnet/',
    reliability: 0.6,
    timeout: 10000,
    maxRetries: 2,
  },
  // Fallback endpoints
  {
    endpoint: 'https://solana.rpc.extrnode.com',
    reliability: 0.5,
    timeout: 12000,
    maxRetries: 2,
  },
  // Additional fallbacks
  {
    endpoint: 'https://rpc.ankr.com/solana',
    reliability: 0.4,
    timeout: 15000,
    maxRetries: 1,
  },
  {
    endpoint: 'https://solana.public-rpc.com',
    reliability: 0.3,
    timeout: 20000,
    maxRetries: 1,
  },
];

// Connection cache with health tracking
interface CachedConnection {
  connection: Connection;
  endpoint: string;
  lastUsed: number;
  healthScore: number;
  failureCount: number;
  lastSuccess: number;
}

let connectionCache: Map<string, CachedConnection> = new Map();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

// Get ultra robust connection
export async function getUltraRobustConnection(): Promise<Connection> {
  // Try to use cached connection first
  const cached = getBestCachedConnection();
  if (cached) {
    try {
      // Quick health check
      await testConnectionQuick(cached.connection);
      cached.lastUsed = Date.now();
      cached.healthScore = Math.min(cached.healthScore + 0.1, 1.0);
      return cached.connection;
    } catch (error) {
      console.warn('Cached connection failed health check, trying fresh connection');
      cached.failureCount++;
      cached.healthScore = Math.max(cached.healthScore - 0.2, 0.0);
    }
  }

  // Try endpoints in order of reliability
  const sortedEndpoints = [...ULTRA_ENDPOINTS].sort((a, b) => b.reliability - a.reliability);
  
  for (const endpointConfig of sortedEndpoints) {
    try {
      console.log(`🔄 Trying ultra endpoint: ${endpointConfig.endpoint} (reliability: ${endpointConfig.reliability})`);
      
      const connection = new Connection(endpointConfig.endpoint, 'confirmed');
      
      // Test with endpoint-specific timeout
      await testConnectionWithConfig(connection, endpointConfig);
      
      // Cache the successful connection
      const cachedConnection: CachedConnection = {
        connection,
        endpoint: endpointConfig.endpoint,
        lastUsed: Date.now(),
        healthScore: endpointConfig.reliability,
        failureCount: 0,
        lastSuccess: Date.now(),
      };
      
      connectionCache.set(endpointConfig.endpoint, cachedConnection);
      
      console.log(`✅ Using ultra endpoint: ${endpointConfig.endpoint}`);
      return connection;
      
    } catch (error) {
      console.error(`❌ Ultra endpoint ${endpointConfig.endpoint} failed:`, error);
      
      // Update cache with failure
      const existing = connectionCache.get(endpointConfig.endpoint);
      if (existing) {
        existing.failureCount++;
        existing.healthScore = Math.max(existing.healthScore - 0.3, 0.0);
      }
    }
  }
  
  throw new Error('All ultra RPC endpoints failed. Please check your internet connection and try again.');
}

// Test connection with specific configuration
async function testConnectionWithConfig(connection: Connection, config: typeof ULTRA_ENDPOINTS[0]): Promise<number> {
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const timeout = config.timeout + (attempt * 1000); // Increase timeout for retries
      
      console.log(`🔄 Testing ${config.endpoint} (attempt ${attempt + 1}/${config.maxRetries + 1}) with ${timeout}ms timeout`);
      
      const slotPromise = connection.getSlot();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
      );
      
      const slot = await Promise.race([slotPromise, timeoutPromise]);
      console.log(`✅ Endpoint ${config.endpoint} responded successfully (attempt ${attempt + 1})`);
      return slot;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ Endpoint ${config.endpoint} failed (attempt ${attempt + 1}): ${errorMessage}`);
      
      if (attempt === config.maxRetries) {
        throw new Error(`Failed to connect to ${config.endpoint} after ${config.maxRetries + 1} attempts: ${errorMessage}`);
      }
      
      // Exponential backoff with jitter
      const baseWaitTime = Math.min(1000 * Math.pow(2, attempt), 3000);
      const jitter = Math.random() * 1000;
      const waitTime = baseWaitTime + jitter;
      
      console.log(`🔄 Retrying ${config.endpoint} in ${Math.round(waitTime)}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error(`Failed to connect to ${config.endpoint} after ${config.maxRetries + 1} attempts`);
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

// Get best cached connection
function getBestCachedConnection(): CachedConnection | null {
  const now = Date.now();
  let bestConnection: CachedConnection | null = null;
  let bestScore = 0;
  
  for (const [endpoint, cached] of connectionCache.entries()) {
    // Remove expired cache entries
    if (now - cached.lastUsed > CACHE_DURATION) {
      connectionCache.delete(endpoint);
      continue;
    }
    
    // Calculate score based on health, recency, and failure count
    const recencyScore = Math.max(0, 1 - (now - cached.lastSuccess) / CACHE_DURATION);
    const failurePenalty = cached.failureCount * 0.1;
    const score = cached.healthScore * 0.6 + recencyScore * 0.4 - failurePenalty;
    
    if (score > bestScore) {
      bestScore = score;
      bestConnection = cached;
    }
  }
  
  return bestConnection;
}

// Test all ultra endpoints
export async function testUltraEndpoints() {
  const results = [];
  
  for (const endpointConfig of ULTRA_ENDPOINTS) {
    try {
      const connection = new Connection(endpointConfig.endpoint, 'confirmed');
      const startTime = Date.now();
      
      const slot = await testConnectionWithConfig(connection, endpointConfig);
      const responseTime = Date.now() - startTime;
      
      results.push({
        endpoint: endpointConfig.endpoint,
        success: true,
        slot,
        responseTime,
        reliability: endpointConfig.reliability,
      });
      
    } catch (error) {
      results.push({
        endpoint: endpointConfig.endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        reliability: endpointConfig.reliability,
      });
    }
  }
  
  return results;
}

// Clear cache
export function clearUltraCache() {
  connectionCache.clear();
}

// Get cache status
export function getCacheStatus() {
  const now = Date.now();
  const activeConnections = Array.from(connectionCache.values()).filter(
    cached => now - cached.lastUsed <= CACHE_DURATION
  );
  
  return {
    totalCached: connectionCache.size,
    activeConnections: activeConnections.length,
    connections: activeConnections.map(cached => ({
      endpoint: cached.endpoint,
      healthScore: cached.healthScore,
      failureCount: cached.failureCount,
      lastUsed: cached.lastUsed,
      lastSuccess: cached.lastSuccess,
    })),
  };
}
