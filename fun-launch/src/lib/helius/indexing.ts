/**
 * Helius Indexing Services
 * 
 * Comprehensive integration with Helius APIs for enhanced blockchain data indexing
 * Includes transaction history, token metadata, NFT data, and real-time indexing
 * 
 * Documentation: https://www.helius.dev/docs/data-streaming
 */

// Import streaming capabilities
import { LaserStreamClient, createLaserStreamClient, LASERSTREAM_ENDPOINTS } from './laserstream';
import { EnhancedWebSocketClient, createEnhancedWebSocketClient, ENHANCED_WEBSOCKET_ENDPOINTS } from './enhanced-websockets';

// Helius API Endpoints
const HELIUS_ENDPOINTS = {
  // Main API (requires API key)
  MAIN: 'https://api.helius.xyz/v0',
  
  // Enhanced APIs
  ENHANCED_TRANSACTIONS: 'https://api.helius.xyz/v0/transactions',
  ENHANCED_TOKEN_METADATA: 'https://api.helius.xyz/v0/token-metadata',
  ENHANCED_ADDRESSES: 'https://api.helius.xyz/v0/addresses',
  ENHANCED_NFT: 'https://api.helius.xyz/v0/nft',
  
  // Webhook endpoints
  WEBHOOK: 'https://api.helius.xyz/v0/webhooks',
  
  // RPC endpoints
  RPC: 'https://rpc.helius.xyz',
} as const;

// Enhanced types for Helius API responses
export interface HeliusTransaction {
  signature: string;
  slot: number;
  blockTime: number;
  meta: {
    err: any;
    fee: number;
    preBalances: number[];
    postBalances: number[];
    innerInstructions: any[];
    logMessages: string[];
    preTokenBalances: any[];
    postTokenBalances: any[];
    rewards: any[];
  };
  transaction: {
    message: {
      accountKeys: string[];
      recentBlockhash: string;
      instructions: any[];
    };
    signatures: string[];
  };
  events?: {
    nft?: any;
    swap?: any;
    transfer?: any;
    defi?: any;
  };
}

export interface HeliusTokenMetadata {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: Array<{
    address: string;
    verified: boolean;
    share: number;
  }>;
  collection: {
    name: string;
    family: string;
  };
  uses: {
    useMethod: string;
    remaining: number;
    total: number;
  };
  decimals: number;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  properties: {
    files: Array<{
      type: string;
      uri: string;
    }>;
    category: string;
  };
  // Enhanced fields
  offChainData?: any;
  onChainData?: any;
  verified?: boolean;
  supply?: number;
  marketCap?: number;
}

export interface HeliusAddressInfo {
  account: string;
  nativeBalanceChange: number;
  tokenBalanceChanges: Array<{
    mint: string;
    rawTokenAmount: {
      tokenAmount: string;
      decimals: number;
    };
    userAccount: string;
  }>;
  // Enhanced fields
  balance?: number;
  owner?: string;
  executable?: boolean;
  rentEpoch?: number;
}

export interface HeliusNFTMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
  properties: {
    files: Array<{
      type: string;
      uri: string;
    }>;
    category: string;
    creators: Array<{
      address: string;
      verified: boolean;
      share: number;
    }>;
  };
  // Enhanced fields
  collection?: {
    name: string;
    family: string;
  };
  uses?: {
    useMethod: string;
    remaining: number;
    total: number;
  };
  sellerFeeBasisPoints?: number;
}

export interface HeliusWebhookConfig {
  webhookURL: string;
  transactionTypes: string[];
  accountDataFilters?: Array<{
    memcmp: {
      offset: number;
      bytes: string;
    };
  }>;
  accountIncludeFilters?: string[];
  accountExcludeFilters?: string[];
  // Enhanced fields
  webhookName?: string;
  authHeader?: string;
  transactionTypeFilter?: string[];
  accountFilter?: {
    include?: string[];
    exclude?: string[];
  };
}

