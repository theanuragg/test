// Enterprise-Grade RPC Configuration
// Advanced RPC management with load balancing, health checks, and intelligent routing

import { Connection } from '@solana/web3.js';

// Enterprise endpoints with advanced configuration
const ENTERPRISE_ENDPOINTS = [
  // Primary endpoints (high performance)
  {
    endpoint: 'https://solana-api.projectserum.com',
    name: 'Project Serum',
    reliability: 0.98,
    timeout: 5000,
    maxRetries: 1,
    rateLimit: 2000,
    tier: 'primary',
    healthCheck: true,
    loadBalancing: true
  },
  {
    endpoint: 'https://solana.public-rpc.com',
    name: 'Public RPC',
    reliability: 0.95,
    timeout: 6000,
    maxRetries: 2,
    rateLimit: 1500,
    tier: 'primary',
    healthCheck: true,
    loadBalancing: true
  },
  // Secondary endpoints (backup)
  {
    endpoint: 'https://api.mainnet-beta.solana.com',
    name: 'Solana Official',
    reliability: 0.90,
    timeout: 8000,
    maxRetries: 2,
    rateLimit: 1000,
    tier: 'secondary',
    healthCheck: true,
    loadBalancing: false
  },
  {
    endpoint: 'https://solana.getblock.io/mainnet/',
    name: 'GetBlock',
    reliability: 0.88,
    timeout: 7000,
    maxRetries: 2,
    rateLimit: 1200,
    tier: 'secondary',
    healthCheck: true,
    loadBalancing: false
  },
  // Emergency endpoints (last resort)
  {
    endpoint: 'https://solana.rpc.extrnode.com',
    name: 'Extrnode',
    reliability: 0.85,
    timeout: 10000,
    maxRetries: 3,
    rateLimit: 800,
    tier: 'emergency',
    healthCheck: false,
    loadBalancing: false
  }
];

// Health check cache
const healthCache = new Map<string, { healthy: boolean; lastCheck: number; responseTime: number }>();
const HEALTH_CHECK_INTERVAL = 30 * 1000; // 30 seconds

// Load balancing state
let currentPrimaryIndex = 0;
let requestCount = 0;

// Circuit breaker state
const circuitBreakers = new Map<string, { failures: number; lastFailure: number; open: boolean }>();
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 60 * 1000; // 1 minute

// Get enterprise connection with advanced features
export async function getEnterpriseConnection(): Promise<Connection> {
  try {
    // Get the best available endpoint
    const endpoint = await getBestEndpoint();
    
    // Create connection with optimized configuration
    const connection = new Connection(endpoint.endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: endpoint.timeout,
      disableRetryOnRateLimit: false,
      httpHeaders: {
        'User-Agent': 'Enterprise-RPC-Client/1.0'
      }
    });

    console.log(`🚀 Enterprise RPC: Connected to ${endpoint.name} (${endpoint.tier})`);
    return connection;
  } catch (error) {
    console.error('❌ Enterprise RPC: Failed to get connection:', error);
    throw error;
  }
}

// Get the best available endpoint using intelligent routing
async function getBestEndpoint() {
  // Check circuit breakers first
  const availableEndpoints = ENTERPRISE_ENDPOINTS.filter(endpoint => {
    const breaker = circuitBreakers.get(endpoint.endpoint);
    if (breaker?.open) {
      const timeSinceFailure = Date.now() - breaker.lastFailure;
      if (timeSinceFailure > CIRCUIT_BREAKER_TIMEOUT) {
        breaker.open = false;
        breaker.failures = 0;
        return true;
      }
      return false;
    }
    return true;
  });

  if (availableEndpoints.length === 0) {
    throw new Error('All endpoints are temporarily unavailable');
  }

  // Get primary endpoints
  const primaryEndpoints = availableEndpoints.filter(ep => ep.tier === 'primary');
  
  if (primaryEndpoints.length > 0) {
    // Use load balancing for primary endpoints
    if (primaryEndpoints[0].loadBalancing) {
      const selectedIndex = requestCount % primaryEndpoints.length;
      requestCount++;
      return primaryEndpoints[selectedIndex];
    }
    
    // Use health check for primary endpoints
    const healthyPrimary = await getHealthiestEndpoint(primaryEndpoints);
    if (healthyPrimary) return healthyPrimary;
  }

  // Fallback to secondary endpoints
  const secondaryEndpoints = availableEndpoints.filter(ep => ep.tier === 'secondary');
  if (secondaryEndpoints.length > 0) {
    const healthySecondary = await getHealthiestEndpoint(secondaryEndpoints);
    if (healthySecondary) return healthySecondary;
  }

  // Last resort: use any available endpoint
  return availableEndpoints[0];
}

