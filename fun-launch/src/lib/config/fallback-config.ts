export const FALLBACK_CONFIG = {
  // Fallback to Solana devnet when Helius is not available
  RPC_URL: 'https://api.devnet.solana.com',
  WS_URL: 'wss://api.devnet.solana.com',
  
  // Fallback polling intervals
  MIGRATION_CHECK_INTERVAL: 5000, // 5 seconds
  MARKET_DATA_INTERVAL: 5000, // 5 seconds
  
  // Fallback batch sizes
  MIGRATION_BATCH_SIZE: 3,
  TRADE_BATCH_SIZE: 5,
  
  // Error handling
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 2000,
  
  // Logging
  LOG_LEVEL: 'warn',
  DEBUG_MODE: false,
};

export const getFallbackConfig = () => {
  return FALLBACK_CONFIG;
};

export const isFallbackEnabled = () => {
  // Always enable fallback when Helius is not available
  return true;
};