// Enhanced Transaction Service with better error handling and rate limiting
export class HeliusTransactionService {
  private apiKey: string;
  private baseUrl: string;
  private rateLimitDelay: number = 100; // ms between requests

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = HELIUS_ENDPOINTS.ENHANCED_TRANSACTIONS;
  }

  /**
   * Get enhanced transaction data with rate limiting
   */
  async getTransaction(signature: string): Promise<HeliusTransaction | null> {
    try {
      await this.rateLimit();
      
      const response = await fetch(`${this.baseUrl}?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: [signature],
        }),
      });

      if (!response.ok) {
        throw new Error(`Transaction API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching transaction:', error);
      return null;
    }
  }

  /**
   * Get multiple enhanced transactions with batch processing
   */
  async getTransactions(signatures: string[]): Promise<HeliusTransaction[]> {
    try {
      await this.rateLimit();
      
      const response = await fetch(`${this.baseUrl}?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactions: signatures,
        }),
      });

      if (!response.ok) {
        throw new Error(`Transaction API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching transactions:', error);
      return [];
    }
  }

  /**
   * Get transaction history for an address with enhanced filtering
   */
  async getAddressHistory(
    address: string, 
    limit: number = 100,
    options?: {
      before?: string;
      until?: string;
      transactionTypes?: string[];
    }
  ): Promise<HeliusTransaction[]> {
    try {
      await this.rateLimit();
      
      const requestBody: any = {
        query: {
          accounts: [address],
        },
        options: {
          limit,
        },
      };

      if (options?.before) {
        requestBody.query.before = options.before;
      }
      if (options?.until) {
        requestBody.query.until = options.until;
      }
      if (options?.transactionTypes) {
        requestBody.query.transactionTypes = options.transactionTypes;
      }

      const response = await fetch(`${this.baseUrl}?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Transaction history API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching address history:', error);
      return [];
    }
  }

  /**
   * Rate limiting helper
   */
  private async rateLimit(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }
}

// Enhanced Token Metadata Service with better caching and error handling
export class HeliusTokenMetadataService {
  private apiKey: string;
  private baseUrl: string;
  private cache: Map<string, { data: HeliusTokenMetadata; timestamp: number }> = new Map();
  private cacheTimeout: number = 5 * 60 * 1000; // 5 minutes

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = HELIUS_ENDPOINTS.ENHANCED_TOKEN_METADATA;
  }

  /**
   * Get enhanced token metadata with caching
   */
  async getTokenMetadata(mintAddress: string): Promise<HeliusTokenMetadata | null> {
    // Check cache first
    const cached = this.cache.get(mintAddress);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.baseUrl}?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintAccounts: [mintAddress],
          includeOffChain: true,
          disableCache: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token metadata API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      const metadata = data[0] || null;

      // Cache the result
      if (metadata) {
        this.cache.set(mintAddress, { data: metadata, timestamp: Date.now() });
      }

      return metadata;
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return null;
    }
  }

  /**
   * Get metadata for multiple tokens with batch processing
   */
  async getMultipleTokenMetadata(mintAddresses: string[]): Promise<HeliusTokenMetadata[]> {
    try {
      const response = await fetch(`${this.baseUrl}?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintAccounts: mintAddresses,
          includeOffChain: true,
          disableCache: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token metadata API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the results
      data.forEach((metadata: HeliusTokenMetadata, index: number) => {
        if (metadata) {
          this.cache.set(mintAddresses[index], { data: metadata, timestamp: Date.now() });
        }
      });

      return data || [];
    } catch (error) {
      console.error('Error fetching multiple token metadata:', error);
      return [];
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// Enhanced Address Service with better error handling
export class HeliusAddressService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = HELIUS_ENDPOINTS.ENHANCED_ADDRESSES;
  }

  /**
   * Get enhanced address information
   */
  async getAddressInfo(address: string): Promise<HeliusAddressInfo | null> {
    try {
      const response = await fetch(`${this.baseUrl}?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: [address],
        }),
      });

      if (!response.ok) {
        throw new Error(`Address API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching address info:', error);
      return null;
    }
  }

  /**
   * Get token balances for an address
   */
  async getTokenBalances(address: string): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/token-balances?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accounts: [address],
        }),
      });

      if (!response.ok) {
        throw new Error(`Token balances API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data[0]?.tokens || [];
    } catch (error) {
      console.error('Error fetching token balances:', error);
      return [];
    }
  }
}

// Enhanced NFT Service with better error handling
export class HeliusNFTService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = HELIUS_ENDPOINTS.ENHANCED_NFT;
  }

  /**
   * Get NFT metadata
   */
  async getNFTMetadata(mintAddress: string): Promise<HeliusNFTMetadata | null> {
    try {
      const response = await fetch(`${this.baseUrl}/metadata?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintAccounts: [mintAddress],
          includeOffChain: true,
          disableCache: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`NFT metadata API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
      return null;
    }
  }

  /**
   * Get NFT collection data
   */
  async getNFTCollection(collectionAddress: string): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/collections?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collections: [collectionAddress],
        }),
      });

      if (!response.ok) {
        throw new Error(`NFT collection API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching NFT collection:', error);
      return null;
    }
  }
}

