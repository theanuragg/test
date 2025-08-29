/**
 * Transaction Indexing Service for Meteora Launchpad
 * 
 * Fetches and indexes transaction data for buy/sell actions from Meteora DBC and DAMM v2 pools
 * Extracts: amount (USDC/SOL), token amounts, dates, and Solscan links
 * 
 * Programs:
 * - DBC Program: dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN
 * - DAMM v2 Program: cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG
 */

import { Connection, PublicKey, ParsedTransactionWithMeta } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

// Meteora Program IDs
const METEORA_PROGRAMS = {
  DBC: 'dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN',
  DAMM_V2: 'cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG'
} as const;

// Types for indexed transaction data
export interface IndexedTransaction {
  signature: string;
  blockTime: number;
  date: string;
  action: 'buy' | 'sell';
  programType: 'DBC' | 'DAMM_V2';
  amountIn: {
    value: number;
    currency: 'USDC' | 'SOL';
    decimals: number;
  };
  amountOut: {
    value: number;
    tokenSymbol: string;
    tokenMint: string;
    decimals: number;
  };
  price: number;
  priceImpact: number;
  poolAddress: string;
  userWallet: string;
  solscanUrl: string;
  explorerUrl: string;
  fee: number;
  slot: number;
  programId: string;
}

export interface TransactionIndexerConfig {
  rpcUrl: string;
  network: 'mainnet' | 'devnet';
  batchSize?: number;
  maxRetries?: number;
}

export interface IndexingFilters {
  poolAddress?: string;
  userWallet?: string;
  startDate?: Date;
  endDate?: Date;
  action?: 'buy' | 'sell';
  programType?: 'DBC' | 'DAMM_V2';
  minAmount?: number;
  maxAmount?: number;
}

/**
 * Main Transaction Indexer Class
 */
export class TransactionIndexer {
  private connection: Connection;
  private dbcClient: DynamicBondingCurveClient;
  private config: TransactionIndexerConfig;

  constructor(config: TransactionIndexerConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.dbcClient = new DynamicBondingCurveClient(this.connection, 'confirmed');
  }

  /**
   * Get Solscan URL for a transaction
   */
  private getSolscanUrl(signature: string): string {
    const network = this.config.network === 'mainnet' ? 'mainnet' : 'devnet';
    return `https://solscan.io/tx/${signature}?cluster=${network}`;
  }

  /**
   * Get Solana Explorer URL for a transaction
   */
  private getExplorerUrl(signature: string): string {
    const network = this.config.network === 'mainnet' ? 'mainnet' : 'devnet';
    return `https://explorer.solana.com/tx/${signature}?cluster=${network}`;
  }

  /**
   * Check if transaction involves Meteora programs
   */
  private isMeteoraTransaction(tx: ParsedTransactionWithMeta): { isMeteora: boolean; programType?: 'DBC' | 'DAMM_V2'; programId?: string } {
    if (!tx.transaction?.message?.instructions) {
      return { isMeteora: false };
    }

    for (const instruction of tx.transaction.message.instructions) {
      if ('programId' in instruction) {
        const programId = instruction.programId.toString();
        if (programId === METEORA_PROGRAMS.DBC) {
          return { isMeteora: true, programType: 'DBC', programId };
        }
        if (programId === METEORA_PROGRAMS.DAMM_V2) {
          return { isMeteora: true, programType: 'DAMM_V2', programId };
        }
      }
    }

    return { isMeteora: false };
  }

