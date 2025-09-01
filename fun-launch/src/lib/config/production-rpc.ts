// Production-Grade RPC Configuration
// Implements Solana expert best practices for handling RPC connection issues

import { Connection } from '@solana/web3.js';

// Production RPC endpoints with reliability scores and rate limits
const PRODUCTION_ENDPOINTS = [
  // Tier 1: High-reliability endpoints (paid services recommended)
  {
    endpoint: 'https://solana-api.projectserum.com',
    reliability: 0.95,
    timeout: 8000,
    maxRetries: 2,
    rateLimit: 1000, // requests per minute
    tier: 'tier1'
  },
  {
    endpoint: 'https://solana.public-rpc.com',
    reliability: 0.90,
    timeout: 10000,
    maxRetries: 3,
    rateLimit: 800,
    tier: 'tier1'
  },
  // Tier 2: Medium-reliability endpoints
  {
    endpoint: 'https://api.mainnet-beta.solana.com',
    reliability: 0.80,
    timeout: 12000,
    maxRetries: 3,
    rateLimit: 600,
    tier: 'tier2'
  },
  {
    endpoint: 'https://solana.getblock.io/mainnet/',
    reliability: 0.75,
    timeout: 15000,
    maxRetries: 2,
    rateLimit: 500,
    tier: 'tier2'
  },
  // Tier 3: Fallback endpoints
  {
    endpoint: 'https://solana.rpc.extrnode.com',
    reliability: 0.70,
    timeout: 20000,
    maxRetries: 2,
    rateLimit: 400,
    tier: 'tier3'
  },
  {
    endpoint: 'https://rpc.ankr.com/solana',
    reliability: 0.65,
    timeout: 25000,
    maxRetries: 1,
    rateLimit: 300,
    tier: 'tier3'
  }
];

// Circuit breaker state
interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  successCount: number;
  lastSuccessTime: number;
}

// Connection state with health tracking
interface ConnectionState {
  endpoint: string;
  connection: Connection;
  config: typeof PRODUCTION_ENDPOINTS[0];
  circuitBreaker: CircuitBreakerState;
  requestCount: number;
  lastRequestTime: number;
  averageResponseTime: number;
  isHealthy: boolean;
}

class ProductionRpcManager {
  private connections: Map<string, ConnectionState> = new Map();
  private currentConnection: ConnectionState | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening circuit
  private readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
  private readonly HEALTH_CHECK_INTERVAL = 60000; // 1 minute
  private readonly MAX_RESPONSE_TIME = 10000; // 10 seconds

  constructor() {
    this.initializeConnections();
    this.startHealthChecks();
  }

  private initializeConnections() {
    // Sort endpoints by reliability
    const sortedEndpoints = [...PRODUCTION_ENDPOINTS].sort((a, b) => b.reliability - a.reliability);
    
    for (const config of sortedEndpoints) {
      const connection = new Connection(config.endpoint, 'confirmed');
      const connectionState: ConnectionState = {
        endpoint: config.endpoint,
        connection,
        config,
        circuitBreaker: {
          isOpen: false,
          failureCount: 0,
          lastFailureTime: 0,
          successCount: 0,
          lastSuccessTime: Date.now(),
        },
        requestCount: 0,
        lastRequestTime: 0,
        averageResponseTime: 0,
        isHealthy: true,
      };
      
      this.connections.set(config.endpoint, connectionState);
    }
  }

  // Get the best available connection
  async getConnection(): Promise<Connection> {
    // Try to use current connection if it's healthy
    if (this.currentConnection && this.isConnectionHealthy(this.currentConnection)) {
      return this.currentConnection.connection;
    }

    // Find the best available connection
    const bestConnection = await this.findBestConnection();
    if (!bestConnection) {
      throw new Error('No healthy RPC endpoints available. Please try again later.');
    }

    this.currentConnection = bestConnection;
    return bestConnection.connection;
  }

  // Find the best available connection
  private async findBestConnection(): Promise<ConnectionState | null> {
    const healthyConnections = Array.from(this.connections.values())
      .filter(conn => this.isConnectionHealthy(conn))
      .sort((a, b) => {
        // Sort by: circuit breaker status, reliability, response time
        if (a.circuitBreaker.isOpen !== b.circuitBreaker.isOpen) {
          return a.circuitBreaker.isOpen ? 1 : -1;
        }
        if (a.config.reliability !== b.config.reliability) {
          return b.config.reliability - a.config.reliability;
        }
        return a.averageResponseTime - b.averageResponseTime;
      });

    // Test the best connections
    for (const connection of healthyConnections.slice(0, 3)) {
      try {
        await this.testConnection(connection);
        return connection;
      } catch (error) {
        console.warn(`Connection test failed for ${connection.endpoint}:`, error);
        this.recordFailure(connection, error);
      }
    }

    return null;
  }

