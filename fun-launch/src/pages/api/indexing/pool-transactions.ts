/**
 * Pool Transactions API
 * 
 * Fetches indexed transaction data for a specific pool
 * Returns buy/sell actions with amounts, dates, and Solscan links
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { 
  initializeTransactionIndexer, 
  IndexingFilters 
} from '@/lib/indexing/transaction-indexer';

interface PoolTransactionsRequest {
  poolAddress?: string; // Optional for Meteora-wide queries
  page?: number;
  pageSize?: number;
  filters?: {
    userWallet?: string;
    startDate?: string;
    endDate?: string;
    action?: 'buy' | 'sell';
    programType?: 'DBC' | 'DAMM_V2';
    minAmount?: number;
    maxAmount?: number;
  };
}

interface PoolTransactionsResponse {
  success: boolean;
  data?: {
    transactions: any[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PoolTransactionsResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { 
      poolAddress, 
      page = 1, 
      pageSize = 20, 
      filters 
    }: PoolTransactionsRequest = req.body;

    // Validate required fields
    if (!poolAddress && !filters?.programType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: poolAddress or programType filter'
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

    console.log(`🔍 Fetching transactions for ${poolAddress ? `pool: ${poolAddress}` : 'Meteora programs'}`);

    // Get recent transactions with pagination
    let result;
    if (poolAddress) {
      result = await indexer.getRecentTransactions(
        poolAddress,
        page,
        pageSize,
        indexingFilters
      );
    } else {
      // Get all Meteora transactions
      const allTransactions = await indexer.indexMeteoraTransactions(indexingFilters);
      
      // Sort by block time (newest first)
      const sortedTransactions = allTransactions.sort((a, b) => b.blockTime - a.blockTime);
      
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      const transactions = sortedTransactions.slice(startIndex, endIndex);
      
      result = {
        transactions,
        total: allTransactions.length,
        page,
        pageSize,
        hasMore: endIndex < allTransactions.length
      };
    }

    console.log(`✅ Found ${result.transactions.length} transactions for ${poolAddress ? `pool ${poolAddress}` : 'Meteora programs'}`);

    const response: PoolTransactionsResponse = {
      success: true,
      data: {
        transactions: result.transactions.map(tx => ({
          signature: tx.signature,
          date: tx.date,
          action: tx.action,
          programType: tx.programType,
          programId: tx.programId,
          amountIn: {
            value: tx.amountIn.value,
            currency: tx.amountIn.currency,
            formatted: `${tx.amountIn.value.toFixed(tx.amountIn.decimals)} ${tx.amountIn.currency}`
          },
          amountOut: {
            value: tx.amountOut.value,
            tokenSymbol: tx.amountOut.tokenSymbol,
            formatted: `${tx.amountOut.value.toFixed(tx.amountOut.decimals)} ${tx.amountOut.tokenSymbol}`
          },
          price: tx.price,
          priceFormatted: `$${tx.price.toFixed(6)}`,
          userWallet: tx.userWallet,
          userWalletShort: `${tx.userWallet.slice(0, 4)}...${tx.userWallet.slice(-4)}`,
          solscanUrl: tx.solscanUrl,
          explorerUrl: tx.explorerUrl,
          fee: tx.fee,
          feeFormatted: `${(tx.fee / 1e9).toFixed(6)} SOL`,
          slot: tx.slot
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        hasMore: result.hasMore
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error fetching pool transactions:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      error: `Failed to fetch pool transactions: ${errorMessage}`
    });
  }
}
