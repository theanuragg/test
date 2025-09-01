// Simple RPC Configuration
// This provides a straightforward approach to avoid 403 errors

import { Connection } from '@solana/web3.js';

// Simple list of reliable endpoints (ordered by reliability)
const SIMPLE_ENDPOINTS = [
  'https://solana-api.projectserum.com',
  'https://solana.public-rpc.com',
  'https://api.mainnet-beta.solana.com',
  'https://solana.getblock.io/mainnet/',
  'https://solana.rpc.extrnode.com',
];

// Simple connection cache
let cachedConnection: Connection | null = null;
let lastConnectionTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Get a simple connection
export async function getSimpleConnection(): Promise<Connection> {
  // Return cached connection if still valid
  if (cachedConnection && (Date.now() - lastConnectionTime) < CACHE_DURATION) {
    return cachedConnection;
  }

  // Try each endpoint
  for (const endpoint of SIMPLE_ENDPOINTS) {
    try {
      console.log(`Trying simple endpoint: ${endpoint}`);
      
      const connection = new Connection(endpoint, 'confirmed');
      
      // Test the connection with improved timeout and retry logic
      const slot = await testConnectionWithRetry(connection, endpoint);
      
      // Cache the working connection
      cachedConnection = connection;
      lastConnectionTime = Date.now();
      
      console.log(`✅ Using simple endpoint: ${endpoint}`);
      return connection;
      
    } catch (error) {
      console.error(`❌ Simple endpoint ${endpoint} failed:`, error);
    }
  }
  
  throw new Error('No working RPC endpoints found. Please try again later.');
}

// Test all simple endpoints
export async function testSimpleEndpoints() {
  const results = [];
  
  for (const endpoint of SIMPLE_ENDPOINTS) {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      const startTime = Date.now();
      
      // Use the same retry logic for testing
      const slot = await testConnectionWithRetry(connection, endpoint, 1); // Only 1 retry for testing
      const responseTime = Date.now() - startTime;
      
      results.push({
        endpoint,
        success: true,
        slot,
        responseTime,
      });
      
    } catch (error) {
      results.push({
        endpoint,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
  
  return results;
}

// Test connection with improved retry logic and longer timeouts
async function testConnectionWithRetry(connection: Connection, endpoint: string, maxRetries = 3): Promise<number> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Use longer timeout for better reliability
      const timeout = Math.max(8000, 10000 - (attempt * 1000)); // 10s, 9s, 8s
      
      console.log(`🔄 Testing ${endpoint} (attempt ${attempt + 1}/${maxRetries + 1}) with ${timeout}ms timeout`);
      
      const slotPromise = connection.getSlot();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout after ${timeout}ms`)), timeout)
      );
      
      const slot = await Promise.race([slotPromise, timeoutPromise]);
      console.log(`✅ Endpoint ${endpoint} responded successfully (attempt ${attempt + 1})`);
      return slot;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.warn(`⚠️ Endpoint ${endpoint} failed (attempt ${attempt + 1}): ${errorMessage}`);
      
      if (attempt === maxRetries) {
        throw new Error(`Failed to connect to ${endpoint} after ${maxRetries + 1} attempts: ${errorMessage}`);
      }
      
      // Wait before retry (exponential backoff with jitter)
      const baseWaitTime = Math.min(1000 * Math.pow(2, attempt), 5000);
      const jitter = Math.random() * 1000; // Add up to 1 second of random jitter
      const waitTime = baseWaitTime + jitter;
      
      console.log(`🔄 Retrying ${endpoint} in ${Math.round(waitTime)}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error(`Failed to connect to ${endpoint} after ${maxRetries + 1} attempts`);
}

// Clear cache
export function clearSimpleCache() {
  cachedConnection = null;
  lastConnectionTime = 0;
}
