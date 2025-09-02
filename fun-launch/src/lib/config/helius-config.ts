export const HELIUS_CONFIG = {
  // Helius RPC endpoints
  RPC_URL: process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com',
  WS_URL: process.env.NEXT_PUBLIC_HELIUS_WS_URL || 'wss://api.devnet.solana.com',
  API_KEY: process.env.NEXT_PUBLIC_HELIUS_API_KEY || '',
  
  // WebSocket configuration
  WS_RECONNECT_ATTEMPTS: 5,
  WS_RECONNECT_DELAY: 1000,
  WS_HEARTBEAT_INTERVAL: 30000,
  
  // Stream configuration
  MIGRATION_STREAM_ENABLED: true,
  TRADE_STREAM_ENABLED: true,
  
  // Pool monitoring
  MAX_POOLS_MONITORED: 100,
  POOL_UPDATE_INTERVAL: 1000, // 1 second
  
  // Trade processing
  MAX_TRADE_HISTORY: 1000,
  TRADE_BATCH_SIZE: 10,
  
  // Migration processing
  MIGRATION_CHECK_INTERVAL: 1000, // 1 second
  MIGRATION_BATCH_SIZE: 5,
  
  // Error handling
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  
  // Logging
  LOG_LEVEL: process.env.NODE_ENV === 'production' ? 'error' : 'info',
  DEBUG_MODE: process.env.NODE_ENV !== 'production',
};

export const getHeliusConfig = () => {
  // Validate required configuration
  if (!HELIUS_CONFIG.API_KEY || HELIUS_CONFIG.API_KEY === 'your-api-key') {
    console.warn('⚠️ Helius API key not configured. Real-time streams will not work.');
    return null;
  }
  
  return HELIUS_CONFIG;
};

export const isHeliusEnabled = () => {
  const config = getHeliusConfig();
  return config !== null && 
         config.MIGRATION_STREAM_ENABLED && 
         config.TRADE_STREAM_ENABLED;
};
