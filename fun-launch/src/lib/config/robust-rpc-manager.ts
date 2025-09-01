// Robust RPC Manager for handling IP blocking and rate limiting
// This implements multiple strategies to avoid 403 errors

import { Connection } from '@solana/web3.js';
import { RPC_ENDPOINTS, RpcConfig } from './rpc-config';

interface ConnectionStatus {
  endpoint: string;
  isWorking: boolean;
  lastTest: number;
  errorCount: number;
  responseTime: number;
}

export class RobustRpcManager {
  private connections: Map<string, Connection> = new Map();
  private status: Map<string, ConnectionStatus> = new Map();
  private currentEndpoint: string | null = null;
  private retryAttempts: number = 0;
  private maxRetries: number = 5;

  constructor() {
    this.initializeEndpoints();
  }

  private initializeEndpoints() {
    RPC_ENDPOINTS.forEach(config => {
      this.status.set(config.endpoint, {
        endpoint: config.endpoint,
        isWorking: true,
        lastTest: 0,
        errorCount: 0,
        responseTime: 0,
      });
    });
  }

  // Get the best available connection
  async getConnection(): Promise<Connection> {
    // Try to get a working connection
    const workingEndpoint = await this.findWorkingEndpoint();
    
    if (workingEndpoint) {
      this.currentEndpoint = workingEndpoint;
      return this.getOrCreateConnection(workingEndpoint);
    }

    // If no working endpoint, try to recover
    return this.recoverConnection();
  }

  // Find a working endpoint
  private async findWorkingEndpoint(): Promise<string | null> {
    const sortedEndpoints = this.getSortedEndpoints();
    
    for (const endpoint of sortedEndpoints) {
      if (await this.testEndpoint(endpoint)) {
        return endpoint;
      }
    }
    
    return null;
  }

  // Get endpoints sorted by reliability
  private getSortedEndpoints(): string[] {
    const endpoints = Array.from(this.status.entries())
      .filter(([_, status]) => status.isWorking)
      .sort((a, b) => {
        // Sort by error count (ascending), then by last test time (descending)
        if (a[1].errorCount !== b[1].errorCount) {
          return a[1].errorCount - b[1].errorCount;
        }
        return b[1].lastTest - a[1].lastTest;
      })
      .map(([endpoint, _]) => endpoint);

    return endpoints;
  }

  // Test if an endpoint is working
  private async testEndpoint(endpoint: string): Promise<boolean> {
    const status = this.status.get(endpoint);
    if (!status) return false;

    // Don't test too frequently
    const now = Date.now();
    if (now - status.lastTest < 5000) { // 5 seconds
      return status.isWorking;
    }

    try {
      const connection = this.getOrCreateConnection(endpoint);
      const startTime = Date.now();
      
      // Test with a simple call and timeout
      const slotPromise = connection.getSlot();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 10000)
      );
      
      await Promise.race([slotPromise, timeoutPromise]);
      
      const responseTime = Date.now() - startTime;
      
      // Update status
      status.isWorking = true;
      status.lastTest = now;
      status.errorCount = 0;
      status.responseTime = responseTime;
      
      console.log(`✅ Endpoint ${endpoint} is working (${responseTime}ms)`);
      return true;
      
    } catch (error) {
      console.error(`❌ Endpoint ${endpoint} failed:`, error);
      
      // Update status
      status.isWorking = false;
      status.lastTest = now;
      status.errorCount++;
      
      // Check if it's a 403 error (IP blocked)
      if (error instanceof Error && (
        error.message.includes('403') || 
        error.message.includes('Access forbidden') ||
        error.message.includes('Failed to fetch')
      )) {
        console.warn(`🚫 IP likely blocked for ${endpoint}, marking as unavailable`);
        status.errorCount = 999; // Mark as heavily penalized
      }
      
      return false;
    }
  }

  // Get or create a connection for an endpoint
  private getOrCreateConnection(endpoint: string): Connection {
    if (!this.connections.has(endpoint)) {
      const config = RPC_ENDPOINTS.find(rpc => rpc.endpoint === endpoint);
      const connection = new Connection(endpoint, 'confirmed');
      this.connections.set(endpoint, connection);
    }
    return this.connections.get(endpoint)!;
  }

  // Recover connection with exponential backoff
  private async recoverConnection(): Promise<Connection> {
    this.retryAttempts++;
    
    if (this.retryAttempts > this.maxRetries) {
      // Try one last time with a different approach
      console.log('🔄 All retries exhausted, trying alternative approach...');
      return this.tryAlternativeApproach();
    }

    // Exponential backoff
    const delay = Math.min(1000 * Math.pow(2, this.retryAttempts), 30000);
    console.log(`🔄 Retrying RPC connection in ${delay}ms (attempt ${this.retryAttempts}/${this.maxRetries})`);
    
    await new Promise(resolve => setTimeout(resolve, delay));

    // Reset all endpoints and try again
    this.resetAllEndpoints();
    return this.getConnection();
  }

  // Try alternative approach when all endpoints fail
  private async tryAlternativeApproach(): Promise<Connection> {
    console.log('🔄 Trying alternative RPC endpoints...');
    
    // Try some alternative endpoints that might work
    const alternativeEndpoints = [
      'https://solana-api.projectserum.com',
      'https://solana.public-rpc.com',
      'https://api.mainnet-beta.solana.com',
    ];

    for (const endpoint of alternativeEndpoints) {
      try {
        console.log(`🔄 Trying alternative endpoint: ${endpoint}`);
        const connection = new Connection(endpoint, 'confirmed');
        
        // Test with timeout
        const slotPromise = connection.getSlot();
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 15000)
        );
        
        await Promise.race([slotPromise, timeoutPromise]);
        
        console.log(`✅ Alternative endpoint ${endpoint} is working`);
        this.currentEndpoint = endpoint;
        return connection;
        
      } catch (error) {
        console.error(`❌ Alternative endpoint ${endpoint} failed:`, error);
      }
    }
    
    throw new Error('All RPC endpoints are unavailable. Please try again later or use a different network.');
  }

  // Reset all endpoints to try again
  private resetAllEndpoints() {
    this.status.forEach(status => {
      status.isWorking = true;
      status.errorCount = Math.max(0, status.errorCount - 1); // Reduce error count
    });
  }

  // Get current connection status
  getStatus(): ConnectionStatus[] {
    return Array.from(this.status.values());
  }

  // Get current working endpoint
  getCurrentEndpoint(): string | null {
    return this.currentEndpoint;
  }

  // Force test all endpoints
  async testAllEndpoints(): Promise<ConnectionStatus[]> {
    const promises = Array.from(this.status.keys()).map(endpoint => this.testEndpoint(endpoint));
    await Promise.all(promises);
    return this.getStatus();
  }

  // Get connection with specific endpoint
  async getConnectionWithEndpoint(endpoint: string): Promise<Connection> {
    if (await this.testEndpoint(endpoint)) {
      this.currentEndpoint = endpoint;
      return this.getOrCreateConnection(endpoint);
    }
    throw new Error(`Endpoint ${endpoint} is not available`);
  }
}

// Global instance
export const robustRpcManager = new RobustRpcManager();

// Convenience function
export async function getRobustConnection(): Promise<Connection> {
  return robustRpcManager.getConnection();
}
