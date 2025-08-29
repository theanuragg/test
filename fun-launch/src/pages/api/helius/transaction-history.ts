/**
 * Helius Transaction History API
 * 
 * Provides detailed transaction history using Helius indexing services
 */

import { NextApiRequest, NextApiResponse } from 'next';
import { initializeHelius } from '@/lib/helius/indexing';

interface TransactionHistoryRequest {
  address: string;
  limit?: number;
  before?: string;
  until?: string;
  transactionTypes?: string[];
}

interface TransactionHistoryResponse {
  success: boolean;
  data?: {
    transactions: any[];
    total: number;
    hasMore: boolean;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<TransactionHistoryResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed. Use POST.' 
    });
  }

  try {
    const { 
      address, 
      limit = 50, 
      before, 
      until, 
      transactionTypes 
    }: TransactionHistoryRequest = req.body;

    // Validate required fields
    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Missing required field: address'
      });
    }

    // Get Helius API key from environment
    const heliusApiKey = process.env.HELIUS_API_KEY;
    if (!heliusApiKey) {
      return res.status(500).json({
        success: false,
        error: 'Helius API key not configured'
      });
    }

    // Initialize Helius instance
    const helius = initializeHelius(heliusApiKey);

    console.log(`📊 Fetching transaction history for address: ${address}`);

    // Fetch transaction history
    const transactions = await helius.transactions.getAddressHistory(address, limit);

    // Filter by transaction types if specified
    let filteredTransactions = transactions;
    if (transactionTypes && transactionTypes.length > 0) {
      filteredTransactions = transactions.filter(tx => {
        // Check if transaction has any of the specified types
        return transactionTypes.some(type => {
          switch (type) {
            case 'transfer':
              return tx.events?.transfer;
            case 'swap':
              return tx.events?.swap;
            case 'mint':
              return tx.transaction.message.instructions.some(ix => 
                ix.programId?.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
              );
            case 'burn':
              return tx.transaction.message.instructions.some(ix => 
                ix.programId?.includes('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA')
              );
            case 'defi':
              return tx.events?.swap || 
                     tx.transaction.message.instructions.some(ix => 
                       ix.programId && (
                         ix.programId.includes('JUP') ||
                         ix.programId.includes('METEORA') ||
                         ix.programId.includes('RAYDIUM')
                       )
                     );
            default:
              return true;
          }
        });
      });
    }

    // Filter by date range if specified
    if (before || until) {
      filteredTransactions = filteredTransactions.filter(tx => {
        const txTime = tx.blockTime * 1000; // Convert to milliseconds
        
        if (before && txTime >= new Date(before).getTime()) {
          return false;
        }
        
        if (until && txTime <= new Date(until).getTime()) {
          return false;
        }
        
        return true;
      });
    }

    console.log(`✅ Found ${filteredTransactions.length} transactions for ${address}`);

    const response: TransactionHistoryResponse = {
      success: true,
      data: {
        transactions: filteredTransactions,
        total: filteredTransactions.length,
        hasMore: filteredTransactions.length === limit,
      }
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error fetching transaction history:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    res.status(500).json({
      success: false,
      error: `Failed to fetch transaction history: ${errorMessage}`
    });
  }
}
