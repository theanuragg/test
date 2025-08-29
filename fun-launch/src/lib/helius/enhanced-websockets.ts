/**
 * Helius Enhanced WebSockets Integration
 * 
 * High-performance WebSocket connections with enhanced filtering capabilities.
 * Based on official Helius documentation.
 * 
 * Documentation: https://www.helius.dev/docs/enhanced-websockets
 */

// Enhanced WebSocket Configuration
export interface EnhancedWebSocketConfig {
  apiKey: string;
  endpoint: string;
  commitment?: 'processed' | 'confirmed' | 'finalized';
  maxRetries?: number;
  retryDelay?: number;
}

// Enhanced WebSocket Endpoints
export const ENHANCED_WEBSOCKET_ENDPOINTS = {
  MAINNET: 'wss://ws.helius.xyz/?api-key=',
  DEVNET: 'wss://ws-devnet.helius.xyz/?api-key=',
} as const;

// Transaction subscription filters
export interface TransactionSubscriptionFilters {
  vote?: boolean;
  failed?: boolean;
  signature?: string;
  accountInclude?: string[];
  accountExclude?: string[];
  accountRequired?: string[];
}

// Account subscription filters
export interface AccountSubscriptionFilters {
  encoding?: 'base58' | 'base64' | 'base64+zstd' | 'jsonParsed';
  commitment?: 'processed' | 'confirmed' | 'finalized';
  dataSlice?: {
    offset: number;
    length: number;
  };
}

// Logs subscription filters
export interface LogsSubscriptionFilters {
  mentions?: string[];
  includeTransactions?: boolean;
  includeVotes?: boolean;
}

// Subscription request
export interface WebSocketRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params: any[];
}

// Subscription response
export interface WebSocketResponse {
  jsonrpc: '2.0';
  id?: number;
  result?: any;
  error?: {
    code: number;
    message: string;
  };
  method?: string;
  params?: {
    result: any;
    subscription: number;
  };
}

// Event data types
export interface AccountUpdateData {
  context: {
    slot: number;
  };
  value: {
    lamports: number;
    owner: string;
    executable: boolean;
    rentEpoch: number;
    data: string | any[];
  } | null;
}

export interface TransactionData {
  context: {
    slot: number;
  };
  value: {
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
  };
}

export interface LogsData {
  context: {
    slot: number;
  };
  value: {
    signature: string;
    err: any;
    logs: string[];
  };
}

export interface SlotData {
  context: {
    slot: number;
  };
  value: {
    slot: number;
    parent: number;
    root: number;
  };
}

export interface BlockData {
  context: {
    slot: number;
  };
  value: {
    blockhash: string;
    rewards: any[];
    blockTime: number;
    blockHeight: number;
    parentSlot: number;
    previousBlockhash: string;
    transactions: any[];
  };
}

export interface SignatureData {
  context: {
    slot: number;
  };
  value: {
    signature: string;
    err: any;
    slot: number;
  };
}

/**
 * Enhanced WebSocket Client
 * High-performance WebSocket client with enhanced filtering capabilities
 */
export class EnhancedWebSocketClient extends EventEmitter {
  private config: EnhancedWebSocketConfig;
  private ws: WebSocket | null = null;
  private subscriptions: Map<number, {
    type: string;
    filters: any;
    callback: (data: any) => void;
  }> = new Map();
  private nextId: number = 1;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private reconnectDelay: number = 1000;
  private isConnecting: boolean = false;
  private shouldReconnect: boolean = true;

  constructor(config: EnhancedWebSocketConfig) {
    super();
    this.config = {
      commitment: 'confirmed',
      maxRetries: 10,
      retryDelay: 1000,
      ...config,
    };
  }

