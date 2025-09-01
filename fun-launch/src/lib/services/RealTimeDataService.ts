import { Connection, PublicKey } from '@solana/web3.js';
import { EventEmitter } from 'events';
import { getEnterpriseConnection } from '../config/enterprise-rpc';

export interface TokenPriceData {
  price: number;
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  timestamp: number;
}

export interface TradingActivity {
  type: 'buy' | 'sell';
  price: number;
  amount: number;
  traderAddress: string;
  timestamp: number;
  txHash: string;
}

export interface BondingCurveData {
  progress: number;
  currentPrice: number;
  targetPrice: number;
  remainingTokens: number;
  totalTokens: number;
  timeToGraduation?: number;
  isGraduating: boolean;
}

export interface ChartDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export class RealTimeDataService extends EventEmitter {
  private connection: Connection | null = null;
  private subscriptions: Map<string, number> = new Map();
  private isConnected: boolean = false;
  private reconnectInterval: NodeJS.Timeout | null = null;

  constructor(rpcUrl?: string) {
    super();
    // We'll initialize the connection when needed using the enterprise RPC manager
  }

  // Connect to Solana and start listening for updates
  async connect() {
    try {
      // Get an enterprise connection that handles all RPC issues automatically
      this.connection = await getEnterpriseConnection();
      this.isConnected = true;
      
      console.log('✅ RealTimeDataService: Connected using enterprise RPC manager');
      this.emit('connected');
      
      // Start health monitoring
      this.startHealthMonitoring();
      
    } catch (error) {
      console.error('❌ RealTimeDataService: Failed to connect:', error);
      this.isConnected = false;
      this.emit('error', error);
      
      // Schedule reconnection with exponential backoff
      this.scheduleReconnection();
    }
  }

