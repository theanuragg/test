/**
 * Transaction Indexing Hooks
 * 
 * React hooks for integrating with the transaction indexing service
 * Provides easy access to pool transactions, stats, and user data
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// Types for the indexed data
export interface IndexedTransaction {
  signature: string;
  date: string;
  action: 'buy' | 'sell';
  programType: 'DBC' | 'DAMM_V2';
  programId: string;
  amountIn: {
    value: number;
    currency: 'USDC' | 'SOL';
    formatted: string;
  };
  amountOut: {
    value: number;
    tokenSymbol: string;
    formatted: string;
  };
  price: number;
  priceFormatted: string;
  userWallet: string;
  userWalletShort: string;
  solscanUrl: string;
  explorerUrl: string;
  fee: number;
  feeFormatted: string;
  slot: number;
}

export interface TransactionStats {
  totalTransactions: number;
  totalVolume: number;
  totalVolumeFormatted: string;
  buyCount: number;
  sellCount: number;
  averagePrice: number;
  averagePriceFormatted: string;
  uniqueUsers: number;
  buyVolume: number;
  buyVolumeFormatted: string;
  sellVolume: number;
  sellVolumeFormatted: string;
  averageTransactionSize: number;
  averageTransactionSizeFormatted: string;
}

export interface IndexingFilters {
  userWallet?: string;
  startDate?: string;
  endDate?: string;
  action?: 'buy' | 'sell';
  programType?: 'DBC' | 'DAMM_V2';
  minAmount?: number;
  maxAmount?: number;
}

// API functions
const fetchPoolTransactions = async (
  poolAddress: string | null,
  page: number = 1,
  pageSize: number = 20,
  filters?: IndexingFilters
) => {
  const response = await fetch('/api/indexing/pool-transactions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ poolAddress, page, pageSize, filters })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch pool transactions: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch pool transactions');
  }

  return data.data;
};

const fetchTransactionStats = async (
  poolAddress: string,
  filters?: IndexingFilters
) => {
  const response = await fetch('/api/indexing/transaction-stats', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ poolAddress, filters })
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch transaction stats: ${response.statusText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch transaction stats');
  }

  return data.data;
};

// React Query Keys
const queryKeys = {
  poolTransactions: (poolAddress: string, page: number, pageSize: number, filters?: IndexingFilters) => 
    ['pool-transactions', poolAddress, page, pageSize, filters],
  transactionStats: (poolAddress: string, filters?: IndexingFilters) => 
    ['transaction-stats', poolAddress, filters]
};

/**
 * Hook to fetch pool transactions with pagination and filtering
 */
export function usePoolTransactions(
  poolAddress: string | null,
  page: number = 1,
  pageSize: number = 20,
  filters?: IndexingFilters,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: queryKeys.poolTransactions(poolAddress || '', page, pageSize, filters),
    queryFn: () => fetchPoolTransactions(poolAddress, page, pageSize, filters),
    enabled: (!!poolAddress || !!filters?.programType) && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch transaction statistics for a pool
 */
export function useTransactionStats(
  poolAddress: string | null,
  filters?: IndexingFilters,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: queryKeys.transactionStats(poolAddress || '', filters),
    queryFn: () => fetchTransactionStats(poolAddress!, filters),
    enabled: !!poolAddress && (options?.enabled !== false),
    refetchInterval: options?.refetchInterval,
    staleTime: 60000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch all Meteora transactions (DBC and DAMM v2)
 */
export function useMeteoraTransactions(
  page: number = 1,
  pageSize: number = 20,
  filters?: IndexingFilters,
  options?: {
    enabled?: boolean;
    refetchInterval?: number;
  }
) {
  return useQuery({
    queryKey: ['meteora-transactions', page, pageSize, filters],
    queryFn: () => fetchPoolTransactions(null, page, pageSize, filters),
    enabled: (options?.enabled !== false),
    refetchInterval: options?.refetchInterval,
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to refresh transaction data
 */
export function useRefreshTransactions() {
  const queryClient = useQueryClient();

  const refreshPoolTransactions = useCallback((
    poolAddress: string,
    page?: number,
    pageSize?: number,
    filters?: IndexingFilters
  ) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.poolTransactions(poolAddress, page || 1, pageSize || 20, filters)
    });
  }, [queryClient]);

  const refreshTransactionStats = useCallback((
    poolAddress: string,
    filters?: IndexingFilters
  ) => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.transactionStats(poolAddress, filters)
    });
  }, [queryClient]);

  const refreshAll = useCallback((poolAddress: string) => {
    queryClient.invalidateQueries({
      queryKey: ['pool-transactions', poolAddress]
    });
    queryClient.invalidateQueries({
      queryKey: ['transaction-stats', poolAddress]
    });
  }, [queryClient]);

  return {
    refreshPoolTransactions,
    refreshTransactionStats,
    refreshAll
  };
}

