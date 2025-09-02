import { useState, useEffect, useCallback, useRef } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { toast } from 'sonner';

interface MarketData {
  price: number;
  marketCap: number;
  volume24h: number;
  bondingCurveProgress: number;
  totalSupply: number;
  circulatingSupply: number;
  lastUpdated: Date;
}

interface RealTimeDataConfig {
  poolAddress: string;
  baseMint: string;
  quoteMint: string;
  tokenDecimals?: number;
  quoteDecimals?: number;
  updateInterval?: number; // milliseconds
}

export function useRealTimeData(config: RealTimeDataConfig) {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  const connectionRef = useRef<Connection | null>(null);
  const dbcClientRef = useRef<DynamicBondingCurveClient | null>(null);
  const wsConnectionRef = useRef<WebSocket | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastTradeRef = useRef<number>(0);

  // Initialize connection and DBC client
  const initializeConnection = useCallback(async () => {
    try {
      // Use devnet RPC for real-time data
      const rpcUrl = 'https://api.devnet.solana.com';
      connectionRef.current = new Connection(rpcUrl, 'confirmed');
      dbcClientRef.current = new DynamicBondingCurveClient(connectionRef.current, 'confirmed');
      
      console.log('✅ Real-time data connection initialized on devnet');
      return true;
    } catch (err) {
      console.error('❌ Failed to initialize connection:', err);
      setError('Failed to initialize connection');
      return false;
    }
  }, []);

  // Calculate market data from DBC pool state
  const calculateMarketData = useCallback(async (): Promise<MarketData | null> => {
    if (!connectionRef.current || !dbcClientRef.current) {
      console.error('❌ Connection not initialized');
      return null;
    }

    try {
      const poolAddress = new PublicKey(config.poolAddress);
      
      // Get current pool state
      const poolState = await dbcClientRef.current.state.getPool(poolAddress);
      if (!poolState) {
        console.error('❌ Pool state not found');
        return null;
      }

      // Debug: Log pool state structure
      console.log('🔍 Pool state structure:', {
        hasAccount: !!poolState.account,
        hasVirtualTokenReserves: !!poolState.virtualTokenReserves,
        hasVirtualQuoteReserves: !!poolState.virtualQuoteReserves,
        hasRealTokenReserves: !!poolState.realTokenReserves,
        hasRealQuoteReserves: !!poolState.realQuoteReserves,
        hasTotalSupply: !!poolState.totalSupply,
        poolStateKeys: Object.keys(poolState),
        accountKeys: poolState.account ? Object.keys(poolState.account) : 'No account',
        fullPoolState: JSON.stringify(poolState, null, 2)
      });

      // Get pool config for proper calculations
      const poolConfigData = await dbcClientRef.current.state.getPoolConfig(poolState.config);
      if (!poolConfigData) {
        console.error('❌ Pool config not found');
        return null;
      }

      console.log('🔍 Pool config:', {
        sqrtStartPrice: poolConfigData.sqrtStartPrice?.toNumber(),
        tokenDecimal: poolConfigData.tokenDecimal,
        curve: poolConfigData.curve?.length
      });

      // Access pool state properties safely based on Meteora DBC SDK structure
      // Based on the SDK documentation, these properties should be directly accessible
      const virtualTokenReserves = (poolState as any).virtualTokenReserves?.toNumber() || 0;
      const virtualQuoteReserves = (poolState as any).virtualQuoteReserves?.toNumber() || 0;
      const realTokenReserves = (poolState as any).realTokenReserves?.toNumber() || 0;
      const realQuoteReserves = (poolState as any).realQuoteReserves?.toNumber() || 0;
      const totalSupply = (poolState as any).totalSupply?.toNumber() || 0;

      console.log('🔍 Pool state values:', {
        virtualTokenReserves,
        virtualQuoteReserves,
        realTokenReserves,
        realQuoteReserves,
        totalSupply
      });

      // Price calculation using Meteora DBC formula
      // Based on the StackExchange answer: price = realQuoteReserves / realTokenReserves
      let price = 0;
      if (realTokenReserves > 0) {
        price = realQuoteReserves / realTokenReserves;
      }
      
      // Market cap calculation
      const marketCap = price * totalSupply;
      
      // Bonding curve progress calculation
      // Calculate progress based on virtual vs real reserves
      let bondingCurveProgress = 0;
      if (virtualTokenReserves > 0 && realTokenReserves > 0) {
        // Progress = (virtualTokenReserves - realTokenReserves) / virtualTokenReserves * 100
        const tokensSold = virtualTokenReserves - realTokenReserves;
        bondingCurveProgress = Math.max(0, Math.min(100, (tokensSold / virtualTokenReserves) * 100));
      }

      // Get 24h volume from recent transactions (devnet has limited data)
      const volume24h = await get24HourVolume(connectionRef.current, poolAddress);

      // Calculate circulating supply (tokens available for trading)
      const circulatingSupply = realTokenReserves;

      return {
        price,
        marketCap,
        volume24h,
        bondingCurveProgress,
        totalSupply,
        circulatingSupply,
        lastUpdated: new Date()
      };

    } catch (err) {
      console.error('❌ Error calculating market data:', err);
      return null;
    }
  }, [config.poolAddress, config.tokenDecimals]);

  // Get 24-hour volume from recent transactions (devnet-friendly)
  const get24HourVolume = async (connection: Connection, poolAddress: PublicKey): Promise<number> => {
    try {
      // On devnet, we'll use a simpler approach since there's limited transaction history
      const now = Date.now();
      const oneDayAgo = now - (24 * 60 * 60 * 1000);
      
      // Get recent signatures for the pool (limit to 100 on devnet)
      const signatures = await connection.getSignaturesForAddress(
        poolAddress,
        { limit: 100 }
      );

      // Filter signatures from last 24 hours
      const recentSignatures = signatures.filter(sig => 
        sig.blockTime && sig.blockTime * 1000 > oneDayAgo
      );

      // Calculate total volume from transactions
      let totalVolume = 0;
      
      // Process fewer transactions on devnet for performance
      for (const sig of recentSignatures.slice(0, 20)) {
        try {
          const tx = await connection.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });
          
          if (tx && tx.meta) {
            // Look for token transfers in the transaction
            const preBalances = tx.meta.preBalances;
            const postBalances = tx.meta.postBalances;
            
            // Calculate SOL volume (simplified)
            for (let i = 0; i < preBalances.length; i++) {
              const balanceChange = Math.abs(postBalances[i] - preBalances[i]);
              if (balanceChange > 0) {
                totalVolume += balanceChange / 1e9; // Convert lamports to SOL
              }
            }
          }
        } catch (err) {
          // Skip failed transactions (common on devnet)
          continue;
        }
      }

      return totalVolume;
    } catch (err) {
      console.error('❌ Error getting 24h volume (devnet):', err);
      return 0;
    }
  };

  // WebSocket connection for real-time updates
  const setupWebSocket = useCallback(() => {
    try {
      // Use devnet WebSocket for real-time updates
      const wsUrl = 'wss://api.devnet.solana.com';
      
      // Close existing connection if any
      if (wsConnectionRef.current) {
        wsConnectionRef.current.close();
      }
      
      wsConnectionRef.current = new WebSocket(wsUrl);
      
      wsConnectionRef.current.onopen = () => {
        console.log('✅ WebSocket connected for real-time updates');
      setIsConnected(true);
        
        // Wait a moment to ensure connection is fully established
        setTimeout(() => {
          if (wsConnectionRef.current?.readyState === WebSocket.OPEN) {
            // Subscribe to pool account changes
            const subscribeMessage = {
              jsonrpc: '2.0',
              id: 1,
              method: 'accountSubscribe',
              params: [
                config.poolAddress,
                {
                  encoding: 'base64',
                  commitment: 'confirmed'
                }
              ]
            };
            
            try {
              wsConnectionRef.current?.send(JSON.stringify(subscribeMessage));
              console.log('✅ WebSocket subscription sent');
            } catch (error) {
              console.error('❌ Failed to send WebSocket subscription:', error);
            }
          } else {
            console.error('❌ WebSocket not in OPEN state');
          }
        }, 100);
      };

      wsConnectionRef.current.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📡 WebSocket message received:', data);
          
          if (data.method === 'accountNotification') {
            console.log('🔄 Pool account updated, recalculating market data...');
            
            // Debounce rapid updates
            const now = Date.now();
            if (now - lastTradeRef.current > 1000) { // 1 second debounce
              lastTradeRef.current = now;
              
              const newMarketData = await calculateMarketData();
              if (newMarketData) {
                setMarketData(newMarketData);
                console.log('✅ Market data updated:', newMarketData);
                
                // Show toast for significant changes
                if (marketData) {
                  const priceChange = Math.abs(newMarketData.price - marketData.price) / marketData.price;
                  if (priceChange > 0.05) { // 5% price change
                    toast.success(`Price updated: $${newMarketData.price.toFixed(6)}`);
                  }
                }
              } else {
                console.error('❌ Failed to calculate new market data');
              }
            } else {
              console.log('⏱️ Update debounced, skipping...');
            }
          } else {
            console.log('📡 Other WebSocket message:', data.method);
          }
        } catch (err) {
          console.error('❌ Error processing WebSocket message:', err);
        }
      };

      wsConnectionRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      setIsConnected(false);
    };

      wsConnectionRef.current.onclose = (event) => {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        setIsConnected(false);
        
        // Only attempt to reconnect if it wasn't a manual close
        if (event.code !== 1000) {
          setTimeout(() => {
            if (wsConnectionRef.current?.readyState === WebSocket.CLOSED) {
              console.log('🔄 Attempting to reconnect WebSocket...');
              setupWebSocket();
            }
          }, 5000);
        }
      };

    } catch (err) {
      console.error('❌ Error setting up WebSocket:', err);
    }
  }, [config.poolAddress, calculateMarketData, marketData]);

  // Polling fallback for market data updates
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      console.log('🔄 Polling for market data updates...');
      try {
        const newMarketData = await calculateMarketData();
        if (newMarketData) {
          setMarketData(newMarketData);
          console.log('✅ Polling update completed:', newMarketData);
        } else {
          console.error('❌ Polling failed - no data returned');
        }
      } catch (error) {
        console.error('❌ Polling error:', error);
      }
    }, config.updateInterval || 5000); // Default 5 seconds for real-time updates
  }, [calculateMarketData, config.updateInterval]);

  // Initialize and start monitoring
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      setError(null);
      
      const success = await initializeConnection();
      if (success) {
        // Get initial market data
        const initialData = await calculateMarketData();
        if (initialData) {
          setMarketData(initialData);
          console.log('✅ Initial market data loaded:', initialData);
        } else {
          console.error('❌ Failed to load initial market data');
        }
        
        // Setup real-time monitoring
        setupWebSocket();
        startPolling();
      } else {
        console.error('❌ Failed to initialize connection');
      }
      
      setLoading(false);
    };

    initialize();

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (wsConnectionRef.current) {
        // Close with normal closure code
        wsConnectionRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [initializeConnection, calculateMarketData, setupWebSocket, startPolling]);

  // Manual refresh function
  const refreshData = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    setLoading(true);
    try {
      const newData = await calculateMarketData();
      if (newData) {
        setMarketData(newData);
        console.log('✅ Manual refresh completed:', newData);
        toast.success('Market data refreshed!');
      } else {
        console.error('❌ Manual refresh failed - no data returned');
        toast.error('Failed to refresh market data');
      }
    } catch (error) {
      console.error('❌ Manual refresh error:', error);
      toast.error('Error refreshing market data');
    }
    setLoading(false);
  }, [calculateMarketData]);

  // Listen for trade events and refresh data
  useEffect(() => {
    const handleTradeEvent = () => {
      console.log('🔄 Trade event detected, refreshing market data...');
      refreshData();
    };

    // Listen for custom trade events
    window.addEventListener('trade-executed', handleTradeEvent);
    
    // Also listen for focus events (when user returns to tab)
    const handleFocus = () => {
      console.log('🔄 Tab focused, refreshing market data...');
      refreshData();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('trade-executed', handleTradeEvent);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshData]);

  return {
    marketData,
    loading,
    error,
    isConnected,
    refreshData
  };
}
