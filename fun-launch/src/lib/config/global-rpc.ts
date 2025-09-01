// Global RPC Configuration
// This file provides a centralized way to manage Solana RPC connections
// and avoid 403 errors across the entire application

import { Connection } from '@solana/web3.js';
import { getBestRpcEndpoint, RPC_ENDPOINTS, createRateLimitedConnection } from './rpc-config';

// Global connection instance
let globalConnection: Connection | null = null;
let currentEndpoint: string = '';

// Get or create a global connection
export function getGlobalConnection(): Connection {
  if (!globalConnection) {
    const endpoint = getBestRpcEndpoint();
    const config = RPC_ENDPOINTS.find(rpc => rpc.endpoint === endpoint) || RPC_ENDPOINTS[0];
    globalConnection = createRateLimitedConnection(endpoint, config);
    currentEndpoint = endpoint;
  }
  return globalConnection;
}

// Reset global connection (useful for testing or switching endpoints)
export function resetGlobalConnection(): void {
  globalConnection = null;
  currentEndpoint = '';
}

// Get current endpoint
export function getCurrentEndpoint(): string {
  return currentEndpoint;
}

// Create a new connection with specific endpoint
export function createConnection(endpoint?: string): Connection {
  const targetEndpoint = endpoint || getBestRpcEndpoint();
  const config = RPC_ENDPOINTS.find(rpc => rpc.endpoint === targetEndpoint) || RPC_ENDPOINTS[0];
  return createRateLimitedConnection(targetEndpoint, config);
}

// Test connection health
export async function testConnection(connection: Connection): Promise<boolean> {
  try {
    await connection.getSlot();
    return true;
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

// Get connection status
export function getConnectionStatus(): { isConnected: boolean; endpoint: string } {
  return {
    isConnected: globalConnection !== null,
    endpoint: currentEndpoint,
  };
}
