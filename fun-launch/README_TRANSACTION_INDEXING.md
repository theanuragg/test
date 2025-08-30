# Transaction Indexing Service for Meteora Launchpad

This document explains the **Transaction Indexing Service** for fun-launch, which fetches and indexes transaction data from Meteora DBC and DAMM v2 pools to provide comprehensive buy/sell analytics.

## 🎯 Meteora Programs Supported

- **DBC Program**: `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`
- **DAMM v2 Program**: `cpamdpZCGKUy5JxQXB4dcpGPiikHawvSWAd6mEn1sGG`

## 🎯 Overview

The Transaction Indexing Service provides:
- **Meteora-Specific Indexing**: Targets DBC and DAMM v2 program transactions
- **Real-time Transaction Data**: Fetches buy/sell actions from transaction signatures
- **Comprehensive Analytics**: Amounts, prices, dates, and user data
- **Solscan Integration**: Direct links to transaction blocks
- **Advanced Filtering**: Filter by action, program type, amount, user, and date ranges
- **Export Capabilities**: Download transaction data as CSV
- **Real-time Updates**: Automatic refresh and live data

## 🏗️ Architecture

### **Core Components**

1. **Transaction Indexer** (`src/lib/indexing/transaction-indexer.ts`)
   - Main indexing service that parses Solana transactions
   - Extracts buy/sell data from DBC pool transactions
   - Provides filtering and pagination capabilities

2. **API Endpoints**
   - `/api/indexing/pool-transactions` - Fetch transaction history
   - `/api/indexing/transaction-stats` - Get transaction statistics

3. **React Hooks** (`src/hooks/useTransactionIndexing.ts`)
   - `usePoolTransactions` - Fetch transaction history
   - `useTransactionStats` - Get transaction statistics
   - `useRealTimeTransactions` - Real-time updates
   - `useTransactionAnalytics` - Advanced analytics
   - `useExportTransactions` - Export functionality

4. **React Components** (`src/components/TransactionIndexing/`)
   - `TransactionHistory.tsx` - Complete transaction display component

## 🔧 Setup and Configuration

### **Environment Variables**

Ensure these are set in your `.env` file:

```bash
# Required for transaction indexing
RPC_URL=https://api.mainnet-beta.solana.com
NEXT_PUBLIC_NETWORK=mainnet  # or devnet
```

### **Dependencies**

The service uses these packages (already included):
```bash
@solana/web3.js
@meteora-ag/dynamic-bonding-curve-sdk
@tanstack/react-query
```

## 📊 Data Structure

### **Indexed Transaction**

```typescript
interface IndexedTransaction {
  signature: string;           // Transaction signature
  date: string;               // ISO date string
  action: 'buy' | 'sell';     // Transaction type
  programType: 'DBC' | 'DAMM_V2'; // Meteora program type
  programId: string;          // Program ID
  amountIn: {
    value: number;            // Amount in USDC/SOL
    currency: 'USDC' | 'SOL';
    formatted: string;        // Formatted display string
  };
  amountOut: {
    value: number;            // Token amount
    tokenSymbol: string;      // Token symbol
    formatted: string;        // Formatted display string
  };
  price: number;              // Price per token
  priceFormatted: string;     // Formatted price
  userWallet: string;         // User wallet address
  userWalletShort: string;    // Shortened wallet address
  solscanUrl: string;         // Solscan transaction link
  explorerUrl: string;        // Solana Explorer link
  fee: number;                // Transaction fee
  feeFormatted: string;       // Formatted fee
  slot: number;               // Block slot
}
```

### **Transaction Statistics**

```typescript
interface TransactionStats {
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
```

## 🚀 Usage Examples

### **1. Basic Transaction History**

```tsx
import { TransactionHistory } from '@/components/TransactionIndexing/TransactionHistory';

function TokenPage({ poolAddress }: { poolAddress: string }) {
  return (
    <div>
      <h1>Token Transactions</h1>
      <TransactionHistory poolAddress={poolAddress} />
    </div>
  );
}
```

### **2. Using React Hooks**

```tsx
import { usePoolTransactions, useTransactionStats } from '@/hooks/useTransactionIndexing';

function CustomTransactionView({ poolAddress }: { poolAddress: string }) {
  // Fetch transactions with pagination
  const { 
    transactions, 
    total, 
    hasMore, 
    isLoading 
  } = usePoolTransactions(poolAddress, 1, 20);

  // Fetch statistics
  const { data: stats } = useTransactionStats(poolAddress);

  return (
    <div>
      {stats && (
        <div>
          <p>Total Volume: {stats.totalVolumeFormatted}</p>
          <p>Total Transactions: {stats.totalTransactions}</p>
        </div>
      )}
      
      {transactions.map(tx => (
        <div key={tx.signature}>
          <p>{tx.action}: {tx.amountIn.formatted} → {tx.amountOut.formatted}</p>
          <a href={tx.solscanUrl} target="_blank">View on Solscan</a>
        </div>
      ))}
    </div>
  );
}
```