// Enhanced Webhook Service with better error handling
export class HeliusWebhookService {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = HELIUS_ENDPOINTS.WEBHOOK;
  }

  /**
   * Create a webhook for real-time data
   */
  async createWebhook(config: HeliusWebhookConfig): Promise<{ webhookID: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}?api-key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Webhook creation error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error creating webhook:', error);
      return null;
    }
  }

  /**
   * Get all webhooks for the API key
   */
  async getWebhooks(): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}?api-key=${this.apiKey}`);

      if (!response.ok) {
        throw new Error(`Webhook fetch error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      return data || [];
    } catch (error) {
      console.error('Error fetching webhooks:', error);
      return [];
    }
  }

  /**
   * Delete a webhook
   */
  async deleteWebhook(webhookID: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${webhookID}?api-key=${this.apiKey}`, {
        method: 'DELETE',
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting webhook:', error);
      return false;
    }
  }
}

/**
 * Enhanced Helius Indexing Manager
 * Centralized service for all Helius indexing operations with streaming capabilities
 */
export class HeliusIndexingManager {
  public transactions: HeliusTransactionService;
  public tokens: HeliusTokenMetadataService;
  public addresses: HeliusAddressService;
  public nfts: HeliusNFTService;
  public webhooks: HeliusWebhookService;
  
  // Streaming capabilities
  private laserStreamClient: LaserStreamClient | null = null;
  private enhancedWebSocketClient: EnhancedWebSocketClient | null = null;

  constructor(apiKey: string) {
    this.transactions = new HeliusTransactionService(apiKey);
    this.tokens = new HeliusTokenMetadataService(apiKey);
    this.addresses = new HeliusAddressService(apiKey);
    this.nfts = new HeliusNFTService(apiKey);
    this.webhooks = new HeliusWebhookService(apiKey);
  }

  /**
   * Initialize LaserStream client
   */
  initializeLaserStream(
    network: 'mainnet' | 'devnet' = 'mainnet',
    region: keyof typeof LASERSTREAM_ENDPOINTS.MAINNET = 'ewr'
  ): LaserStreamClient {
    if (!this.laserStreamClient) {
      this.laserStreamClient = createLaserStreamClient(
        this.transactions['apiKey'] || '',
        network,
        region
      );
    }
    return this.laserStreamClient;
  }

  /**
   * Initialize Enhanced WebSocket client
   */
  initializeEnhancedWebSocket(network: 'mainnet' | 'devnet' = 'mainnet'): EnhancedWebSocketClient {
    if (!this.enhancedWebSocketClient) {
      this.enhancedWebSocketClient = createEnhancedWebSocketClient(
        this.transactions['apiKey'] || '',
        network
      );
    }
    return this.enhancedWebSocketClient;
  }

  /**
   * Get comprehensive token data including metadata and recent transactions
   */
  async getComprehensiveTokenData(mintAddress: string): Promise<{
    metadata: HeliusTokenMetadata | null;
    recentTransactions: HeliusTransaction[];
    tokenBalances: any[];
  }> {
    const [metadata, transactions, balances] = await Promise.all([
      this.tokens.getTokenMetadata(mintAddress),
      this.transactions.getAddressHistory(mintAddress, 10),
      this.addresses.getTokenBalances(mintAddress),
    ]);

    return {
      metadata,
      recentTransactions: transactions,
      tokenBalances: balances,
    };
  }

  /**
   * Set up real-time monitoring for a token
   */
  async setupTokenMonitoring(
    mintAddress: string,
    webhookUrl: string
  ): Promise<{ webhookID: string } | null> {
    const webhookConfig: HeliusWebhookConfig = {
      webhookURL: webhookUrl,
      transactionTypes: ['transfer', 'swap', 'mint', 'burn'],
      accountIncludeFilters: [mintAddress],
    };

    return await this.webhooks.createWebhook(webhookConfig);
  }

  /**
   * Get transaction events for DeFi operations
   */
  async getDeFiEvents(address: string, limit: number = 50): Promise<HeliusTransaction[]> {
    const transactions = await this.transactions.getAddressHistory(address, limit, {
      transactionTypes: ['swap', 'transfer', 'defi']
    });
    
    // Filter for DeFi-related transactions
    return transactions.filter(tx => 
      tx.events?.swap || 
      tx.events?.transfer ||
      tx.events?.defi ||
      tx.transaction.message.instructions.some(ix => 
        ix.programId && (
          ix.programId.includes('JUP') ||
          ix.programId.includes('METEORA') ||
          ix.programId.includes('RAYDIUM')
        )
      )
    );
  }

  /**
   * Get streaming client for real-time data
   */
  getLaserStreamClient(): LaserStreamClient | null {
    return this.laserStreamClient;
  }

  /**
   * Get enhanced WebSocket client
   */
  getEnhancedWebSocketClient(): EnhancedWebSocketClient | null {
    return this.enhancedWebSocketClient;
  }
}

// Export singleton instance (requires API key to be set)
let heliusInstance: HeliusIndexingManager | null = null;

export function initializeHelius(apiKey: string): HeliusIndexingManager {
  if (!heliusInstance) {
    heliusInstance = new HeliusIndexingManager(apiKey);
  }
  return heliusInstance;
}

export function getHeliusInstance(): HeliusIndexingManager | null {
  return heliusInstance;
}

// Export streaming utilities
export {
  LaserStreamClient,
  createLaserStreamClient,
  LASERSTREAM_ENDPOINTS,
  EnhancedWebSocketClient,
  createEnhancedWebSocketClient,
  ENHANCED_WEBSOCKET_ENDPOINTS,
};
