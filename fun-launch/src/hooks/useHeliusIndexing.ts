/**
 * Helius Indexing Hook
 * 
 * React hook for integrating Helius indexing services into components
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Types for hook responses
export interface HeliusTokenData {
  metadata: any;
  transactions?: any[];
  balances?: any[];
  comprehensive?: any;
}

export interface HeliusTransactionHistory {
  transactions: any[];
  total: number;
  hasMore: boolean;
}

export interface HeliusWebhookInfo {
  webhookID: string;
  webhookUrl: string;
  status: string;
}

export interface UseHeliusTokenDataOptions {
  includeTransactions?: boolean;
  includeBalances?: boolean;
  transactionLimit?: number;
  autoFetch?: boolean;
}

export interface UseHeliusTransactionHistoryOptions {
  limit?: number;
  before?: string;
  until?: string;
  transactionTypes?: string[];
  autoFetch?: boolean;
}

/**
 * Hook for fetching comprehensive token data
 */
export function useHeliusTokenData(
  mintAddress: string | null,
  options: UseHeliusTokenDataOptions = {}
) {
  const [data, setData] = useState<HeliusTokenData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    includeTransactions = true,
    includeBalances = true,
    transactionLimit = 10,
    autoFetch = true,
  } = options;

  const fetchTokenData = useCallback(async () => {
    if (!mintAddress) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/helius/token-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mintAddress,
          includeTransactions,
          includeBalances,
          transactionLimit,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch token data');
      }

      setData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to fetch token data: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [mintAddress, includeTransactions, includeBalances, transactionLimit]);

  useEffect(() => {
    if (autoFetch) {
      fetchTokenData();
    }
  }, [fetchTokenData, autoFetch]);

  return {
    data,
    loading,
    error,
    refetch: fetchTokenData,
  };
}

/**
 * Hook for fetching transaction history
 */
export function useHeliusTransactionHistory(
  address: string | null,
  options: UseHeliusTransactionHistoryOptions = {}
) {
  const [data, setData] = useState<HeliusTransactionHistory | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    limit = 50,
    before,
    until,
    transactionTypes,
    autoFetch = true,
  } = options;

  const fetchTransactionHistory = useCallback(async () => {
    if (!address) {
      setData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/helius/transaction-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address,
          limit,
          before,
          until,
          transactionTypes,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch transaction history');
      }

      setData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to fetch transaction history: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [address, limit, before, until, transactionTypes]);

  useEffect(() => {
    if (autoFetch) {
      fetchTransactionHistory();
    }
  }, [fetchTransactionHistory, autoFetch]);

  return {
    data,
    loading,
    error,
    refetch: fetchTransactionHistory,
  };
}

/**
 * Hook for managing webhooks
 */
export function useHeliusWebhooks() {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/helius/webhook-setup', {
        method: 'GET',
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch webhooks');
      }

      setWebhooks(result.data?.webhooks || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast.error(`Failed to fetch webhooks: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, []);

  const createWebhook = useCallback(async (webhookConfig: {
    webhookUrl: string;
    transactionTypes: string[];
    accountFilters?: string[];
    accountExcludeFilters?: string[];
    webhookName?: string;
  }): Promise<HeliusWebhookInfo | null> => {
    try {
      const response = await fetch('/api/helius/webhook-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookConfig),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to create webhook');
      }

      toast.success('Webhook created successfully');
      
      // Refresh webhook list
      await fetchWebhooks();
      
      return result.data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to create webhook: ${errorMessage}`);
      return null;
    }
  }, [fetchWebhooks]);

  const deleteWebhook = useCallback(async (webhookID: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/helius/webhook-setup', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookID }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to delete webhook');
      }

      toast.success('Webhook deleted successfully');
      
      // Refresh webhook list
      await fetchWebhooks();
      
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      toast.error(`Failed to delete webhook: ${errorMessage}`);
      return false;
    }
  }, [fetchWebhooks]);

  // Fetch webhooks on mount
  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  return {
    webhooks,
    loading,
    error,
    createWebhook,
    deleteWebhook,
    refetch: fetchWebhooks,
  };
}

/**
 * Hook for setting up token monitoring
 */
export function useHeliusTokenMonitoring() {
  const { createWebhook, deleteWebhook } = useHeliusWebhooks();

  const setupTokenMonitoring = useCallback(async (
    mintAddress: string,
    webhookUrl: string,
    webhookName?: string
  ): Promise<HeliusWebhookInfo | null> => {
    const webhookConfig = {
      webhookUrl,
      webhookName: webhookName || `Token Monitor - ${mintAddress.slice(0, 8)}...`,
      transactionTypes: ['transfer', 'swap', 'mint', 'burn'],
      accountFilters: [mintAddress],
    };

    return await createWebhook(webhookConfig);
  }, [createWebhook]);

  const setupDeFiMonitoring = useCallback(async (
    address: string,
    webhookUrl: string,
    webhookName?: string
  ): Promise<HeliusWebhookInfo | null> => {
    const webhookConfig = {
      webhookUrl,
      webhookName: webhookName || `DeFi Monitor - ${address.slice(0, 8)}...`,
      transactionTypes: ['swap', 'transfer'],
      accountFilters: [address],
    };

    return await createWebhook(webhookConfig);
  }, [createWebhook]);

  return {
    setupTokenMonitoring,
    setupDeFiMonitoring,
    deleteWebhook,
  };
}