  // Test connection health
  private async testConnection(connectionState: ConnectionState): Promise<void> {
    const startTime = Date.now();
    
    try {
      const slot = await connectionState.connection.getSlot();
      const responseTime = Date.now() - startTime;
      
      this.recordSuccess(connectionState, responseTime);
      
      console.log(`✅ Connection test successful for ${connectionState.endpoint} (${responseTime}ms)`);
    } catch (error) {
      throw error;
    }
  }

  // Check if connection is healthy
  private isConnectionHealthy(connectionState: ConnectionState): boolean {
    const now = Date.now();
    
    // Check circuit breaker
    if (connectionState.circuitBreaker.isOpen) {
      const timeSinceLastFailure = now - connectionState.circuitBreaker.lastFailureTime;
      if (timeSinceLastFailure < this.CIRCUIT_BREAKER_TIMEOUT) {
        return false;
      }
      // Reset circuit breaker
      connectionState.circuitBreaker.isOpen = false;
      connectionState.circuitBreaker.failureCount = 0;
    }

    // Check rate limiting
    const timeSinceLastRequest = now - connectionState.lastRequestTime;
    const requestsPerMinute = 60000 / connectionState.config.rateLimit;
    if (timeSinceLastRequest < requestsPerMinute) {
      return false;
    }

    // Check response time
    if (connectionState.averageResponseTime > this.MAX_RESPONSE_TIME) {
      return false;
    }

    return connectionState.isHealthy;
  }

  // Record successful request
  private recordSuccess(connectionState: ConnectionState, responseTime: number) {
    const circuitBreaker = connectionState.circuitBreaker;
    circuitBreaker.successCount++;
    circuitBreaker.lastSuccessTime = Date.now();
    circuitBreaker.failureCount = Math.max(0, circuitBreaker.failureCount - 1);
    
    // Update average response time
    const totalRequests = connectionState.requestCount;
    connectionState.averageResponseTime = 
      (connectionState.averageResponseTime * totalRequests + responseTime) / (totalRequests + 1);
    
    connectionState.requestCount++;
    connectionState.lastRequestTime = Date.now();
    connectionState.isHealthy = true;
  }

  // Record failed request
  private recordFailure(connectionState: ConnectionState, error: any) {
    const circuitBreaker = connectionState.circuitBreaker;
    circuitBreaker.failureCount++;
    circuitBreaker.lastFailureTime = Date.now();
    
    // Open circuit breaker if threshold exceeded
    if (circuitBreaker.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      circuitBreaker.isOpen = true;
      console.warn(`🚨 Circuit breaker opened for ${connectionState.endpoint}`);
    }
    
    connectionState.isHealthy = false;
    
    console.error(`❌ Connection failed for ${connectionState.endpoint}:`, error);
  }

  // Start periodic health checks
  private startHealthChecks() {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  // Perform health checks on all connections
  private async performHealthChecks() {
    console.log('🔍 Performing health checks on RPC connections...');
    
    const healthCheckPromises = Array.from(this.connections.values()).map(async (connectionState) => {
      try {
        await this.testConnection(connectionState);
      } catch (error) {
        this.recordFailure(connectionState, error);
      }
    });

    await Promise.allSettled(healthCheckPromises);
  }

  // Get connection status for monitoring
  getConnectionStatus() {
    const status = Array.from(this.connections.values()).map(conn => ({
      endpoint: conn.endpoint,
      tier: conn.config.tier,
      reliability: conn.config.reliability,
      isHealthy: conn.isHealthy,
      circuitBreakerOpen: conn.circuitBreaker.isOpen,
      failureCount: conn.circuitBreaker.failureCount,
      successCount: conn.circuitBreaker.successCount,
      averageResponseTime: conn.averageResponseTime,
      requestCount: conn.requestCount,
    }));

    return {
      totalConnections: this.connections.size,
      healthyConnections: status.filter(s => s.isHealthy).length,
      currentConnection: this.currentConnection?.endpoint || null,
      connections: status,
    };
  }

  // Cleanup
  destroy() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Global instance
const productionRpcManager = new ProductionRpcManager();

// Export functions
export async function getProductionConnection(): Promise<Connection> {
  return productionRpcManager.getConnection();
}

export function getProductionConnectionStatus() {
  return productionRpcManager.getConnectionStatus();
}

export function destroyProductionRpcManager() {
  productionRpcManager.destroy();
}

// Test all production endpoints
export async function testProductionEndpoints() {
  const results = [];
  
  for (const config of PRODUCTION_ENDPOINTS) {
    try {
      const connection = new Connection(config.endpoint, 'confirmed');
      const startTime = Date.now();
      
      const slot = await connection.getSlot();
      const responseTime = Date.now() - startTime;
      
      results.push({
        endpoint: config.endpoint,
        tier: config.tier,
        reliability: config.reliability,
        success: true,
        slot,
        responseTime,
        timeout: config.timeout,
      });
      
    } catch (error) {
      results.push({
        endpoint: config.endpoint,
        tier: config.tier,
        reliability: config.reliability,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timeout: config.timeout,
      });
    }
  }
  
  return results;
}