  /**
   * Parse transaction to extract buy/sell data from Meteora programs
   */
  private async parseTransaction(
    signature: string,
    tx: ParsedTransactionWithMeta,
    poolAddress: string
  ): Promise<IndexedTransaction | null> {
    try {
      if (!tx.meta || !tx.transaction) {
        return null;
      }

      // Check if this is a Meteora transaction
      const meteoraCheck = this.isMeteoraTransaction(tx);
      if (!meteoraCheck.isMeteora) {
        return null; // Skip non-Meteora transactions
      }

      const { meta, transaction } = tx;
      const blockTime = tx.blockTime || 0;
      const date = new Date(blockTime * 1000).toISOString();

      // Extract user wallet from transaction
      const userWallet = transaction.message.accountKeys[0]?.pubkey?.toString() || '';

      // Parse pre and post token balances to determine action and amounts
      const preBalances = meta.preTokenBalances || [];
      const postBalances = meta.postTokenBalances || [];

      // Find USDC and token balance changes
      const usdcMint = this.config.network === 'mainnet' 
        ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'  // Mainnet USDC
        : 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'; // Devnet USDC

      let usdcChange = 0;
      let tokenChange = 0;
      let tokenMint = '';
      let tokenSymbol = '';

      // Calculate balance changes
      for (const preBalance of preBalances) {
        const postBalance = postBalances.find(pb => pb.mint === preBalance.mint);
        const preAmount = parseFloat(preBalance.uiTokenAmount.uiAmountString || '0');
        const postAmount = parseFloat(postBalance?.uiTokenAmount.uiAmountString || '0');
        const change = postAmount - preAmount;

        if (preBalance.mint === usdcMint) {
          usdcChange = change;
        } else {
          tokenChange = change;
          tokenMint = preBalance.mint;
          tokenSymbol = preBalance.uiTokenAmount.symbol || 'Unknown';
        }
      }

      // Determine action (buy/sell)
      let action: 'buy' | 'sell';
      let amountIn: IndexedTransaction['amountIn'];
      let amountOut: IndexedTransaction['amountOut'];

      if (usdcChange < 0 && tokenChange > 0) {
        // User spent USDC, received tokens = BUY
        action = 'buy';
        amountIn = {
          value: Math.abs(usdcChange),
          currency: 'USDC',
          decimals: 6
        };
        amountOut = {
          value: Math.abs(tokenChange),
          tokenSymbol,
          tokenMint,
          decimals: 9
        };
      } else if (usdcChange > 0 && tokenChange < 0) {
        // User received USDC, spent tokens = SELL
        action = 'sell';
        amountIn = {
          value: Math.abs(tokenChange),
          currency: 'USDC',
          decimals: 9
        };
        amountOut = {
          value: Math.abs(usdcChange),
          tokenSymbol: 'USDC',
          tokenMint: usdcMint,
          decimals: 6
        };
      } else {
        // Not a buy/sell transaction
        return null;
      }

      // Calculate price and price impact
      const price = amountIn.value / amountOut.value;
      const priceImpact = 0; // TODO: Calculate from pool state

      return {
        signature,
        blockTime,
        date,
        action,
        programType: meteoraCheck.programType!,
        amountIn,
        amountOut,
        price,
        priceImpact,
        poolAddress,
        userWallet,
        solscanUrl: this.getSolscanUrl(signature),
        explorerUrl: this.getExplorerUrl(signature),
        fee: meta.fee,
        slot: tx.slot,
        programId: meteoraCheck.programId!
      };

    } catch (error) {
      console.error(`Error parsing transaction ${signature}:`, error);
      return null;
    }
  }

