import { Connection, PublicKey } from '@solana/web3.js';

export interface TradeStreamConfig {
  heliusRpcUrl: string;
  heliusWsUrl: string;
  heliusApiKey: string;
  onTrade?: (trade: TradeData) => void;
  onVolumeUpdate?: (poolAddress: string, volume24h: number) => void;
  onPriceUpdate?: (poolAddress: string, price: number) => void;
  onError?: (error: Error) => void;
}

export interface TradeData {
  signature: string;
  poolAddress: string;
  baseMint: string;
  quoteMint: string;
  baseAmount: number;
  quoteAmount: number;
  price: number;
  side: 'buy' | 'sell';
  timestamp: Date;
  userWallet: string;
  fee: number;
}

export interface PoolTradeStats {
  poolAddress: string;
  lastPrice: number;
  volume24h: number;
  trades24h: number;
  priceChange24h: number;
  lastTrade: TradeData | null;
}

export class TradeStreamService {
  private connection: Connection;
  private wsConnection: WebSocket | null = null;
  private poolSubscriptions = new Map<string, any>();
  private tradeStats = new Map<string, PoolTradeStats>();
  private config: TradeStreamConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private tradeHistory = new Map<string, TradeData[]>();

  constructor(config: TradeStreamConfig) {
    this.config = config;
    this.connection = new Connection(config.heliusRpcUrl, 'confirmed');
  }

  /**
   * Start real-time trade monitoring
   */
  async start() {
    try {
      console.log('🚀 Starting real-time trade stream...');
      
      // Connect to Helius WebSocket
      await this.connectWebSocket();
      
      // Start monitoring existing pools
      await this.monitorExistingPools();
      
      console.log('✅ Trade stream started successfully');
    } catch (error) {
      console.error('❌ Failed to start trade stream:', error);
      this.config.onError?.(error as Error);
    }
  }

