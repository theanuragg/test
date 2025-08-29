/**
 * Jupiter API Client
 * 
 * Comprehensive integration with Jupiter APIs for trading, pricing, and market data
 */

// API Endpoints (use public Jupiter endpoints; handle 404s gracefully on devnet)
const JUPITER_ENDPOINTS = {
  // Price API
  PRICE: 'https://price.jup.ag/v6',
  // Tokens API
  TOKENS: 'https://tokens.jup.ag',
  // Swap API (kept for completeness; hybrid flow uses our backend)
  SWAP: 'https://lite-api.jup.ag/swap/v1',
  TRIGGER: 'https://lite-api.jup.ag/trigger/v1',
  
  // Advanced APIs (Requires API key)
  ULTRA: 'https://api.jup.ag/ultra/v1',
  LEND: 'https://api.jup.ag/lend/v1',
  SEND: 'https://api.jup.ag/send/v1',
  STUDIO: 'https://api.jup.ag/studio/v1',
} as const;

// Types
export interface TokenPrice {
  id: string;
  mintSymbol: string;
  vsToken: string;
  vsTokenSymbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  priceChange7d: number;
  marketCap: number;
}

export interface TokenInfo {
  address: string;
  chainId: number;
  decimals: number;
  name: string;
  symbol: string;
  logoURI: string;
  tags: string[];
  extensions: {
    coingeckoId?: string;
    website?: string;
    twitter?: string;
    discord?: string;
    telegram?: string;
  };
  organicScore?: number;
  isVerified?: boolean;
}

export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  platformFee: {
    feeBps: number;
    feeAccounts: Record<string, string>;
  };
  priceImpactPct: number;
  routePlan: any[];
  contextSlot: number;
  timeTaken: number;
}

export interface TriggerOrder {
  requestId: string;
  inputMint: string;
  outputMint: string;
  amount: string;
  triggerPrice: number;
  orderType: 'limit' | 'stop-loss' | 'take-profit';
  side: 'buy' | 'sell';
  status: 'active' | 'executed' | 'cancelled';
}

/**
 * Price API Service
 * Get real-time pricing data for tokens
 */
export class JupiterPriceService {
  private baseUrl = '/api/jupiter/price';

  /**
   * Get price for a single token
   */
  async getTokenPrice(mintAddress: string, vsToken: string = 'USDC'): Promise<TokenPrice | null> {
    try {
      const response = await fetch(`${this.baseUrl}?ids=${encodeURIComponent(mintAddress)}&vsToken=${encodeURIComponent(vsToken)}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return data.data[mintAddress] || null;
    } catch (error) {
      console.error('Error fetching token price:', error);
      return null;
    }
  }

  /**
   * Get prices for multiple tokens
   */
  async getMultipleTokenPrices(mintAddresses: string[], vsToken: string = 'USDC'): Promise<Record<string, TokenPrice>> {
    try {
      const ids = mintAddresses.join(',');
      const response = await fetch(`${this.baseUrl}?ids=${encodeURIComponent(ids)}&vsToken=${encodeURIComponent(vsToken)}`);
      if (!response.ok) return {};
      
      const data = await response.json();
      return data.data || {};
    } catch (error) {
      console.error('Error fetching multiple token prices:', error);
      return {};
    }
  }

  /**
   * Get price history for a token
   */
  async getPriceHistory(mintAddress: string, vsToken: string = 'USDC', days: number = 7): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/history?ids=${encodeURIComponent(mintAddress)}&vsToken=${encodeURIComponent(vsToken)}&days=${encodeURIComponent(String(days))}`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.data[mintAddress] || [];
    } catch (error) {
      console.error('Error fetching price history:', error);
      return [];
    }
  }
}

/**
 * Token API Service
 * Get token information and metadata
 */
export class JupiterTokenService {
  private baseUrl = '/api/jupiter/tokens';

  /**
   * Get token information by mint address
   */
  async getTokenInfo(mintAddress: string): Promise<TokenInfo | null> {
    try {
      // Jupiter tokens API may not include devnet custom mints; return null if 404
      const response = await fetch(`${this.baseUrl}/token?address=${encodeURIComponent(mintAddress)}`);
      if (!response.ok) return null;
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching token info:', error);
      return null;
    }
  }

  /**
   * Get strict token list (verified tokens)
   */
  async getStrictTokens(): Promise<TokenInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/strict`);
      if (!response.ok) return [];
      
      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      console.error('Error fetching strict tokens:', error);
      return [];
    }
  }

  /**
   * Get tokens by tag/category
   */
  async getTokensByTag(tag: string): Promise<TokenInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/tagged/${tag}`);
      
