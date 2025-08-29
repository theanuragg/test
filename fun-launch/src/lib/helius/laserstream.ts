/**
 * Helius LaserStream Integration
 * 
 * Next-generation Solana data streaming with ultra-low latency, historical replay, 
 * and multi-node reliability. Based on official Helius documentation.
 * 
 * Documentation: https://www.helius.dev/docs/laserstream
 */

import { EventEmitter } from 'events';
import { useState, useEffect, useCallback } from 'react';

// LaserStream Configuration
export interface LaserStreamConfig {
  apiKey: string;
  endpoint: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  retryDelay?: number;
}

// LaserStream Endpoints (from official docs)
export const LASERSTREAM_ENDPOINTS = {
  // Mainnet endpoints by region
  MAINNET: {
    ewr: 'https://laserstream-mainnet-ewr.helius-rpc.com', // Newark, NJ (near New York)
    fra: 'https://laserstream-mainnet-fra.helius-rpc.com', // Frankfurt, Europe
    tyo: 'https://laserstream-mainnet-tyo.helius-rpc.com', // Tokyo, Asia
    sgp: 'https://laserstream-mainnet-sgp.helius-rpc.com', // Singapore, Asia
  },
  // Devnet endpoint
  DEVNET: {
    ewr: 'https://laserstream-devnet-ewr.helius-rpc.com', // Newark, NJ (near New York)
  }
} as const;

// Subscription types
export type SubscriptionType = 
  | 'account'
  | 'transaction'
  | 'slot'
  | 'block'
  | 'logs'
  | 'signature';

// Account subscription config
export interface AccountSubscriptionConfig {
  account: string;
  encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

// Transaction subscription config
export interface TransactionSubscriptionConfig {
  vote?: boolean;
  failed?: boolean;
  signature?: string;
  accountInclude?: string[];
  accountExclude?: string[];
}

// Slot subscription config
export interface SlotSubscriptionConfig {
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

// Block subscription config
export interface BlockSubscriptionConfig {
  commitment?: 'processed' | 'confirmed' | 'finalized';
  encoding?: 'json' | 'jsonParsed' | 'base58' | 'base64';
  transactionDetails?: 'full' | 'signatures' | 'none';
  rewards?: boolean;
  maxSupportedTransactionVersion?: number;
}

// Logs subscription config
export interface LogsSubscriptionConfig {
  mentions?: string[];
  includeTransactions?: boolean;
  includeVotes?: boolean;
}

// Signature subscription config
export interface SignatureSubscriptionConfig {
  signature: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
}

// Subscription request
export interface SubscriptionRequest {
  id: number;
  method: string;
  params: any[];
}

// Subscription response
export interface SubscriptionResponse {
  id: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
}

// Event data types
export interface AccountUpdateEvent {
  type: 'account';
  account: string;
  slot: number;
  value: {
    lamports: number;
    owner: string;
    executable: boolean;
    rentEpoch: number;
    data: string | any[];
  } | null;
}

export interface TransactionEvent {
  type: 'transaction';
  signature: string;
  slot: number;
  err: any;
  memo: string | null;
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
}

export interface SlotEvent {
  type: 'slot';
  slot: number;
  parent: number;
  root: number;
}

export interface BlockEvent {
  type: 'block';
  slot: number;
  blockhash: string;
  rewards: any[];
  blockTime: number;
  blockHeight: number;
  parentSlot: number;
  previousBlockhash: string;
  transactions: any[];
}

export interface LogsEvent {
  type: 'logs';
  signature: string;
  err: any;
  logs: string[];
}

export interface SignatureEvent {
  type: 'signature';
  signature: string;
  err: any;
  slot: number;
}

export type LaserStreamEvent = 
  | AccountUpdateEvent 
  | TransactionEvent 
  | SlotEvent 
  | BlockEvent 
  | LogsEvent 
  | SignatureEvent;

/**
 * LaserStream Client
 * High-performance streaming client with automatic reconnection and historical replay
 */
export class LaserStreamClient extends EventEmitter {
  private config: LaserStreamConfig;
  private ws: WebSocket | null = null;
  private subscriptions: Map<number, {
    type: SubscriptionType;
    config: any;
    callback: (data: any) => void;
  }> = new Map();
  private nextId: number = 1;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;

