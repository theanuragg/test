/**
 * Transaction Statistics API
 * 
 * Fetches transaction statistics for a specific pool
 * Returns volume, counts, and user data
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { 
  initializeTransactionIndexer, 
  IndexingFilters 
} from '@/lib/indexing/transaction-indexer';

interface TransactionStatsRequest {
  poolAddress: string;
  filters?: {
    userWallet?: string;
    startDate?: string;
    endDate?: string;
    action?: 'buy' | 'sell';
    minAmount?: number;
    maxAmount?: number;
  };
}

interface TransactionStatsResponse {
  success: boolean;
  data?: {
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
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TransactionStatsResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { poolAddress, filters }: TransactionStatsRequest = req.body;

    // Validate required fields
    if (!poolAddress) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: poolAddress'
      });
    }

    // Get RPC URL from environment
    const rpcUrl = process.env.RPC_URL || process.env.NEXT_PUBLIC_RPC_URL;
    if (!rpcUrl) {
      return res.status(500).json({
        success: false,
        error: 'RPC URL not configured'
      });
    }

    // Initialize transaction indexer
    const indexer = initializeTransactionIndexer({
      rpcUrl,
      network: (process.env.NEXT_PUBLIC_NETWORK as 'mainnet' | 'devnet') || 'devnet',
      batchSize: 10
    });

    // Convert filters
    let indexingFilters: IndexingFilters | undefined;
    if (filters) {
      indexingFilters = {
        userWallet: filters.userWallet,
        startDate: filters.startDate ? new Date(filters.startDate) : undefined,
        endDate: filters.endDate ? new Date(filters.endDate) : undefined,
        action: filters.action,
        minAmount: filters.minAmount,
        maxAmount: filters.maxAmount
      };
    }

    console.log(`📊 Fetching transaction stats for pool: ${poolAddress}`);

    // Get transaction statistics
    const stats = await indexer.getTransactionStats(poolAddress, indexingFilters);

    // Get all transactions to calculate additional stats
    const allTransactions = await indexer.indexPoolTransactions(poolAddress, indexingFilters);
    
    // Calculate additional statistics
    const buyTransactions = allTransactions.filter(tx => tx.action === 'buy');
    const sellTransactions = allTransactions.filter(tx => tx.action === 'sell');
    
    const buyVolume = buyTransactions.reduce((sum, tx) => sum + tx.amountIn.value, 0);
    const sellVolume = sellTransactions.reduce((sum, tx) => sum + tx.amountOut.value, 0);
    const averageTransactionSize = allTransactions.length > 0 
      ? stats.totalVolume / allTransactions.length 
      : 0;

    console.log(`✅ Calculated stats for pool ${poolAddress}`);

    const response: TransactionStatsResponse = {
      success: true,
      data: {
        totalTransactions: stats.totalTransactions,
        totalVolume: stats.totalVolume,
        totalVolumeFormatted: `$${stats.totalVolume.toFixed(2)}`,
        buyCount: stats.buyCount,
        sellCount: stats.sellCount,
        averagePrice: stats.averagePrice,
        averagePriceFormatted: `$${stats.averagePrice.toFixed(6)}`,
        uniqueUsers: stats.uniqueUsers,
        buyVolume: buyVolume,
        buyVolumeFormatted: `$${buyVolume.toFixed(2)}`,
        sellVolume: sellVolume,
        sellVolumeFormatted: `$${sellVolume.toFixed(2)}`,
        averageTransactionSize: averageTransactionSize,
        averageTransactionSizeFormatted: `$${averageTransactionSize.toFixed(2)}`
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error fetching transaction stats:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      error: `Failed to fetch transaction stats: ${errorMessage}`
    });
  }
}