  /**
   * Connect to Helius WebSocket
   */
  private async connectWebSocket() {
    return new Promise<void>((resolve, reject) => {
      try {
        // Check if WebSocket is available (browser environment)
        if (typeof WebSocket === 'undefined') {
          console.warn('⚠️ WebSocket not available, skipping WebSocket connection');
          this.isConnected = true; // Mark as connected to avoid reconnection attempts
          resolve();
          return;
        }

        this.wsConnection = new WebSocket(this.config.heliusWsUrl);
        
        this.wsConnection.onopen = () => {
          console.log('🔌 Connected to Helius WebSocket for trades');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.wsConnection.onclose = () => {
          console.log('🔌 Trade WebSocket connection closed');
          this.isConnected = false;
          this.handleReconnection();
        };

        this.wsConnection.onerror = (error) => {
          console.error('❌ Trade WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Handle WebSocket messages
   */
  private handleWebSocketMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data);
      
      if (data.method === 'logsNotification') {
        this.handleLogsUpdate(data.params.result);
      } else if (data.method === 'accountNotification') {
        this.handleAccountUpdate(data.params.result);
      }
    } catch (error) {
      console.error('❌ Error parsing trade WebSocket message:', error);
    }
  }

  /**
   * Handle transaction logs for trade detection
   */
  private async handleLogsUpdate(logsData: any) {
    try {
      const { signature, logs, err } = logsData.value;
      
      if (err) return; // Skip failed transactions
      
      // Check for DBC swap transactions
      if (this.isDbcSwapTransaction(logs)) {
        console.log(`💰 DBC trade detected: ${signature}`);
        
        // Parse trade data from logs
        const tradeData = await this.parseTradeFromLogs(signature, logs);
        if (tradeData) {
          this.processTrade(tradeData);
        }
      }
    } catch (error) {
      console.error('❌ Error handling trade logs update:', error);
    }
  }

  /**
   * Handle account updates for price/volume changes
   */
  private async handleAccountUpdate(accountData: any) {
    try {
      const poolAddress = accountData.value.pubkey;
      
      // Check if this is a DBC pool we're monitoring
      if (this.poolSubscriptions.has(poolAddress)) {
        console.log(`🔄 Pool ${poolAddress} trade state updated...`);
        
        // Update trade statistics
        await this.updatePoolTradeStats(poolAddress);
      }
    } catch (error) {
      console.error('❌ Error handling trade account update:', error);
    }
  }

  /**
   * Check if transaction is a DBC swap
   */
  private isDbcSwapTransaction(logs: string[]): boolean {
    return logs.some(log => 
      log.includes('swap') || 
      log.includes('Swap') || 
      log.includes('DBC') ||
      log.includes('DynamicBondingCurve')
    );
  }

  /**
   * Parse trade data from transaction logs
   */
  private async parseTradeFromLogs(signature: string, logs: string[]): Promise<TradeData | null> {
    try {
      // Get transaction details
      const transaction = await this.connection.getTransaction(signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });

      if (!transaction || !transaction.meta) return null;

      // Extract pool address from logs
      const poolAddress = this.extractPoolAddressFromLogs(logs);
      if (!poolAddress) return null;

      // Parse pre and post token balances
      const preBalances = transaction.meta.preTokenBalances || [];
      const postBalances = transaction.meta.postTokenBalances || [];
      
      // Calculate token amounts
      const baseMint = this.extractBaseMintFromLogs(logs);
      const quoteMint = this.extractQuoteMintFromLogs(logs);
      
      if (!baseMint || !quoteMint) return null;

      const baseChange = this.calculateTokenChange(preBalances, postBalances, baseMint);
      const quoteChange = this.calculateTokenChange(preBalances, postBalances, quoteMint);
      
      // Determine trade side
      const side = baseChange > 0 ? 'buy' : 'sell';
      const baseAmount = Math.abs(baseChange);
      const quoteAmount = Math.abs(quoteChange);
      const price = quoteAmount / baseAmount;
      
      // Extract user wallet
      const userWallet = transaction.transaction.message.accountKeys[0].toString();
      
      // Calculate fee
      const fee = transaction.meta.fee || 0;

      return {
        signature,
        poolAddress,
        baseMint,
        quoteMint,
        baseAmount,
        quoteAmount,
        price,
        side,
        timestamp: new Date(),
        userWallet,
        fee
      };
    } catch (error) {
      console.error('❌ Error parsing trade from logs:', error);
      return null;
    }
  }

  /**
   * Extract pool address from transaction logs
   */
  private extractPoolAddressFromLogs(logs: string[]): string | null {
    for (const log of logs) {
      // Look for pool address pattern
      if (log.length === 44 && /^[A-Za-z0-9]{44}$/.test(log)) {
        return log;
      }
    }
    return null;
  }

  /**
   * Extract base mint from logs
   */
  private extractBaseMintFromLogs(logs: string[]): string | null {
    // This is a simplified extraction - adjust based on actual log format
    for (const log of logs) {
      if (log.includes('base') && log.length === 44) {
        return log;
      }
    }
    return null;
  }

  /**
   * Extract quote mint from logs
   */
  private extractQuoteMintFromLogs(logs: string[]): string | null {
    // This is a simplified extraction - adjust based on actual log format
    for (const log of logs) {
      if (log.includes('quote') && log.length === 44) {
        return log;
      }
    }
    return null;
  }

  /**
   * Calculate token balance change
   */
  private calculateTokenChange(preBalances: any[], postBalances: any[], mint: string): number {
    const preBalance = preBalances.find(b => b.mint === mint)?.uiTokenAmount?.uiAmount || 0;
    const postBalance = postBalances.find(b => b.mint === mint)?.uiTokenAmount?.uiAmount || 0;
    return postBalance - preBalance;
  }

  /**
   * Process a new trade
   */
  private processTrade(tradeData: TradeData) {
    try {
      const { poolAddress } = tradeData;
      
      // Add to trade history
      if (!this.tradeHistory.has(poolAddress)) {
        this.tradeHistory.set(poolAddress, []);
      }
      
      const poolTrades = this.tradeHistory.get(poolAddress)!;
      poolTrades.push(tradeData);
      
      // Keep only last 1000 trades
      if (poolTrades.length > 1000) {
        poolTrades.splice(0, poolTrades.length - 1000);
      }
      
      // Update trade statistics
      this.updateTradeStats(poolAddress, tradeData);
      
      // Notify listeners
      this.config.onTrade?.(tradeData);
      
      console.log(`✅ Trade processed: ${tradeData.side} ${tradeData.baseAmount} @ $${tradeData.price.toFixed(6)}`);
      
    } catch (error) {
      console.error('❌ Error processing trade:', error);
    }
  }

  /**
   * Update trade statistics for a pool
   */
  private updateTradeStats(poolAddress: string, tradeData: TradeData) {
    try {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      
      // Get pool trades from last 24 hours
      const poolTrades = this.tradeHistory.get(poolAddress) || [];
      const trades24h = poolTrades.filter(trade => trade.timestamp > oneDayAgo);
      
      // Calculate 24h volume
      const volume24h = trades24h.reduce((total, trade) => total + trade.quoteAmount, 0);
      
      // Calculate price change
      const oldestTrade24h = trades24h[0];
      const priceChange24h = oldestTrade24h 
        ? ((tradeData.price - oldestTrade24h.price) / oldestTrade24h.price) * 100
        : 0;
      
      // Update stats
      this.tradeStats.set(poolAddress, {
        poolAddress,
        lastPrice: tradeData.price,
        volume24h,
        trades24h: trades24h.length,
        priceChange24h,
        lastTrade: tradeData
      });
      
      // Notify listeners
      this.config.onVolumeUpdate?.(poolAddress, volume24h);
      this.config.onPriceUpdate?.(poolAddress, tradeData.price);
      
    } catch (error) {
      console.error('❌ Error updating trade stats:', error);
    }
  }

  /**
   * Update pool trade statistics from blockchain
   */
  private async updatePoolTradeStats(poolAddress: string) {
    try {
      // This would typically fetch current pool state and update stats
      // For now, we'll rely on trade processing to update stats
      console.log(`📊 Updating trade stats for pool ${poolAddress}...`);
    } catch (error) {
      console.error(`❌ Error updating trade stats for pool ${poolAddress}:`, error);
    }
  }

  /**
   * Monitor existing pools for trade activity
   */
  private async monitorExistingPools() {
    try {
      // Get all pools from your system
      const pools = await this.getAllPools();
      
      for (const pool of pools) {
        await this.addPoolToMonitoring(pool.poolAddress);
      }
    } catch (error) {
      console.error('❌ Error monitoring existing pools for trades:', error);
    }
  }

  /**
   * Add a pool to real-time trade monitoring
   */
  async addPoolToMonitoring(poolAddress: string) {
    try {
      if (this.poolSubscriptions.has(poolAddress)) {
        return; // Already monitoring
      }

      console.log(`📡 Adding pool ${poolAddress} to trade monitoring...`);

      // Subscribe to pool account changes
      const subscription = this.connection.onAccountChange(
        new PublicKey(poolAddress),
        (accountInfo) => {
          // Trigger account update handler
          this.handleAccountUpdate({
            value: {
              pubkey: poolAddress,
              account: accountInfo
            }
          });
        },
        'confirmed'
      );

      this.poolSubscriptions.set(poolAddress, subscription);

      // Initialize trade stats
      this.tradeStats.set(poolAddress, {
        poolAddress,
        lastPrice: 0,
        volume24h: 0,
        trades24h: 0,
        priceChange24h: 0,
        lastTrade: null
      });

      console.log(`✅ Pool ${poolAddress} added to trade monitoring`);
    } catch (error) {
      console.error(`❌ Error adding pool ${poolAddress} to trade monitoring:`, error);
    }
  }

  /**
   * Remove a pool from trade monitoring
   */
  async removePoolFromMonitoring(poolAddress: string) {
    try {
      const subscription = this.poolSubscriptions.get(poolAddress);
      if (subscription) {
        await this.connection.removeAccountChangeListener(subscription);
        this.poolSubscriptions.delete(poolAddress);
        this.tradeStats.delete(poolAddress);
        this.tradeHistory.delete(poolAddress);
        console.log(`✅ Pool ${poolAddress} removed from trade monitoring`);
      }
    } catch (error) {
      console.error(`❌ Error removing pool ${poolAddress} from trade monitoring:`, error);
    }
  }

  /**
   * Get all pools (implement based on your system)
   */
  private async getAllPools(): Promise<any[]> {
    try {
      // Check if fetch is available (browser environment)
      if (typeof fetch === 'undefined') {
        console.warn('⚠️ Fetch API not available, returning empty pools list');
        return [];
      }
      
      const response = await fetch('/api/pools/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeAll: true }),
      });

      const result = await response.json();
      return result.success ? result.pools : [];
    } catch (error) {
      console.error('❌ Error fetching pools for trade monitoring:', error);
      return [];
    }
  }

  /**
   * Handle WebSocket reconnection
   */
  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect trade stream (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connectWebSocket().catch(error => {
          console.error('❌ Trade stream reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max trade stream reconnection attempts reached');
      this.config.onError?.(new Error('Max trade stream reconnection attempts reached'));
    }
  }

  /**
   * Stop the trade stream
   */
  async stop() {
    try {
      console.log('🛑 Stopping trade stream...');
      
      // Close WebSocket connection
      if (this.wsConnection && typeof this.wsConnection.close === 'function') {
        this.wsConnection.close();
        this.wsConnection = null;
      }
      
      // Remove all account change listeners
      for (const [poolAddress, subscription] of this.poolSubscriptions) {
        try {
          await this.connection.removeAccountChangeListener(subscription);
        } catch (error) {
          console.warn(`⚠️ Error removing account change listener for pool ${poolAddress}:`, error);
        }
      }
      
      this.poolSubscriptions.clear();
      this.tradeStats.clear();
      this.tradeHistory.clear();
      this.isConnected = false;
      
      console.log('✅ Trade stream stopped');
    } catch (error) {
      console.error('❌ Error stopping trade stream:', error);
    }
  }

  /**
   * Get current trade statistics for all monitored pools
   */
  getTradeStats(): Map<string, PoolTradeStats> {
    return new Map(this.tradeStats);
  }

  /**
   * Get trade history for a specific pool
   */
  getPoolTradeHistory(poolAddress: string): TradeData[] {
    return this.tradeHistory.get(poolAddress) || [];
  }

  /**
   * Check if service is connected
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }
}