      if (!response.ok) {
        throw new Error(`Token API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.tokens || [];
    } catch (error) {
      console.error('Error fetching tokens by tag:', error);
      return [];
    }
  }
}

/**
 * Swap API Service
 * Handle token swaps and trading
 */
export class JupiterSwapService {
  private baseUrl = JUPITER_ENDPOINTS.SWAP;

  /**
   * Get swap quote
   */
  async getSwapQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
    onlyDirectRoutes?: boolean;
    asLegacyTransaction?: boolean;
  }): Promise<SwapQuote | null> {
    try {
      const response = await fetch(`${this.baseUrl}/quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount,
          slippageBps: params.slippageBps || 50,
          onlyDirectRoutes: params.onlyDirectRoutes || false,
          asLegacyTransaction: params.asLegacyTransaction || false,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Swap API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting swap quote:', error);
      return null;
    }
  }

  /**
   * Get swap transaction
   */
  async getSwapTransaction(params: {
    quoteResponse: SwapQuote;
    userPublicKey: string;
    wrapUnwrapSOL?: boolean;
  }): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse: params.quoteResponse,
          userPublicKey: params.userPublicKey,
          wrapUnwrapSOL: params.wrapUnwrapSOL || true,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Swap API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting swap transaction:', error);
      return null;
    }
  }
}

/**
 * Main Jupiter API Manager
 * Centralized service for all Jupiter API interactions
 */
export class JupiterAPIManager {
  public price: JupiterPriceService;
  public token: JupiterTokenService;
  public swap: JupiterSwapService;

  constructor() {
    this.price = new JupiterPriceService();
    this.token = new JupiterTokenService();
    this.swap = new JupiterSwapService();
  }

  /**
   * Get comprehensive token data (price + info)
   */
  async getTokenData(mintAddress: string): Promise<{
    price: TokenPrice | null;
    info: TokenInfo | null;
    isVerified: boolean;
  }> {
    try {
      const [price, info] = await Promise.all([
        this.price.getTokenPrice(mintAddress),
        this.token.getTokenInfo(mintAddress),
      ]);

      let finalInfo = info;
      // Fallback to Helius metadata if Jupiter has no info (common on devnet/new mints)
      if (!finalInfo) {
        try {
          const heliusRes = await fetch('/api/helius/token-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mintAddress, includeTransactions: false, includeBalances: false }),
          });
          if (heliusRes.ok) {
            const heliusJson = await heliusRes.json();
            const md = heliusJson?.data?.metadata || {};
            // Attempt to map Helius metadata to TokenInfo
            const name = md?.onChainMetadata?.data?.name || md?.name || 'Unknown';
            const symbol = md?.onChainMetadata?.data?.symbol || md?.symbol || 'TOKEN';
            const decimals = md?.onChainMetadata?.mintInfo?.decimals ?? md?.decimals ?? 9;
            const logoURI = md?.offChainMetadata?.image || md?.image || '';
            const website = md?.offChainMetadata?.website || md?.extensions?.website;
            const twitter = md?.offChainMetadata?.twitter || md?.extensions?.twitter;
            const discord = md?.offChainMetadata?.discord || md?.extensions?.discord;
            const telegram = md?.offChainMetadata?.telegram || md?.extensions?.telegram;

            finalInfo = {
              address: mintAddress,
              chainId: 103, // devnet
              decimals,
              name,
              symbol,
              logoURI,
              tags: [],
              extensions: {
                website,
                twitter,
                discord,
                telegram,
              },
              isVerified: false,
            } as TokenInfo;
          } else {
            // If Helius says not found, still return a stub so UI can render
            finalInfo = {
              address: mintAddress,
              chainId: 103,
              decimals: 9,
              name: 'Unknown',
              symbol: 'TOKEN',
              logoURI: '',
              tags: [],
              extensions: {},
              isVerified: false,
            } as TokenInfo;
          }
        } catch (e) {
          // As a last resort, return stub info to keep UI alive
          finalInfo = {
            address: mintAddress,
            chainId: 103,
            decimals: 9,
            name: 'Unknown',
            symbol: 'TOKEN',
            logoURI: '',
            tags: [],
            extensions: {},
            isVerified: false,
          } as TokenInfo;
        }
      }

      // Check if token is verified
      let isVerified = false;
      try {
        const strictTokens = await this.token.getStrictTokens();
        isVerified = strictTokens.some(token => token.address === mintAddress);
      } catch (e) {
        isVerified = false;
      }

      return {
        price: price || null,
        info: finalInfo || null,
        isVerified,
      };
    } catch (e) {
      // Absolute fallback if everything fails
      return { price: null, info: null, isVerified: false };
    }
  }

  /**
   * Get market data for multiple tokens
   */
  async getMarketData(mintAddresses: string[]): Promise<Record<string, any>> {
    const [prices, strictTokens] = await Promise.all([
      this.price.getMultipleTokenPrices(mintAddresses),
      this.token.getStrictTokens(),
    ]);

    const verifiedAddresses = new Set(strictTokens.map(token => token.address));

    const marketData: Record<string, any> = {};
    
    for (const mintAddress of mintAddresses) {
      marketData[mintAddress] = {
        price: prices[mintAddress] || null,
        isVerified: verifiedAddresses.has(mintAddress),
      };
    }

    return marketData;
  }
}

// Export singleton instance
export const jupiterAPI = new JupiterAPIManager();
