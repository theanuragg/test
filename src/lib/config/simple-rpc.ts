// Ultra-Aggressive Simple RPC Manager
// Designed to handle extremely slow/unreliable public RPC endpoints

import { Connection } from '@solana/web3.js';
import { createMockConnection } from './mock-rpc';

// Ultra-reliable endpoints (ordered by speed and reliability)
const ULTRA_ENDPOINTS = [
  'https://solana-api.projectserum.com',
  'https://solana.public-rpc.com',
  'https://api.mainnet-beta.solana.com',
  'https://solana.getblock.io/mainnet/',
  'https://solana.rpc.extrnode.com',
  'https://rpc.ankr.com/solana',
];

// Connection cache
let cachedConnection: Connection | null = null;
let lastConnectionTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

// Ultra-aggressive timeout strategy
const ULTRA_TIMEOUTS = [1000, 2000, 3000]; // 1s, 2s, 3s timeouts

export async function getSimpleConnection(): Promise<Connection> {
  // Return cached connection if still valid
  if (cachedConnection && (Date.now() - lastConnectionTime) < CACHE_DURATION) {
    return cachedConnection;
  }

  // Try each endpoint with ultra-aggressive timeouts
  for (const endpoint of ULTRA_ENDPOINTS) {
    try {
      console.log(`🚀 Trying ultra-fast endpoint: ${endpoint}`);
      const connection = new Connection(endpoint, 'confirmed');
      
      // Test with ultra-short timeout
      const slot = await testConnectionUltraFast(connection, endpoint);
      
      // Cache the working connection
      cachedConnection = connection;
      lastConnectionTime = Date.now();
      
      console.log(`✅ Using ultra-fast endpoint: ${endpoint} (slot: ${slot})`);
      return connection;
      
    } catch (error) {
      console.warn(`❌ Ultra-fast endpoint ${endpoint} failed:`, error instanceof Error ? error.message : 'Unknown error');
      continue;
    }
  }
  
  console.warn('⚠️ All ultra-fast RPC endpoints failed, falling back to mock connection for development');
  return createMockConnection();
}

// Ultra-fast connection test with progressive timeouts
async function testConnectionUltraFast(connection: Connection, endpoint: string): Promise<number> {
  for (let attempt = 0; attempt < ULTRA_TIMEOUTS.length; attempt++) {
    try {
      const timeout = ULTRA_TIMEOUTS[attempt];
      
      const slotPromise = connection.getSlot();
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error(`Ultra-fast timeout after ${timeout}ms`)), timeout)
      );
      
      const slot = await Promise.race([slotPromise, timeoutPromise]);
      console.log(`⚡ Endpoint ${endpoint} responded in ${timeout}ms (attempt ${attempt + 1})`);
      return slot;
      
    } catch (error) {
      console.warn(`⚠️ Ultra-fast endpoint ${endpoint} failed (attempt ${attempt + 1}):`, error instanceof Error ? error.message : 'Unknown error');
      
      if (attempt === ULTRA_TIMEOUTS.length - 1) {
        throw error;
      }
      
      // Minimal wait between attempts
      const waitTime = Math.min(500 * Math.pow(2, attempt), 1000);
      console.log(`🔄 Retrying ${endpoint} in ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  throw new Error(`Failed to connect to ${endpoint} after ${ULTRA_TIMEOUTS.length} ultra-fast attempts`);
}

// Test all endpoints with ultra-fast strategy
export async function testSimpleEndpoints(): Promise<Array<{endpoint: string, success: boolean, responseTime?: number, error?: string}>> {
  const results = [];
  
  for (const endpoint of ULTRA_ENDPOINTS) {
    try {
      const startTime = Date.now();
      const connection = new Connection(endpoint, 'confirmed');
      
      // Use ultra-fast test
      const slot = await testConnectionUltraFast(connection, endpoint);
      const responseTime = Date.now() - startTime;
      
      results.push({
        endpoint,
        success: true,
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

// Clear connection cache
export function clearConnectionCache(): void {
  cachedConnection = null;
  lastConnectionTime = 0;
  console.log('🧹 Connection cache cleared');
}