### **3. Meteora-Wide Transaction History**

```tsx
import { TransactionHistory } from '@/components/TransactionIndexing/TransactionHistory';

function MeteoraTransactionPage() {
  return (
    <div>
      <h1>All Meteora Transactions</h1>
      <TransactionHistory 
        showMeteoraPrograms={true} 
        className="mt-6" 
      />
    </div>
  );
}
```

### **4. Filter by Program Type**

```tsx
import { usePoolTransactions } from '@/hooks/useTransactionIndexing';

function DBCOnlyTransactions() {
  const filters = {
    programType: 'DBC' as const,
    action: 'buy' as const
  };

  const { transactions } = usePoolTransactions(null, 1, 50, filters);

  return (
    <div>
      <h2>DBC Buy Transactions Only</h2>
      {transactions.map(tx => (
        <div key={tx.signature}>
          <span className="badge">{tx.programType}</span>
          <span>{tx.action}: {tx.amountIn.formatted}</span>
        </div>
      ))}
    </div>
  );
}
```

### **3. Real-time Updates**

```tsx
import { useRealTimeTransactions } from '@/hooks/useTransactionIndexing';

function LiveTransactionFeed({ poolAddress }: { poolAddress: string }) {
  const { transactions, isLoading } = useRealTimeTransactions(poolAddress);

  return (
    <div>
      <h2>Live Transactions</h2>
      {transactions.slice(0, 5).map(tx => (
        <div key={tx.signature} className="live-tx">
          <span className={tx.action === 'buy' ? 'text-green-600' : 'text-red-600'}>
            {tx.action.toUpperCase()}
          </span>
          <span>{tx.amountIn.formatted}</span>
          <span>→</span>
          <span>{tx.amountOut.formatted}</span>
        </div>
      ))}
    </div>
  );
}
```

### **4. Advanced Filtering**

```tsx
import { usePoolTransactions } from '@/hooks/useTransactionIndexing';

function FilteredTransactions({ poolAddress }: { poolAddress: string }) {
  const filters = {
    action: 'buy' as const,
    minAmount: 100, // Only transactions >= $100
    startDate: '2024-01-01T00:00:00Z'
  };

  const { transactions } = usePoolTransactions(poolAddress, 1, 50, filters);

  return (
    <div>
      <h2>Large Buy Orders (≥$100)</h2>
      {transactions.map(tx => (
        <div key={tx.signature}>
          {tx.amountIn.formatted} → {tx.amountOut.formatted}
        </div>
      ))}
    </div>
  );
}
```

### **5. Export Functionality**

```tsx
import { useExportTransactions } from '@/hooks/useTransactionIndexing';

function ExportButton({ poolAddress }: { poolAddress: string }) {
  const { exportToCSV, isExporting } = useExportTransactions();

  const handleExport = async () => {
    try {
      await exportToCSV(poolAddress);
      alert('Export completed!');
    } catch (error) {
      alert('Export failed: ' + error.message);
    }
  };

  return (
    <button 
      onClick={handleExport} 
      disabled={isExporting}
    >
      {isExporting ? 'Exporting...' : 'Export to CSV'}
    </button>
  );
}
```

## 🔍 API Endpoints

### **POST /api/indexing/pool-transactions**

Fetch transaction history for a pool.

