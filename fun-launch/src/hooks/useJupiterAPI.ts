/**
 * React Hook for Jupiter API Integration
 * 
 * Provides easy access to Jupiter APIs with React state management
 */

import { useState, useEffect, useCallback } from 'react';
import { jupiterAPI, TokenPrice, TokenInfo, SwapQuote } from '../lib/jupiter/api-client';

// Hook for token price data
export function useTokenPrice(mintAddress: string | null, vsToken: string = 'USDC') {
  const [price, setPrice] = useState<TokenPrice | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPrice = useCallback(async () => {
    if (!mintAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const priceData = await jupiterAPI.price.getTokenPrice(mintAddress, vsToken);
      setPrice(priceData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price');
    } finally {
      setLoading(false);
    }
  }, [mintAddress, vsToken]);

  useEffect(() => {
    fetchPrice();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  return { price, loading, error, refetch: fetchPrice };
}

// Hook for token information
export function useTokenInfo(mintAddress: string | null) {
  const [info, setInfo] = useState<TokenInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInfo = useCallback(async () => {
    if (!mintAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const tokenInfo = await jupiterAPI.token.getTokenInfo(mintAddress);
      setInfo(tokenInfo);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token info');
    } finally {
      setLoading(false);
    }
  }, [mintAddress]);

  useEffect(() => {
    fetchInfo();
  }, [fetchInfo]);

  return { info, loading, error, refetch: fetchInfo };
}

// Hook for comprehensive token data
export function useTokenData(mintAddress: string | null) {
  const [data, setData] = useState<{
    price: TokenPrice | null;
    info: TokenInfo | null;
    isVerified: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!mintAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const tokenData = await jupiterAPI.getTokenData(mintAddress);
      setData(tokenData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch token data');
    } finally {
      setLoading(false);
    }
  }, [mintAddress]);

  useEffect(() => {
    fetchData();
    
    // Auto-refresh price data every 30 seconds
    const interval = setInterval(() => {
      if (mintAddress) {
        jupiterAPI.getTokenData(mintAddress).then(setData).catch(console.error);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [fetchData, mintAddress]);

  return { data, loading, error, refetch: fetchData };
}

// Hook for swap quotes
export function useSwapQuote() {
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getQuote = useCallback(async (params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
    poolAddress?: string; // optional DBC pool address for hybrid routing
  }) => {
    setLoading(true);
    setError(null);
    
    try {
      // Call hybrid swap API which decides between DBC and Jupiter
      const response = await fetch('/api/swap/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (!response.ok) throw new Error(`Quote API error: ${response.status}`);
      const data = await response.json();
      setQuote(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get swap quote');
    } finally {
      setLoading(false);
    }
  }, []);

  return { quote, loading, error, getQuote };
}

// Hook for market data (multiple tokens)
export function useMarketData(mintAddresses: string[]) {
  const [marketData, setMarketData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMarketData = useCallback(async () => {
    if (mintAddresses.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await jupiterAPI.getMarketData(mintAddresses);
      setMarketData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch market data');
    } finally {
      setLoading(false);
    }
  }, [mintAddresses]);

  useEffect(() => {
    fetchMarketData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMarketData, 30000);
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  return { marketData, loading, error, refetch: fetchMarketData };
}

// Hook for token discovery
export function useTokenDiscovery() {
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStrictTokens = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const strictTokens = await jupiterAPI.token.getStrictTokens();
      setTokens(strictTokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch strict tokens');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTokensByTag = useCallback(async (tag: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const taggedTokens = await jupiterAPI.token.getTokensByTag(tag);
      setTokens(taggedTokens);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tokens by tag');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    tokens,
    loading,
    error,
    fetchStrictTokens,
    fetchTokensByTag,
  };
}

// Hook for price history
export function usePriceHistory(mintAddress: string | null, days: number = 7) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!mintAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const priceHistory = await jupiterAPI.price.getPriceHistory(mintAddress, 'USDC', days);
      setHistory(priceHistory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch price history');
    } finally {
      setLoading(false);
    }
  }, [mintAddress, days]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}
