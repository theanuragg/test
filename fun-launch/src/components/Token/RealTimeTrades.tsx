import React, { useState, useEffect, useRef } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { toast } from 'sonner';

interface Trade {
  signature: string;
  timestamp: Date;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  user: string;
}

interface RealTimeTradesProps {
  poolAddress: string;
  baseMint: string;
  quoteMint: string;
}

export function RealTimeTrades({ poolAddress, baseMint, quoteMint }: RealTimeTradesProps) {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const connectionRef = useRef<Connection | null>(null);
  const wsConnectionRef = useRef<WebSocket | null>(null);
  const lastSignatureRef = useRef<string>('');

  // Initialize connection
  useEffect(() => {
    const initialize = async () => {
      try {
        // Use devnet connection
        connectionRef.current = new Connection('https://api.devnet.solana.com', 'confirmed');
        console.log('✅ Real-time trades connection initialized on devnet');
        
        // Get initial trades
        await loadRecentTrades();
        
        // Setup WebSocket for real-time updates
        setupWebSocket();
        
        setLoading(false);
      } catch (err) {
        console.error('❌ Failed to initialize trades connection:', err);
        setError('Failed to initialize connection');
        setLoading(false);
      }
    };

    initialize();

    return () => {
      if (wsConnectionRef.current) {
        // Close with normal closure code
        wsConnectionRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [poolAddress]);

  // Load recent trades
  const loadRecentTrades = async () => {
    if (!connectionRef.current) return;

    try {
      const poolPubkey = new PublicKey(poolAddress);
      
      // Get recent signatures for the pool
      const signatures = await connectionRef.current.getSignaturesForAddress(
        poolPubkey,
        { limit: 20 }
      );

      const recentTrades: Trade[] = [];
      
      for (const sig of signatures) {
        try {
          const tx = await connectionRef.current!.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });
          
          if (tx && tx.meta && tx.blockTime) {
            // Parse transaction to determine if it's a trade
            const trade = parseTradeTransaction(tx, sig.signature);
            if (trade) {
              recentTrades.push(trade);
            }
          }
        } catch (err) {
          // Skip failed transactions
          continue;
        }
      }

      // Sort by timestamp (newest first)
      recentTrades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setTrades(recentTrades);
      
      // Store last signature for WebSocket updates
      if (recentTrades.length > 0) {
        lastSignatureRef.current = recentTrades[0].signature;
      }
      
    } catch (err) {
      console.error('❌ Error loading recent trades:', err);
    }
  };

  // Parse transaction to extract trade information
  const parseTradeTransaction = (tx: any, signature: string): Trade | null => {
    try {
      // Look for DBC program instructions
      const instructions = tx.transaction.message.instructions;
      
      for (const instruction of instructions) {
        // Check if this is a DBC swap instruction
        if (instruction.programId === 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN') {
          // This is a DBC transaction - extract basic info
          const timestamp = new Date(tx.blockTime * 1000);
          
          // Determine trade type based on account changes
          const preBalances = tx.meta.preBalances;
          const postBalances = tx.meta.postBalances;
          
          // Simple heuristic: if SOL balance increased, it's a sell; if decreased, it's a buy
          let totalBalanceChange = 0;
          for (let i = 0; i < preBalances.length; i++) {
            totalBalanceChange += (postBalances[i] - preBalances[i]);
          }
          
          const type = totalBalanceChange > 0 ? 'sell' : 'buy';
          const amount = Math.abs(totalBalanceChange) / 1e9; // Convert lamports to SOL
          
          // Extract user address (first signer)
          const user = tx.transaction.message.accountKeys[0];
          
          return {
            signature,
            timestamp,
            type,
            amount,
            price: 0, // We'll calculate this separately
            user
          };
        }
      }
      
      return null;
    } catch (err) {
      console.error('❌ Error parsing trade transaction:', err);
      return null;
    }
  };

  // Setup WebSocket for real-time updates
  const setupWebSocket = () => {
    try {
      const wsUrl = 'wss://api.devnet.solana.com';
      
      // Close existing connection if any
      if (wsConnectionRef.current) {
        wsConnectionRef.current.close();
      }
      
      wsConnectionRef.current = new WebSocket(wsUrl);
      
      wsConnectionRef.current.onopen = () => {
        console.log('✅ WebSocket connected for real-time trades');
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
                poolAddress,
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
          
          if (data.method === 'accountNotification') {
            console.log('🔄 Pool account updated, checking for new trades...');
            
            // Check for new transactions
            await checkForNewTrades();
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
  };

  // Check for new trades
  const checkForNewTrades = async () => {
    if (!connectionRef.current) return;

    try {
      const poolPubkey = new PublicKey(poolAddress);
      
      // Get recent signatures
      const signatures = await connectionRef.current.getSignaturesForAddress(
        poolPubkey,
        { limit: 5 }
      );

      const newTrades: Trade[] = [];
      
      for (const sig of signatures) {
        // Skip if we've already seen this signature
        if (sig.signature === lastSignatureRef.current) {
          break;
        }
        
        try {
          const tx = await connectionRef.current!.getTransaction(sig.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });
          
          if (tx && tx.meta && tx.blockTime) {
            const trade = parseTradeTransaction(tx, sig.signature);
            if (trade) {
              newTrades.push(trade);
              
              // Show toast for new trade
              toast.success(`${trade.type.toUpperCase()}: ${trade.amount.toFixed(4)} SOL`, {
                description: `New trade detected!`
              });
            }
          }
        } catch (err) {
          continue;
        }
      }

      if (newTrades.length > 0) {
        // Add new trades to the beginning
        setTrades(prev => [...newTrades, ...prev].slice(0, 50)); // Keep only 50 most recent
        
        // Update last signature
        lastSignatureRef.current = newTrades[0].signature;
      }
      
    } catch (err) {
      console.error('❌ Error checking for new trades:', err);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">Loading...</span>
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-3 bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm text-red-400">Error</span>
          </div>
        </div>
        <div className="text-red-400 text-sm mb-4">{error}</div>
        <button
          onClick={loadRecentTrades}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Recent Trades</h3>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={loadRecentTrades}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-gray-400 text-sm">No trades found</div>
          <div className="text-gray-500 text-xs mt-2">Trades will appear here when they happen</div>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {trades.map((trade, index) => (
            <div key={trade.signature} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${trade.type === 'buy' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <div>
                  <div className="text-white font-medium">
                    {trade.type.toUpperCase()} {trade.amount.toFixed(4)} SOL
                  </div>
                  <div className="text-gray-400 text-xs">
                    {trade.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-gray-300 text-sm">
                  {trade.user.slice(0, 4)}...{trade.user.slice(-4)}
                </div>
                <div className="text-gray-500 text-xs">
                  {trade.signature.slice(0, 8)}...
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Real-time indicator */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Real-time trade monitoring</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
