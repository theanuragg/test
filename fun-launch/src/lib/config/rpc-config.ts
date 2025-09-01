// RPC Configuration for Solana connections
// This helps avoid 403 errors by using reliable endpoints and implementing rate limiting

export interface RpcConfig {
  endpoint: string;
  rateLimit: number; // requests per second
  retryDelay: number; // milliseconds
  maxRetries: number;
}

// Reliable RPC endpoints (free tier, no API key required)
// Ordered by reliability and rate limit tolerance
export const RPC_ENDPOINTS: RpcConfig[] = [
  {
    endpoint: 'https://solana-api.projectserum.com',
    rateLimit: 800,
    retryDelay: 1200,
    maxRetries: 3,
  },
  {
    endpoint: 'https://solana.public-rpc.com',
    rateLimit: 500,
    retryDelay: 2000,
    maxRetries: 3,
  },
  {
    endpoint: 'https://solana.getblock.io/mainnet/',
    rateLimit: 400,
    retryDelay: 2500,
    maxRetries: 3,
  },
  {
    endpoint: 'https://solana.rpc.extrnode.com',
    rateLimit: 300,
    retryDelay: 3000,
    maxRetries: 2,
  },
  // Fallback to original (may be blocked)
  {
    endpoint: 'https://api.mainnet-beta.solana.com',
    rateLimit: 200,
    retryDelay: 3000,
    maxRetries: 2,
  },
];

// Get the best available RPC endpoint
export function getBestRpcEndpoint(): string {
  // Check environment variable first
  const envRpc = process.env.NEXT_PUBLIC_SOLANA_RPC_URL;
  if (envRpc) {
    return envRpc;
  }
  
  // Return the first reliable endpoint
  return RPC_ENDPOINTS[0].endpoint;
}

// Rate limiting utility
export class RpcRateLimiter {
  private requestCount: number = 0;
  private lastReset: number = Date.now();
  private readonly rateLimit: number;
  private readonly retryDelay: number;

  constructor(config: RpcConfig) {
    this.rateLimit = config.rateLimit;
    this.retryDelay = config.retryDelay;
  }

  async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    
    // Reset counter if 1 second has passed
    if (now - this.lastReset >= 1000) {
      this.requestCount = 0;
      this.lastReset = now;
    }

    // If we've hit the rate limit, wait
    if (this.requestCount >= this.rateLimit) {
      const waitTime = 1000 - (now - this.lastReset);
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitForRateLimit(); // Recursive call after waiting
      }
    }

    this.requestCount++;
  }
}

// Create a rate-limited connection
export function createRateLimitedConnection(endpoint: string, config: RpcConfig) {
  const rateLimiter = new RpcRateLimiter(config);
  
  // Create a proxy connection that respects rate limits
  const connection = new (require('@solana/web3.js').Connection)(endpoint, 'confirmed');
  
  // Override methods to add rate limiting
  const originalGetAccountInfo = connection.getAccountInfo.bind(connection);
  const originalGetSlot = connection.getSlot.bind(connection);
  
  connection.getAccountInfo = async (...args: any[]) => {
    await rateLimiter.waitForRateLimit();
    return originalGetAccountInfo(...args);
  };
  
  connection.getSlot = async (...args: any[]) => {
    await rateLimiter.waitForRateLimit();
    return originalGetSlot(...args);
  };
  
  return connection;
}