/**
 * Hook to get real-time transaction updates
 */
export function useRealTimeTransactions(
  poolAddress: string | null,
  page: number = 1,
  pageSize: number = 20,
  filters?: IndexingFilters
) {
  const { data, isLoading, error, refetch } = usePoolTransactions(
    poolAddress,
    page,
    pageSize,
    filters,
    {
      refetchInterval: 10000 // Refresh every 10 seconds
    }
  );

  return {
    transactions: data?.transactions || [],
    total: data?.total || 0,
    page: data?.page || 1,
    pageSize: data?.pageSize || 20,
    hasMore: data?.hasMore || false,
    isLoading,
    error,
    refetch
  };
}

/**
 * Hook to get transaction analytics
 */
export function useTransactionAnalytics(
  poolAddress: string | null,
  filters?: IndexingFilters
) {
  const { data: stats, isLoading: statsLoading, error: statsError } = useTransactionStats(
    poolAddress,
    filters,
    {
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );

  const { data: transactions, isLoading: txLoading } = usePoolTransactions(
    poolAddress,
    1,
    100, // Get more transactions for analytics
    filters,
    {
      refetchInterval: 30000
    }
  );

  // Calculate additional analytics
  const analytics = useMemo(() => {
    if (!transactions?.transactions || !stats) {
      return null;
    }

    const txs = transactions.transactions;
    
    // Price change over time
    const priceHistory = txs
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(tx => ({
        date: tx.date,
        price: tx.price
      }));

    // Volume by day
    const volumeByDay = txs.reduce((acc, tx) => {
      const date = tx.date.split('T')[0];
      if (!acc[date]) {
        acc[date] = { buy: 0, sell: 0, total: 0 };
      }
      if (tx.action === 'buy') {
        acc[date].buy += tx.amountIn.value;
      } else {
        acc[date].sell += tx.amountOut.value;
      }
      acc[date].total += tx.amountIn.value;
      return acc;
    }, {} as Record<string, { buy: number; sell: number; total: number }>);

    // Top traders
    const traderStats = txs.reduce((acc, tx) => {
      if (!acc[tx.userWallet]) {
        acc[tx.userWallet] = {
          wallet: tx.userWallet,
          walletShort: tx.userWalletShort,
          totalVolume: 0,
          transactionCount: 0,
          buyCount: 0,
          sellCount: 0
        };
      }
      acc[tx.userWallet].totalVolume += tx.amountIn.value;
      acc[tx.userWallet].transactionCount += 1;
      if (tx.action === 'buy') {
        acc[tx.userWallet].buyCount += 1;
      } else {
        acc[tx.userWallet].sellCount += 1;
      }
      return acc;
    }, {} as Record<string, {
      wallet: string;
      walletShort: string;
      totalVolume: number;
      transactionCount: number;
      buyCount: number;
      sellCount: number;
    }>);

    const topTraders = Object.values(traderStats)
      .sort((a, b) => b.totalVolume - a.totalVolume)
      .slice(0, 10);

    return {
      priceHistory,
      volumeByDay,
      topTraders,
      stats
    };
  }, [transactions, stats]);

  return {
    analytics,
    isLoading: statsLoading || txLoading,
    error: statsError
  };
}

/**
 * Hook to export transaction data
 */
export function useExportTransactions() {
  const [isExporting, setIsExporting] = useState(false);

  const exportToCSV = useCallback(async (
    poolAddress: string,
    filters?: IndexingFilters
  ) => {
    setIsExporting(true);
    try {
      // Fetch all transactions
      const response = await fetch('/api/indexing/pool-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          poolAddress, 
          page: 1, 
          pageSize: 1000, // Get all transactions
          filters 
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch transactions for export');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch transactions');
      }

      const transactions = data.data.transactions;

      // Convert to CSV
      const csvHeaders = [
        'Date',
        'Action',
        'Amount In',
        'Amount Out',
        'Price',
        'User Wallet',
        'Transaction Hash',
        'Solscan URL'
      ];

      const csvRows = transactions.map((tx: IndexedTransaction) => [
        tx.date,
        tx.action,
        tx.amountIn.formatted,
        tx.amountOut.formatted,
        tx.priceFormatted,
        tx.userWallet,
        tx.signature,
        tx.solscanUrl
      ]);

      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      // Download CSV file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions-${poolAddress}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Export failed:', error);
      throw error;
    } finally {
      setIsExporting(false);
    }
  }, []);

  return {
    exportToCSV,
    isExporting
  };
}