  /**
   * Get transaction signatures for a pool
   */
  private async getPoolTransactionSignatures(
    poolAddress: string,
    limit: number = 100
  ): Promise<string[]> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(poolAddress),
        { limit }
      );
      
      return signatures.map(sig => sig.signature);
    } catch (error) {
      console.error(`Error fetching signatures for pool ${poolAddress}:`, error);
      return [];
    }
  }

  /**
   * Get transaction signatures for Meteora programs
   */
  private async getMeteoraTransactionSignatures(
    programType?: 'DBC' | 'DAMM_V2',
    limit: number = 100
  ): Promise<string[]> {
    try {
      const programIds = programType 
        ? [METEORA_PROGRAMS[programType]]
        : [METEORA_PROGRAMS.DBC, METEORA_PROGRAMS.DAMM_V2];

      const allSignatures: string[] = [];
      
      for (const programId of programIds) {
        const signatures = await this.connection.getSignaturesForAddress(
          new PublicKey(programId),
          { limit: Math.ceil(limit / programIds.length) }
        );
        allSignatures.push(...signatures.map(sig => sig.signature));
      }
      
      // Remove duplicates and limit results
      const uniqueSignatures = [...new Set(allSignatures)].slice(0, limit);
      return uniqueSignatures;
    } catch (error) {
      console.error(`Error fetching Meteora program signatures:`, error);
      return [];
    }
  }

  /**
   * Get transaction signatures for a user wallet
   */
  private async getUserTransactionSignatures(
    userWallet: string,
    limit: number = 100
  ): Promise<string[]> {
    try {
      const signatures = await this.connection.getSignaturesForAddress(
        new PublicKey(userWallet),
        { limit }
      );
      
      return signatures.map(sig => sig.signature);
    } catch (error) {
      console.error(`Error fetching signatures for wallet ${userWallet}:`, error);
      return [];
    }
  }

  /**
   * Fetch and parse transactions in batches
   */
  private async fetchTransactionsBatch(
    signatures: string[],
    poolAddress: string
  ): Promise<IndexedTransaction[]> {
    const batchSize = this.config.batchSize || 10;
    const transactions: IndexedTransaction[] = [];

    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      
      try {
        const txs = await this.connection.getParsedTransactions(batch, 'confirmed');
        
        for (let j = 0; j < batch.length; j++) {
          const tx = txs[j];
          if (tx) {
            const parsed = await this.parseTransaction(batch[j], tx, poolAddress);
            if (parsed) {
              transactions.push(parsed);
            }
          }
        }

        // Add delay between batches to avoid rate limiting
        if (i + batchSize < signatures.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`Error fetching batch ${i}-${i + batchSize}:`, error);
      }
    }

    return transactions;
  }

  /**
   * Index transactions for a specific pool
   */
  async indexPoolTransactions(
    poolAddress: string,
    filters?: IndexingFilters
  ): Promise<IndexedTransaction[]> {
    console.log(`🔍 Indexing transactions for pool: ${poolAddress}`);

    // Get transaction signatures
    const signatures = await this.getPoolTransactionSignatures(
      poolAddress,
      filters?.maxAmount || 100
    );

    if (signatures.length === 0) {
      console.log('No transactions found for pool');
      return [];
    }

    // Fetch and parse transactions
    const transactions = await this.fetchTransactionsBatch(signatures, poolAddress);

    // Apply filters
    let filteredTransactions = transactions;

    if (filters) {
      filteredTransactions = transactions.filter(tx => {
        // Date filter
        if (filters.startDate && tx.blockTime < filters.startDate.getTime() / 1000) {
          return false;
        }
        if (filters.endDate && tx.blockTime > filters.endDate.getTime() / 1000) {
          return false;
        }

        // Action filter
        if (filters.action && tx.action !== filters.action) {
          return false;
        }

        // Program type filter
        if (filters.programType && tx.programType !== filters.programType) {
          return false;
        }

        // Amount filter
        if (filters.minAmount && tx.amountIn.value < filters.minAmount) {
          return false;
        }
        if (filters.maxAmount && tx.amountIn.value > filters.maxAmount) {
          return false;
        }

        // User wallet filter
        if (filters.userWallet && tx.userWallet !== filters.userWallet) {
          return false;
        }

        return true;
      });
    }

    console.log(`✅ Indexed ${filteredTransactions.length} transactions for pool ${poolAddress}`);
    return filteredTransactions;
  }

  /**
   * Index all Meteora transactions (DBC and DAMM v2)
   */
  async indexMeteoraTransactions(
    filters?: IndexingFilters
  ): Promise<IndexedTransaction[]> {
    console.log(`🔍 Indexing all Meteora transactions`);

    // Get transaction signatures from Meteora programs
    const signatures = await this.getMeteoraTransactionSignatures(
      filters?.programType,
      filters?.maxAmount || 100
    );

    if (signatures.length === 0) {
      console.log('No Meteora transactions found');
      return [];
    }

    // Fetch and parse transactions
    const transactions = await this.fetchTransactionsBatch(signatures, '');

    // Apply filters
    let filteredTransactions = transactions;

    if (filters) {
      filteredTransactions = transactions.filter(tx => {
        // Date filter
        if (filters.startDate && tx.blockTime < filters.startDate.getTime() / 1000) {
          return false;
        }
        if (filters.endDate && tx.blockTime > filters.endDate.getTime() / 1000) {
          return false;
        }

        // Action filter
        if (filters.action && tx.action !== filters.action) {
          return false;
        }

        // Program type filter
        if (filters.programType && tx.programType !== filters.programType) {
          return false;
        }

        // Amount filter
        if (filters.minAmount && tx.amountIn.value < filters.minAmount) {
          return false;
        }
        if (filters.maxAmount && tx.amountIn.value > filters.maxAmount) {
          return false;
        }

        // User wallet filter
        if (filters.userWallet && tx.userWallet !== filters.userWallet) {
          return false;
        }

        return true;
      });
    }

    console.log(`✅ Indexed ${filteredTransactions.length} Meteora transactions`);
    return filteredTransactions;
  }

  /**
   * Index transactions for a specific user wallet
   */
  async indexUserTransactions(
    userWallet: string,
    poolAddress?: string,
    filters?: IndexingFilters
  ): Promise<IndexedTransaction[]> {
    console.log(`🔍 Indexing transactions for user: ${userWallet}`);

    // Get transaction signatures
    const signatures = await this.getUserTransactionSignatures(
      userWallet,
      filters?.maxAmount || 100
    );

    if (signatures.length === 0) {
      console.log('No transactions found for user');
      return [];
    }

    // If pool address is specified, filter signatures that involve the pool
    let relevantSignatures = signatures;
    if (poolAddress) {
      // This would require additional logic to filter signatures by pool
      // For now, we'll fetch all and filter during parsing
    }

    // Fetch and parse transactions
    const transactions = await this.fetchTransactionsBatch(
      relevantSignatures,
      poolAddress || ''
    );

    // Apply filters
    let filteredTransactions = transactions;

    if (filters) {
      filteredTransactions = transactions.filter(tx => {
        // Date filter
        if (filters.startDate && tx.blockTime < filters.startDate.getTime() / 1000) {
          return false;
        }
        if (filters.endDate && tx.blockTime > filters.endDate.getTime() / 1000) {
          return false;
        }

        // Action filter
        if (filters.action && tx.action !== filters.action) {
          return false;
        }

        // Amount filter
        if (filters.minAmount && tx.amountIn.value < filters.minAmount) {
          return false;
        }
        if (filters.maxAmount && tx.amountIn.value > filters.maxAmount) {
          return false;
        }

        // Pool filter
        if (poolAddress && tx.poolAddress !== poolAddress) {
          return false;
        }

        return true;
      });
    }

    console.log(`✅ Indexed ${filteredTransactions.length} transactions for user ${userWallet}`);
    return filteredTransactions;
  }

  /**
   * Get transaction statistics
   */
  async getTransactionStats(
    poolAddress: string,
    filters?: IndexingFilters
  ): Promise<{
    totalTransactions: number;
    totalVolume: number;
    buyCount: number;
    sellCount: number;
    averagePrice: number;
    uniqueUsers: number;
  }> {
    const transactions = await this.indexPoolTransactions(poolAddress, filters);

    const totalTransactions = transactions.length;
    const totalVolume = transactions.reduce((sum, tx) => sum + tx.amountIn.value, 0);
    const buyCount = transactions.filter(tx => tx.action === 'buy').length;
    const sellCount = transactions.filter(tx => tx.action === 'sell').length;
    const averagePrice = transactions.length > 0 
      ? transactions.reduce((sum, tx) => sum + tx.price, 0) / transactions.length 
      : 0;
    const uniqueUsers = new Set(transactions.map(tx => tx.userWallet)).size;

    return {
      totalTransactions,
      totalVolume,
      buyCount,
      sellCount,
      averagePrice,
      uniqueUsers
    };
  }

  /**
   * Get recent transactions with pagination
   */
  async getRecentTransactions(
    poolAddress: string,
    page: number = 1,
    pageSize: number = 20,
    filters?: IndexingFilters
  ): Promise<{
    transactions: IndexedTransaction[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
  }> {
    const allTransactions = await this.indexPoolTransactions(poolAddress, filters);
    
    // Sort by block time (newest first)
    const sortedTransactions = allTransactions.sort((a, b) => b.blockTime - a.blockTime);
    
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const transactions = sortedTransactions.slice(startIndex, endIndex);
    
    return {
      transactions,
      total: allTransactions.length,
      page,
      pageSize,
      hasMore: endIndex < allTransactions.length
    };
  }
}

// Export singleton instance
let indexerInstance: TransactionIndexer | null = null;

export function initializeTransactionIndexer(config: TransactionIndexerConfig): TransactionIndexer {
  if (!indexerInstance) {
    indexerInstance = new TransactionIndexer(config);
  }
  return indexerInstance;
}

export function getTransactionIndexer(): TransactionIndexer | null {
  return indexerInstance;
}