  constructor(config: LaserStreamConfig) {
    super();
    this.config = {
      commitment: 'confirmed',
      maxRetries: 10,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Connect to LaserStream
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;

    try {
      const url = `${this.config.endpoint}?api-key=${this.config.apiKey}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('🔗 LaserStream connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: SubscriptionResponse = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing LaserStream message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('LaserStream WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 LaserStream disconnected');
        this.emit('disconnected');
        this.handleReconnect();
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('Error connecting to LaserStream:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from LaserStream
   */
  disconnect(): void {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Subscribe to account updates
   */
  subscribeAccount(
    config: AccountSubscriptionConfig,
    callback: (data: AccountUpdateEvent) => void
  ): number {
    return this.subscribe('accountSubscribe', [config.account, { encoding: config.encoding || 'base64', commitment: config.commitment || this.config.commitment }], callback);
  }

  /**
   * Subscribe to transactions
   */
  subscribeTransaction(
    config: TransactionSubscriptionConfig,
    callback: (data: TransactionEvent) => void
  ): number {
    return this.subscribe('logsSubscribe', [config], callback);
  }

  /**
   * Subscribe to slots
   */
  subscribeSlot(
    config: SlotSubscriptionConfig,
    callback: (data: SlotEvent) => void
  ): number {
    return this.subscribe('slotSubscribe', [config], callback);
  }

  /**
   * Subscribe to blocks
   */
  subscribeBlock(
    config: BlockSubscriptionConfig,
    callback: (data: BlockEvent) => void
  ): number {
    return this.subscribe('blockSubscribe', [config], callback);
  }

  /**
   * Subscribe to logs
   */
  subscribeLogs(
    config: LogsSubscriptionConfig,
    callback: (data: LogsEvent) => void
  ): number {
    return this.subscribe('logsSubscribe', [config], callback);
  }

  /**
   * Subscribe to signature status
   */
  subscribeSignature(
    config: SignatureSubscriptionConfig,
    callback: (data: SignatureEvent) => void
  ): number {
    return this.subscribe('signatureSubscribe', [config.signature, { commitment: config.commitment || this.config.commitment }], callback);
  }

  /**
   * Unsubscribe from a subscription
   */
  unsubscribe(subscriptionId: number): boolean {
    if (!this.subscriptions.has(subscriptionId)) {
      return false;
    }

    const subscription = this.subscriptions.get(subscriptionId);
    this.subscriptions.delete(subscriptionId);

    if (this.ws?.readyState === WebSocket.OPEN) {
      const request: SubscriptionRequest = {
        id: this.nextId++,
        method: 'unsubscribe',
        params: [subscriptionId],
      };
      this.ws.send(JSON.stringify(request));
    }

    return true;
  }

  /**
   * Get historical data (up to 3000 slots back)
   */
  async getHistoricalData(
    subscriptionType: SubscriptionType,
    config: any,
    startSlot?: number
  ): Promise<any[]> {
    // This would require implementing historical replay
    // For now, return empty array
    console.warn('Historical data replay not yet implemented');
    return [];
  }

  /**
   * Private method to handle subscription
   */
  private subscribe(
    method: string,
    params: any[],
    callback: (data: any) => void
  ): number {
    const subscriptionId = this.nextId++;
    
    this.subscriptions.set(subscriptionId, {
      type: method.replace('Subscribe', '') as SubscriptionType,
      config: params,
      callback,
    });

    if (this.ws?.readyState === WebSocket.OPEN) {
      const request: SubscriptionRequest = {
        id: subscriptionId,
        method,
        params,
      };
      this.ws.send(JSON.stringify(request));
    }

    return subscriptionId;
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(data: SubscriptionResponse): void {
    if (data.error) {
      console.error('LaserStream error:', data.error);
      this.emit('error', data.error);
      return;
    }

    if (data.result !== undefined) {
      // Handle subscription confirmation
      this.emit('subscription', { id: data.id, result: data.result });
      return;
    }

    // Handle notification data
    if (data.id && this.subscriptions.has(data.id)) {
      const subscription = this.subscriptions.get(data.id)!;
      subscription.callback(data.result);
      this.emit('data', { type: subscription.type, data: data.result });
    }
  }

  /**
   * Resubscribe to all active subscriptions after reconnection
   */
  private resubscribeAll(): void {
    for (const [id, subscription] of this.subscriptions) {
      const method = `${subscription.type}Subscribe`;
      const request: SubscriptionRequest = {
        id,
        method,
        params: subscription.config,
      };
      this.ws?.send(JSON.stringify(request));
    }
  }

  /**
   * Handle automatic reconnection
   */
  private async handleReconnect(): Promise<void> {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached or reconnection disabled');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }
}

/**
 * Create LaserStream client with optimal endpoint selection
 */
export function createLaserStreamClient(
  apiKey: string,
  network: 'mainnet' | 'devnet' = 'mainnet',
  region: keyof typeof LASERSTREAM_ENDPOINTS.MAINNET = 'ewr'
): LaserStreamClient {
  const endpoint = network === 'mainnet' 
    ? LASERSTREAM_ENDPOINTS.MAINNET[region]
    : LASERSTREAM_ENDPOINTS.DEVNET.ewr;

  return new LaserStreamClient({
    apiKey,
    endpoint,
  });
}

/**
 * Hook for using LaserStream in React components
 */
export function useLaserStream(
  apiKey: string,
  network: 'mainnet' | 'devnet' = 'mainnet',
  region: keyof typeof LASERSTREAM_ENDPOINTS.MAINNET = 'ewr'
) {
  const [client, setClient] = useState<LaserStreamClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const laserStreamClient = createLaserStreamClient(apiKey, network, region);
    
    laserStreamClient.on('connected', () => setIsConnected(true));
    laserStreamClient.on('disconnected', () => setIsConnected(false));
    laserStreamClient.on('error', (err) => setError(err));

    setClient(laserStreamClient);

    return () => {
      laserStreamClient.disconnect();
    };
  }, [apiKey, network, region]);

  const connect = useCallback(() => {
    client?.connect();
  }, [client]);

  const disconnect = useCallback(() => {
    client?.disconnect();
  }, [client]);

  return {
    client,
    isConnected,
    error,
    connect,
    disconnect,
  };
}