  /**
   * Connect to Enhanced WebSocket
   */
  async connect(): Promise<void> {
    if (this.isConnecting || this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    this.isConnecting = true;

    try {
      const url = `${this.config.endpoint}${this.config.apiKey}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('🔗 Enhanced WebSocket connected');
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit('connected');
        this.resubscribeAll();
      };

      this.ws.onmessage = (event) => {
        try {
          const data: WebSocketResponse = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Error parsing Enhanced WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('Enhanced WebSocket error:', error);
        this.emit('error', error);
      };

      this.ws.onclose = () => {
        console.log('🔌 Enhanced WebSocket disconnected');
        this.emit('disconnected');
        this.handleReconnect();
      };

    } catch (error) {
      this.isConnecting = false;
      console.error('Error connecting to Enhanced WebSocket:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Disconnect from Enhanced WebSocket
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
    account: string,
    filters: AccountSubscriptionFilters,
    callback: (data: AccountUpdateData) => void
  ): number {
    const params = [account, filters];
    return this.subscribe('accountSubscribe', params, callback);
  }

  /**
   * Subscribe to transactions
   */
  subscribeTransaction(
    filters: TransactionSubscriptionFilters,
    callback: (data: TransactionData) => void
  ): number {
    const params = [filters];
    return this.subscribe('logsSubscribe', params, callback);
  }

  /**
   * Subscribe to logs
   */
  subscribeLogs(
    filters: LogsSubscriptionFilters,
    callback: (data: LogsData) => void
  ): number {
    const params = [filters];
    return this.subscribe('logsSubscribe', params, callback);
  }

  /**
   * Subscribe to slots
   */
  subscribeSlot(
    filters: { commitment?: 'processed' | 'confirmed' | 'finalized' },
    callback: (data: SlotData) => void
  ): number {
    const params = [filters];
    return this.subscribe('slotSubscribe', params, callback);
  }

  /**
   * Subscribe to blocks
   */
  subscribeBlock(
    filters: {
      commitment?: 'processed' | 'confirmed' | 'finalized';
      encoding?: 'json' | 'jsonParsed' | 'base58' | 'base64';
      transactionDetails?: 'full' | 'signatures' | 'none';
      rewards?: boolean;
      maxSupportedTransactionVersion?: number;
    },
    callback: (data: BlockData) => void
  ): number {
    const params = [filters];
    return this.subscribe('blockSubscribe', params, callback);
  }

  /**
   * Subscribe to signature status
   */
  subscribeSignature(
    signature: string,
    filters: { commitment?: 'processed' | 'confirmed' | 'finalized' },
    callback: (data: SignatureData) => void
  ): number {
    const params = [signature, filters];
    return this.subscribe('signatureSubscribe', params, callback);
  }

  /**
   * Unsubscribe from a subscription
   */
  unsubscribe(subscriptionId: number): boolean {
    if (!this.subscriptions.has(subscriptionId)) {
      return false;
    }

    this.subscriptions.delete(subscriptionId);

    if (this.ws?.readyState === WebSocket.OPEN) {
      const request: WebSocketRequest = {
        jsonrpc: '2.0',
        id: this.nextId++,
        method: 'unsubscribe',
        params: [subscriptionId],
      };
      this.ws.send(JSON.stringify(request));
    }

    return true;
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
      type: method.replace('Subscribe', ''),
      filters: params,
      callback,
    });

    if (this.ws?.readyState === WebSocket.OPEN) {
      const request: WebSocketRequest = {
        jsonrpc: '2.0',
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
  private handleMessage(data: WebSocketResponse): void {
    if (data.error) {
      console.error('Enhanced WebSocket error:', data.error);
      this.emit('error', data.error);
      return;
    }

    if (data.result !== undefined && data.id) {
      // Handle subscription confirmation
      this.emit('subscription', { id: data.id, result: data.result });
      return;
    }

    // Handle notification data
    if (data.method === 'accountNotification' && data.params) {
      this.emit('accountUpdate', data.params.result);
    } else if (data.method === 'logsNotification' && data.params) {
      this.emit('logsUpdate', data.params.result);
    } else if (data.method === 'slotNotification' && data.params) {
      this.emit('slotUpdate', data.params.result);
    } else if (data.method === 'blockNotification' && data.params) {
      this.emit('blockUpdate', data.params.result);
    } else if (data.method === 'signatureNotification' && data.params) {
      this.emit('signatureUpdate', data.params.result);
    }
  }

  /**
   * Resubscribe to all active subscriptions after reconnection
   */
  private resubscribeAll(): void {
    for (const [id, subscription] of this.subscriptions) {
      const method = `${subscription.type}Subscribe`;
      const request: WebSocketRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params: subscription.filters,
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
 * Create Enhanced WebSocket client
 */
export function createEnhancedWebSocketClient(
  apiKey: string,
  network: 'mainnet' | 'devnet' = 'mainnet'
): EnhancedWebSocketClient {
  const endpoint = network === 'mainnet' 
    ? ENHANCED_WEBSOCKET_ENDPOINTS.MAINNET
    : ENHANCED_WEBSOCKET_ENDPOINTS.DEVNET;

  return new EnhancedWebSocketClient({
    apiKey,
    endpoint,
  });
}

/**
 * Hook for using Enhanced WebSocket in React components
 */
export function useEnhancedWebSocket(
  apiKey: string,
  network: 'mainnet' | 'devnet' = 'mainnet'
) {
  const [client, setClient] = useState<EnhancedWebSocketClient | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const enhancedWebSocketClient = createEnhancedWebSocketClient(apiKey, network);
    
    enhancedWebSocketClient.on('connected', () => setIsConnected(true));
    enhancedWebSocketClient.on('disconnected', () => setIsConnected(false));
    enhancedWebSocketClient.on('error', (err) => setError(err));

    setClient(enhancedWebSocketClient);

    return () => {
      enhancedWebSocketClient.disconnect();
    };
  }, [apiKey, network]);

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
