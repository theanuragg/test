import { Connection, PublicKey } from '@solana/web3.js';
import { DbcClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

export interface MigrationStreamConfig {
  heliusRpcUrl: string;
  heliusWsUrl: string;
  heliusApiKey: string;
  onMigrationReady?: (poolAddress: string, poolData: any) => void;
  onMigrationComplete?: (poolAddress: string, transactionSignature: string) => void;
  onError?: (error: Error) => void;
}

export interface PoolMigrationStatus {
  poolAddress: string;
  isMigrated: boolean;
  migrationProgress: number;
  currentQuoteReserve: number;
  migrationThreshold: number;
  isReadyForMigration: boolean;
  migrationOption: number;
  migrationFeeOption: number;
  poolStatus: string;
  lastUpdated: Date;
}

export class MigrationStreamService {
  private connection: Connection;
  private dbcClient: DbcClient;
  private wsConnection: WebSocket | null = null;
  private poolSubscriptions = new Map<string, any>();
  private migrationStatus = new Map<string, PoolMigrationStatus>();
  private config: MigrationStreamConfig;
  private isConnected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(config: MigrationStreamConfig) {
    this.config = config;
    this.connection = new Connection(config.heliusRpcUrl, 'confirmed');
    this.dbcClient = new DbcClient(this.connection);
  }

  /**
   * Start real-time migration monitoring
   */
  async start() {
    try {
      console.log('🚀 Starting real-time migration stream...');
      
      // Connect to Helius WebSocket
      await this.connectWebSocket();
      
      // Start monitoring existing pools
      await this.monitorExistingPools();
      
      console.log('✅ Migration stream started successfully');
    } catch (error) {
      console.error('❌ Failed to start migration stream:', error);
      this.config.onError?.(error as Error);
    }
  }

  /**
   * Connect to Helius WebSocket
   */
  private async connectWebSocket() {
    return new Promise<void>((resolve, reject) => {
      try {
        this.wsConnection = new WebSocket(this.config.heliusWsUrl);
        
        this.wsConnection.onopen = () => {
          console.log('🔌 Connected to Helius WebSocket');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        };

        this.wsConnection.onmessage = (event) => {
          this.handleWebSocketMessage(event);
        };

        this.wsConnection.onclose = () => {
          console.log('🔌 WebSocket connection closed');
          this.isConnected = false;
          this.handleReconnection();
        };

        this.wsConnection.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
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
      
      if (data.method === 'accountNotification') {
        this.handleAccountUpdate(data.params.result);
      } else if (data.method === 'logsNotification') {
        this.handleLogsUpdate(data.params.result);
      }
    } catch (error) {
      console.error('❌ Error parsing WebSocket message:', error);
    }
  }

  /**
   * Handle account updates (pool state changes)
   */
  private async handleAccountUpdate(accountData: any) {
    try {
      const poolAddress = accountData.value.pubkey;
      
      // Check if this is a DBC pool we're monitoring
      if (this.poolSubscriptions.has(poolAddress)) {
        console.log(`🔄 Pool ${poolAddress} state updated, checking migration status...`);
        
        // Get updated migration status
        const status = await this.getPoolMigrationStatus(poolAddress);
        if (status) {
          this.migrationStatus.set(poolAddress, status);
          
          // Check if migration is now ready
          if (status.isReadyForMigration && !status.isMigrated) {
            console.log(`🎯 Pool ${poolAddress} ready for migration!`);
            this.config.onMigrationReady?.(poolAddress, status);
            
            // Auto-trigger migration
            await this.triggerAutoMigration(poolAddress, status);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling account update:', error);
    }
  }

  /**
   * Handle logs updates (transaction logs)
   */
  private async handleLogsUpdate(logsData: any) {
    try {
      const { signature, logs } = logsData.value;
      
      // Check for migration-related logs
      if (logs.some((log: string) => log.includes('migrateToDammV2') || log.includes('Migration'))) {
        console.log(`🚀 Migration transaction detected: ${signature}`);
        
        // Extract pool address from logs (you may need to adjust this based on actual log format)
        const poolAddress = this.extractPoolAddressFromLogs(logs);
        if (poolAddress) {
          console.log(`✅ Migration completed for pool: ${poolAddress}`);
          this.config.onMigrationComplete?.(poolAddress, signature);
          
          // Update migration status
          const status = await this.getPoolMigrationStatus(poolAddress);
          if (status) {
            this.migrationStatus.set(poolAddress, status);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling logs update:', error);
    }
  }

  /**
   * Extract pool address from transaction logs
   */
  private extractPoolAddressFromLogs(logs: string[]): string | null {
    // This is a simplified extraction - you may need to adjust based on actual log format
    for (const log of logs) {
      if (log.includes('Pool') && log.length === 44) {
        return log;
      }
    }
    return null;
  }

  /**
   * Monitor existing pools for migration status
   */
  private async monitorExistingPools() {
    try {
      // Get all pools from your system
      const pools = await this.getAllPools();
      
      for (const pool of pools) {
        await this.addPoolToMonitoring(pool.poolAddress);
      }
    } catch (error) {
      console.error('❌ Error monitoring existing pools:', error);
    }
  }

  /**
   * Add a pool to real-time monitoring
   */
  async addPoolToMonitoring(poolAddress: string) {
    try {
      if (this.poolSubscriptions.has(poolAddress)) {
        return; // Already monitoring
      }

      console.log(`📡 Adding pool ${poolAddress} to real-time monitoring...`);

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

      // Get initial migration status
      const status = await this.getPoolMigrationStatus(poolAddress);
      if (status) {
        this.migrationStatus.set(poolAddress, status);
      }

      console.log(`✅ Pool ${poolAddress} added to monitoring`);
    } catch (error) {
      console.error(`❌ Error adding pool ${poolAddress} to monitoring:`, error);
    }
  }

  /**
   * Remove a pool from monitoring
   */
  async removePoolFromMonitoring(poolAddress: string) {
    try {
      const subscription = this.poolSubscriptions.get(poolAddress);
      if (subscription) {
        await this.connection.removeAccountChangeListener(subscription);
        this.poolSubscriptions.delete(poolAddress);
        this.migrationStatus.delete(poolAddress);
        console.log(`✅ Pool ${poolAddress} removed from monitoring`);
      }
    } catch (error) {
      console.error(`❌ Error removing pool ${poolAddress} from monitoring:`, error);
    }
  }

  /**
   * Get current migration status for a pool
   */
  async getPoolMigrationStatus(poolAddress: string): Promise<PoolMigrationStatus | null> {
    try {
      const poolPublicKey = new PublicKey(poolAddress);
      
      // Get pool state
      const poolState = await this.dbcClient.state.getPoolState(poolPublicKey);
      if (!poolState) return null;

      // Get pool config
      const poolConfig = await this.dbcClient.state.getPoolConfig(poolState.config);
      if (!poolConfig) return null;

      // Calculate migration status
      const currentQuoteReserves = (poolState as any).quoteReserves?.toNumber() || 0;
      const migrationThreshold = poolConfig.migrationQuoteThreshold?.toNumber() || 0;
      const isMigrated = (poolState as any).isMigrated || false;
      
      const migrationProgress = migrationThreshold > 0 
        ? Math.min((currentQuoteReserves / migrationThreshold) * 100, 100)
        : 0;
      
      const isReadyForMigration = currentQuoteReserves >= migrationThreshold && !isMigrated;
      
      let poolStatus = 'Building Liquidity';
      if (isMigrated) {
        poolStatus = 'Migrated to DAMM';
      } else if (isReadyForMigration) {
        poolStatus = 'Ready for Migration';
      } else if (migrationProgress >= 80) {
        poolStatus = 'Approaching Migration';
      }

      return {
        poolAddress,
        isMigrated,
        migrationProgress,
        currentQuoteReserve: currentQuoteReserves,
        migrationThreshold,
        isReadyForMigration,
        migrationOption: poolConfig.migrationOption?.toNumber() || 0,
        migrationFeeOption: poolConfig.migrationFeeOption?.toNumber() || 0,
        poolStatus,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error(`❌ Error getting migration status for pool ${poolAddress}:`, error);
      return null;
    }
  }

  /**
   * Auto-trigger migration when pool is ready
   */
  private async triggerAutoMigration(poolAddress: string, poolData: PoolMigrationStatus) {
    try {
      console.log(`🚀 Auto-triggering migration for pool ${poolAddress}...`);
      
      // Call your migration API
      const response = await fetch('/api/migration/background-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolAddress,
          userWallet: this.config.heliusApiKey, // Use appropriate wallet
        }),
      });

      const result = await response.json();
      if (result.success) {
        console.log(`✅ Auto-migration successful: ${result.transactionSignature}`);
      } else {
        console.error(`❌ Auto-migration failed: ${result.error}`);
      }
    } catch (error) {
      console.error(`❌ Error triggering auto-migration for pool ${poolAddress}:`, error);
    }
  }

  /**
   * Get all pools (implement based on your system)
   */
  private async getAllPools(): Promise<any[]> {
    // This should call your existing pools API
    try {
      const response = await fetch('/api/pools/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ includeAll: true }),
      });

      const result = await response.json();
      return result.success ? result.pools : [];
    } catch (error) {
      console.error('❌ Error fetching pools:', error);
      return [];
    }
  }

  /**
   * Handle WebSocket reconnection
   */
  private handleReconnection() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      
      setTimeout(() => {
        this.connectWebSocket().catch(error => {
          console.error('❌ Reconnection failed:', error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('❌ Max reconnection attempts reached');
      this.config.onError?.(new Error('Max reconnection attempts reached'));
    }
  }

  /**
   * Stop the migration stream
   */
  async stop() {
    try {
      console.log('🛑 Stopping migration stream...');
      
      // Close WebSocket connection
      if (this.wsConnection) {
        this.wsConnection.close();
        this.wsConnection = null;
      }
      
      // Remove all account change listeners
      for (const [poolAddress, subscription] of this.poolSubscriptions) {
        await this.connection.removeAccountChangeListener(subscription);
      }
      
      this.poolSubscriptions.clear();
      this.migrationStatus.clear();
      this.isConnected = false;
      
      console.log('✅ Migration stream stopped');
    } catch (error) {
      console.error('❌ Error stopping migration stream:', error);
    }
  }

  /**
   * Get current migration status for all monitored pools
   */
  getMigrationStatus(): Map<string, PoolMigrationStatus> {
    return new Map(this.migrationStatus);
  }

  /**
   * Check if service is connected
   */
  isServiceConnected(): boolean {
    return this.isConnected;
  }
}