**Request:**
```json
{
  "poolAddress": "pool_address_here",
  "page": 1,
  "pageSize": 20,
  "filters": {
    "action": "buy",
    "minAmount": 100,
    "maxAmount": 1000,
    "userWallet": "wallet_address",
    "startDate": "2024-01-01T00:00:00Z",
    "endDate": "2024-12-31T23:59:59Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [
      {
        "signature": "tx_signature",
        "date": "2024-01-15T10:30:00.000Z",
        "action": "buy",
        "amountIn": {
          "value": 500,
          "currency": "USDC",
          "formatted": "500.00 USDC"
        },
        "amountOut": {
          "value": 1000,
          "tokenSymbol": "TOKEN",
          "formatted": "1000.00 TOKEN"
        },
        "price": 0.5,
        "priceFormatted": "$0.500000",
        "userWallet": "wallet_address",
        "userWalletShort": "abcd...wxyz",
        "solscanUrl": "https://solscan.io/tx/...",
        "explorerUrl": "https://explorer.solana.com/tx/...",
        "fee": 5000,
        "feeFormatted": "0.000005 SOL",
        "slot": 123456789
      }
    ],
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

### **POST /api/indexing/transaction-stats**

Get transaction statistics for a pool.

**Request:**
```json
{
  "poolAddress": "pool_address_here",
  "filters": {
    "action": "buy",
    "startDate": "2024-01-01T00:00:00Z"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalTransactions": 150,
    "totalVolume": 25000,
    "totalVolumeFormatted": "$25,000.00",
    "buyCount": 100,
    "sellCount": 50,
    "averagePrice": 0.5,
    "averagePriceFormatted": "$0.500000",
    "uniqueUsers": 75,
    "buyVolume": 20000,
    "buyVolumeFormatted": "$20,000.00",
    "sellVolume": 5000,
    "sellVolumeFormatted": "$5,000.00",
    "averageTransactionSize": 166.67,
    "averageTransactionSizeFormatted": "$166.67"
  }
}
```

## 🎨 Component Features

### **TransactionHistory Component**

The main component provides:

- **📊 Statistics Cards**: Total volume, buy/sell volumes, unique users
- **🔍 Advanced Filtering**: Filter by action, amount, user, date
- **📋 Data Table**: Sortable transaction history with pagination
- **🔗 Solscan Links**: Direct links to transaction blocks
- **📥 Export Functionality**: Download data as CSV
- **🔄 Real-time Updates**: Auto-refresh and manual refresh
- **📱 Responsive Design**: Works on all screen sizes

### **Key Features:**

1. **Smart Transaction Parsing**
   - Automatically detects buy/sell actions
   - Calculates prices and amounts
   - Handles USDC and SOL transactions

2. **Advanced Filtering**
   - Filter by transaction type (buy/sell)
   - Amount ranges (min/max)
   - User wallet addresses
   - Date ranges

3. **Real-time Data**
   - Automatic refresh every 10-30 seconds
   - Manual refresh capability
   - Loading states and error handling

4. **Export Capabilities**
   - CSV export with all transaction data
   - Includes Solscan links
   - Formatted for easy analysis

## 🔧 Configuration Options

### **Indexer Configuration**

```typescript
const indexerConfig = {
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  network: 'mainnet', // or 'devnet'
  batchSize: 10,      // Transactions per batch
  maxRetries: 3       // Retry attempts
};
```

### **Hook Options**

```typescript
// Real-time updates
usePoolTransactions(poolAddress, 1, 20, filters, {
  refetchInterval: 10000 // Refresh every 10 seconds
});

// Disable auto-refresh
usePoolTransactions(poolAddress, 1, 20, filters, {
  enabled: false
});
```

## 🚀 Performance Considerations

### **Optimizations**

1. **Batch Processing**: Transactions are fetched in batches to avoid rate limits
2. **Caching**: React Query provides intelligent caching
3. **Pagination**: Large datasets are paginated for performance
4. **Debounced Filtering**: Filters are applied efficiently

### **Rate Limiting**

- Default batch size: 10 transactions
- Delay between batches: 100ms
- Maximum retries: 3 attempts

## 🔒 Security

### **Data Validation**

- All inputs are validated and sanitized
- RPC URLs are validated
- Transaction signatures are verified
- Error handling for malformed data

### **Privacy**

- User wallet addresses are shortened for display
- No sensitive data is logged
- All API calls use HTTPS

## 📈 Analytics Capabilities

### **Available Metrics**

1. **Volume Analytics**
   - Total trading volume
   - Buy vs sell volume
   - Average transaction size
   - Volume by time period

2. **User Analytics**
   - Unique users
   - Top traders by volume
   - User transaction patterns

3. **Price Analytics**
   - Average price
   - Price trends over time
   - Price impact analysis

4. **Transaction Analytics**
   - Transaction count
   - Buy/sell ratio
   - Transaction frequency

## 🎯 Use Cases

### **1. Token Detail Pages**
Display comprehensive transaction history for any token pool.

### **2. Trading Analytics**
Analyze trading patterns and market activity.

### **3. User Portfolios**
Track user trading history and performance.

### **4. Market Research**
Export data for external analysis and reporting.

### **5. Real-time Monitoring**
Live transaction feeds for active trading.

## 🔧 Troubleshooting

### **Common Issues**

1. **No Transactions Found**
   - Verify pool address is correct
   - Check if pool has any trading activity
   - Ensure RPC URL is accessible

2. **Slow Loading**
   - Reduce batch size in configuration
   - Check RPC endpoint performance
   - Consider using a premium RPC service

3. **Filter Not Working**
   - Verify filter syntax
   - Check date format (ISO 8601)
   - Ensure wallet addresses are valid

### **Error Handling**

The service includes comprehensive error handling:
- Network errors with retry logic
- Invalid data validation
- User-friendly error messages
- Graceful degradation

## 📚 Additional Resources

- [Solana Web3.js Documentation](https://docs.solana.com/developing/clients/javascript-api)
- [Meteora DBC SDK Documentation](https://docs.meteora.ag/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Solscan API Documentation](https://public-api.solscan.io/)

---

This Transaction Indexing Service provides comprehensive transaction data for DBC pools, enabling advanced analytics and real-time monitoring of trading activity.