// Get the healthiest endpoint based on response time
async function getHealthiestEndpoint(endpoints: typeof ENTERPRISE_ENDPOINTS) {
  const healthChecks = await Promise.allSettled(
    endpoints.map(async (endpoint) => {
      if (!endpoint.healthCheck) return { endpoint, responseTime: 1000 };

      const startTime = Date.now();
      try {
        const tempConnection = new Connection(endpoint.endpoint, 'confirmed');
        await tempConnection.getSlot();
        const responseTime = Date.now() - startTime;
        
        // Update health cache
        healthCache.set(endpoint.endpoint, {
          healthy: true,
          lastCheck: Date.now(),
          responseTime
        });
        
        return { endpoint, responseTime };
      } catch (error) {
        // Update health cache
        healthCache.set(endpoint.endpoint, {
          healthy: false,
          lastCheck: Date.now(),
          responseTime: Infinity
        });
        
        throw error;
      }
    })
  );

  // Filter successful health checks and sort by response time
  const successfulChecks = healthChecks
    .filter((result): result is PromiseFulfilledResult<{ endpoint: any; responseTime: number }> => 
      result.status === 'fulfilled'
    )
    .map(result => result.value)
    .sort((a, b) => a.responseTime - b.responseTime);

  return successfulChecks.length > 0 ? successfulChecks[0].endpoint : null;
}

// Test connection with enterprise features
export async function testEnterpriseConnection(endpoint?: string): Promise<{
  success: boolean;
  endpoint: string;
  responseTime: number;
  error?: string;
}> {
  const startTime = Date.now();
  
  try {
    const connection = await getEnterpriseConnection();
    const slot = await connection.getSlot();
    const responseTime = Date.now() - startTime;
    
    return {
      success: true,
      endpoint: connection.rpcEndpoint,
      responseTime
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Update circuit breaker
    if (endpoint) {
      const breaker = circuitBreakers.get(endpoint) || { failures: 0, lastFailure: 0, open: false };
      breaker.failures++;
      breaker.lastFailure = Date.now();
      
      if (breaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
        breaker.open = true;
      }
      
      circuitBreakers.set(endpoint, breaker);
    }
    
    return {
      success: false,
      endpoint: endpoint || 'unknown',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Get enterprise connection status
export function getEnterpriseConnectionStatus() {
  return {
    healthCache: Object.fromEntries(healthCache),
    circuitBreakers: Object.fromEntries(circuitBreakers),
    requestCount,
    availableEndpoints: ENTERPRISE_ENDPOINTS.filter(endpoint => {
      const breaker = circuitBreakers.get(endpoint.endpoint);
      return !breaker?.open;
    }).length
  };
}

// Test all enterprise endpoints
export async function testEnterpriseEndpoints() {
  const results = [];
  
  for (const endpoint of ENTERPRISE_ENDPOINTS) {
    const result = await testEnterpriseConnection(endpoint.endpoint);
    results.push({
      name: endpoint.name,
      endpoint: endpoint.endpoint,
      tier: endpoint.tier,
      ...result
    });
  }
  
  return results;
}

// Clean up health cache periodically
setInterval(() => {
  const now = Date.now();
  for (const [endpoint, health] of healthCache.entries()) {
    if (now - health.lastCheck > HEALTH_CHECK_INTERVAL * 2) {
      healthCache.delete(endpoint);
    }
  }
}, HEALTH_CHECK_INTERVAL);