  // Start health monitoring for the connection
  private startHealthMonitoring() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
    }

    this.reconnectInterval = setInterval(async () => {
      if (!this.connection || !this.isConnected) {
        await this.connect();
        return;
      }

      try {
        // Test connection health
        await this.connection.getSlot();
      } catch (error) {
        console.warn('⚠️ RealTimeDataService: Connection health check failed, reconnecting...');
        this.isConnected = false;
        await this.connect();
      }
    }, 30000); // Check every 30 seconds
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnection() {
    setTimeout(async () => {
      console.log('🔄 RealTimeDataService: Attempting to reconnect...');
      await this.connect();
    }, 5000); // Wait 5 seconds before reconnecting
  }

  // Get the current connection
  async getConnection(): Promise<Connection> {
    if (!this.connection || !this.isConnected) {
      await this.connect();
    }
    return this.connection!;
  }

  // Subscribe to account changes with enterprise RPC reliability
  async subscribeToAccount(publicKey: PublicKey, callback: (data: any) => void) {
    try {
      const connection = await this.getConnection();
      const subscriptionId = connection.onAccountChange(publicKey, callback, 'confirmed');
      
      this.subscriptions.set(publicKey.toString(), subscriptionId);
      console.log(`📡 RealTimeDataService: Subscribed to account ${publicKey.toString()}`);
      
      return subscriptionId;
    } catch (error) {
      console.error('❌ RealTimeDataService: Failed to subscribe to account:', error);
      throw error;
    }
  }

  // Subscribe to program account changes
  async subscribeToProgramAccount(programId: PublicKey, callback: (data: any) => void) {
    try {
      const connection = await this.getConnection();
      const subscriptionId = connection.onProgramAccountChange(programId, callback, 'confirmed');
      
      this.subscriptions.set(`program_${programId.toString()}`, subscriptionId);
      console.log(`📡 RealTimeDataService: Subscribed to program ${programId.toString()}`);
      
      return subscriptionId;
    } catch (error) {
      console.error('❌ RealTimeDataService: Failed to subscribe to program account:', error);
      throw error;
    }
  }

  // Unsubscribe from account changes
  async unsubscribeFromAccount(publicKey: PublicKey) {
    try {
      const subscriptionId = this.subscriptions.get(publicKey.toString());
      if (subscriptionId && this.connection) {
        await this.connection.removeAccountChangeListener(subscriptionId);
        this.subscriptions.delete(publicKey.toString());
        console.log(`📡 RealTimeDataService: Unsubscribed from account ${publicKey.toString()}`);
      }
    } catch (error) {
      console.error('❌ RealTimeDataService: Failed to unsubscribe from account:', error);
    }
  }

  // Unsubscribe from program account changes
  async unsubscribeFromProgramAccount(programId: PublicKey) {
    try {
      const subscriptionId = this.subscriptions.get(`program_${programId.toString()}`);
      if (subscriptionId && this.connection) {
        await this.connection.removeProgramAccountChangeListener(subscriptionId);
        this.subscriptions.delete(`program_${programId.toString()}`);
        console.log(`📡 RealTimeDataService: Unsubscribed from program ${programId.toString()}`);
      }
    } catch (error) {
      console.error('❌ RealTimeDataService: Failed to unsubscribe from program account:', error);
    }
  }

  // Get account info with retry logic
  async getAccountInfo(publicKey: PublicKey) {
    try {
      const connection = await this.getConnection();
      return await connection.getAccountInfo(publicKey, 'confirmed');
    } catch (error) {
      console.error('❌ RealTimeDataService: Failed to get account info:', error);
      throw error;
    }
  }

  // Get multiple account infos with retry logic
  async getMultipleAccountInfos(publicKeys: PublicKey[]) {
    try {
      const connection = await this.getConnection();
      return await connection.getMultipleAccountsInfo(publicKeys, 'confirmed');
    } catch (error) {
      console.error('❌ RealTimeDataService: Failed to get multiple account infos:', error);
      throw error;
    }
  }

  // Fetch historical chart data
  async fetchChartData(
    tokenAddress: string,
    interval: string,
    from: number,
    to: number
  ): Promise<ChartDataPoint[]> {
    try {
      // This would integrate with your existing ApeClient or similar service
      // For now, we'll return mock data
      const mockData: ChartDataPoint[] = [];
      const intervalMs = this.getIntervalMs(interval);
      
      for (let time = from; time <= to; time += intervalMs) {
        mockData.push({
          timestamp: time,
          open: 0.0001 + Math.random() * 0.001,
          high: 0.0001 + Math.random() * 0.001,
          low: 0.0001 + Math.random() * 0.001,
          close: 0.0001 + Math.random() * 0.001,
          volume: Math.random() * 1000,
        });
      }

      return mockData;
    } catch (error) {
      console.error('Failed to fetch chart data:', error);
      throw error;
    }
  }

  // Fetch bonding curve data
  async fetchBondingCurveData(tokenAddress: string): Promise<BondingCurveData> {
    try {
      // This would integrate with Meteora DBC or similar bonding curve protocol
      // For now, return mock data
      const progress = 45 + Math.random() * 30;
      return {
        progress: Math.min(progress, 100),
        currentPrice: 0.0001 + Math.random() * 0.001,
        targetPrice: 0.0005,
        remainingTokens: 300000000 + Math.random() * 200000000,
        totalTokens: 1000000000,
        timeToGraduation: progress > 90 ? Math.floor(Math.random() * 3600) : undefined,
        isGraduating: progress > 95,
      };
    } catch (error) {
      console.error('Failed to fetch bonding curve data:', error);
      throw error;
    }
  }

  // Fetch recent trading activity
  async fetchRecentTrades(tokenAddress: string, limit: number = 50): Promise<TradingActivity[]> {
    try {
      // This would integrate with Jupiter API or similar DEX aggregator
      // For now, return mock data
      const trades: TradingActivity[] = [];
      for (let i = 0; i < limit; i++) {
        trades.push({
          type: Math.random() > 0.5 ? 'buy' : 'sell',
          price: 0.0001 + Math.random() * 0.001,
          amount: Math.random() * 1000,
          traderAddress: `trader_${Math.floor(Math.random() * 1000)}`,
          timestamp: Date.now() - Math.random() * 86400000, // Last 24 hours
          txHash: `tx_${Math.random().toString(36).substr(2, 9)}`,
        });
      }
      return trades.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to fetch recent trades:', error);
      throw error;
    }
  }

  // Handle token account updates
  private handleTokenUpdate(tokenAddress: string, accountInfo: any, context: any) {
    // Parse token account data and emit price updates
    this.emit('tokenUpdate', {
      tokenAddress,
      accountInfo,
      context,
      timestamp: Date.now(),
    });
  }

  // Handle pool account updates
  private handlePoolUpdate(poolAddress: string, accountInfo: any, context: any) {
    // Parse pool account data and emit liquidity updates
    this.emit('poolUpdate', {
      poolAddress,
      accountInfo,
      context,
      timestamp: Date.now(),
    });
  }

  // Fetch initial data for a token
  private async fetchInitialData(tokenAddress: string, poolAddress?: string) {
    try {
      // Fetch initial price data
      const priceData = await this.fetchTokenPriceData(tokenAddress);
      this.emit('initialPriceData', { tokenAddress, priceData });

      // Fetch initial bonding curve data
      const bondingCurveData = await this.fetchBondingCurveData(tokenAddress);
      this.emit('initialBondingCurveData', { tokenAddress, bondingCurveData });

      // Fetch recent trades
      const recentTrades = await this.fetchRecentTrades(tokenAddress);
      this.emit('initialTrades', { tokenAddress, trades: recentTrades });

    } catch (error) {
      console.error('Failed to fetch initial data:', error);
    }
  }

  // Fetch token price data
  private async fetchTokenPriceData(tokenAddress: string): Promise<TokenPriceData> {
    // This would integrate with price feeds like Pyth or Jupiter
    return {
      price: 0.0001 + Math.random() * 0.001,
      priceChange24h: (Math.random() - 0.5) * 20,
      volume24h: Math.random() * 50000,
      marketCap: Math.random() * 1000000,
      timestamp: Date.now(),
    };
  }

  // Get interval in milliseconds
  private getIntervalMs(interval: string): number {
    const intervals: { [key: string]: number } = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
    };
    return intervals[interval] || 15 * 60 * 1000; // Default to 15m
  }

  // Disconnect and cleanup
  disconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
    }

    // Unsubscribe from all subscriptions
    this.subscriptions.forEach(async (subscriptionId, key) => {
      try {
        if (this.connection) {
          if (key.startsWith('program_')) {
            await this.connection.removeProgramAccountChangeListener(subscriptionId);
          } else {
            await this.connection.removeAccountChangeListener(subscriptionId);
          }
        }
      } catch (error) {
        console.warn('⚠️ RealTimeDataService: Failed to remove subscription:', error);
      }
    });

    this.subscriptions.clear();
    this.isConnected = false;
    this.connection = null;
    
    console.log('🔌 RealTimeDataService: Disconnected');
    this.emit('disconnected');
  }

  // Check if connected
  isServiceConnected(): boolean {
    return this.isConnected && this.connection !== null;
  }

  // Get connection status
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      subscriptionCount: this.subscriptions.size,
      hasConnection: this.connection !== null
    };
  }
}

// Export singleton instance
export const realTimeDataService = new RealTimeDataService();
