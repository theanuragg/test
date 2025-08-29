# Helius Indexing Services Integration

This document explains how to set up and use Helius indexing services in the Fun-Launch application.

## 🎯 Overview

Helius provides enhanced blockchain data indexing services that offer:
- **Enhanced Transaction Data**: Detailed transaction information with parsed events
- **Token Metadata**: Comprehensive token information including off-chain data
- **Real-time Webhooks**: Live transaction monitoring and notifications
- **Address History**: Complete transaction history for any address
- **NFT Data**: Specialized NFT metadata and collection information

## 🚀 Setup Instructions

### 1. Get Helius API Key

1. Visit [Helius Dashboard](https://dev.helius.xyz/)
2. Create an account and get your API key
3. Choose the appropriate plan for your needs

### 2. Environment Configuration

Add the following environment variables to your `.env.local` file:

```bash
# Helius Configuration
HELIUS_API_KEY=your_helius_api_key_here
NEXT_PUBLIC_HELIUS_RPC_URL=https://rpc.helius.xyz/?api-key=your_helius_api_key_here

# Feature Flags
NEXT_PUBLIC_ENABLE_HELIUS_INDEXING=true
NEXT_PUBLIC_ENABLE_REAL_TIME_DATA=true
NEXT_PUBLIC_ENABLE_WEBHOOKS=true
```

### 3. API Key Security

- **Server-side**: Use `HELIUS_API_KEY` for API endpoints
- **Client-side**: Use `NEXT_PUBLIC_HELIUS_RPC_URL` for RPC calls
- Never expose your API key in client-side code

## 📊 Available Services

### 1. Enhanced Transaction Service

```typescript
import { useHeliusTransactionHistory } from '@/hooks/useHeliusIndexing';

// Get transaction history for an address
const { data, loading, error } = useHeliusTransactionHistory(
  'wallet_address_here',
  {
    limit: 50,
    transactionTypes: ['swap', 'transfer'],
    before: '2024-01-01',
    until: '2024-12-31'
  }
);
```

**Features:**
- Filter by transaction types (swap, transfer, mint, burn, defi)
- Date range filtering
- Pagination support
- Event parsing (swap events, transfer events)

### 2. Token Metadata Service

```typescript
import { useHeliusTokenData } from '@/hooks/useHeliusIndexing';

// Get comprehensive token data
const { data, loading, error } = useHeliusTokenData(
  'token_mint_address_here',
  {
    includeTransactions: true,
    includeBalances: true,
    transactionLimit: 10
  }
);
```

**Features:**
- Complete token metadata
- Recent transaction history
- Token balances across addresses
- Off-chain metadata integration

### 3. Webhook Management

```typescript
import { useHeliusWebhooks } from '@/hooks/useHeliusIndexing';

// Manage webhooks
const { webhooks, createWebhook, deleteWebhook } = useHeliusWebhooks();

// Create a webhook for token monitoring
await createWebhook({
  webhookUrl: 'https://your-endpoint.com/webhook',
  webhookName: 'Token Monitor',
  transactionTypes: ['transfer', 'swap', 'mint', 'burn'],
  accountFilters: ['token_mint_address']
});
```

**Features:**
- Real-time transaction monitoring
- Multiple transaction type filtering
- Account-specific filtering
- Webhook management (create, list, delete)

## 🔧 API Endpoints

### 1. Token Data API

**Endpoint:** `POST /api/helius/token-data`

**Request:**
```json
{
  "mintAddress": "token_mint_address",
  "includeTransactions": true,
  "includeBalances": true,
  "transactionLimit": 10
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "metadata": { /* token metadata */ },
    "transactions": [ /* recent transactions */ ],
    "balances": [ /* token balances */ ],
    "comprehensive": { /* combined data */ }
  }
}
```

### 2. Transaction History API

**Endpoint:** `POST /api/helius/transaction-history`

**Request:**
```json
{
  "address": "wallet_address",
  "limit": 50,
  "transactionTypes": ["swap", "transfer"],
  "before": "2024-01-01",
  "until": "2024-12-31"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "transactions": [ /* transaction list */ ],
    "total": 150,
    "hasMore": true
  }
}
```

### 3. Webhook Management API

**Create Webhook:** `POST /api/helius/webhook-setup`
**List Webhooks:** `GET /api/helius/webhook-setup`
**Delete Webhook:** `DELETE /api/helius/webhook-setup`

## 🎨 React Components

### HeliusDataDisplay Component

```tsx
import { HeliusDataDisplay } from '@/components/HeliusIndexing/HeliusDataDisplay';

// Use the component
<HeliusDataDisplay 
  mintAddress="token_mint_address"
  walletAddress="wallet_address"
/>
```

**Features:**
- Tabbed interface (Token Data, Transaction History, Webhooks)
- Interactive search functionality
- Real-time data display
- Webhook management interface

## 🔄 Real-time Monitoring

### 1. Token Monitoring

```typescript
import { useHeliusTokenMonitoring } from '@/hooks/useHeliusIndexing';

const { setupTokenMonitoring } = useHeliusTokenMonitoring();

// Set up monitoring for a specific token
await setupTokenMonitoring(
  'token_mint_address',
  'https://your-webhook-endpoint.com/token-events',
  'My Token Monitor'
);
```

### 2. DeFi Activity Monitoring

```typescript
const { setupDeFiMonitoring } = useHeliusTokenMonitoring();

// Monitor DeFi activity for a wallet
await setupDeFiMonitoring(
  'wallet_address',
  'https://your-webhook-endpoint.com/defi-events',
  'DeFi Activity Monitor'
);
```

## 📈 Use Cases

### 1. Token Analytics Dashboard

```typescript
// Get comprehensive token analytics
const tokenData = await helius.getComprehensiveTokenData(mintAddress);

// Display:
// - Token metadata and market data
// - Recent transaction activity
// - Holder distribution
// - Price impact analysis
```

### 2. Wallet Activity Tracking

```typescript
// Track wallet activity
const defiEvents = await helius.getDeFiEvents(walletAddress, 100);

// Filter for:
// - Swap transactions
// - Liquidity provision
// - Yield farming activities
// - Token transfers
```

### 3. Real-time Notifications

```typescript
// Set up webhook for instant notifications
await createWebhook({
  webhookUrl: 'https://your-app.com/api/notifications',
  transactionTypes: ['swap'],
  accountFilters: [poolAddress],
  webhookName: 'Pool Activity Monitor'
});
```

## 🛠️ Error Handling

### Common Error Scenarios

1. **API Key Issues**
   ```typescript
   // Check if API key is configured
   if (!process.env.HELIUS_API_KEY) {
     throw new Error('Helius API key not configured');
   }
   ```

2. **Rate Limiting**
   ```typescript
   // Implement retry logic
   const response = await fetch(url, {
     headers: { 'Authorization': `Bearer ${apiKey}` }
   });
   
   if (response.status === 429) {
     // Implement exponential backoff
     await delay(1000 * Math.pow(2, retryCount));
   }
   ```

3. **Invalid Addresses**
   ```typescript
   // Validate Solana addresses
   if (!isValidSolanaAddress(address)) {
     throw new Error('Invalid Solana address');
   }
   ```

## 🔒 Security Best Practices

1. **API Key Management**
   - Store API keys in environment variables
   - Use different keys for development and production
   - Rotate keys regularly

2. **Rate Limiting**
   - Implement client-side rate limiting
   - Use caching for frequently requested data
   - Monitor API usage

3. **Data Validation**
   - Validate all input addresses
   - Sanitize webhook URLs
   - Implement request size limits

## 📊 Performance Optimization

### 1. Caching Strategy

```typescript
// Cache token metadata
const tokenCache = new Map();

const getCachedTokenData = async (mintAddress: string) => {
  if (tokenCache.has(mintAddress)) {
    return tokenCache.get(mintAddress);
  }
  
  const data = await helius.tokens.getTokenMetadata(mintAddress);
  tokenCache.set(mintAddress, data);
  return data;
};
```

### 2. Batch Requests

```typescript
// Batch multiple token requests
const tokenAddresses = ['token1', 'token2', 'token3'];
const metadata = await helius.tokens.getMultipleTokenMetadata(tokenAddresses);
```

### 3. Pagination

```typescript
// Implement pagination for large datasets
const getPaginatedTransactions = async (address: string, page: number, limit: number) => {
  const offset = page * limit;
  return await helius.transactions.getAddressHistory(address, limit, offset);
};
```

## 🚀 Deployment Considerations

### 1. Environment Variables

Ensure all Helius-related environment variables are set in your deployment environment:

```bash
# Production environment
HELIUS_API_KEY=prod_helius_api_key
NEXT_PUBLIC_HELIUS_RPC_URL=https://rpc.helius.xyz/?api-key=prod_helius_api_key
```

### 2. Webhook Endpoints

For production webhooks, ensure your endpoints are:
- Publicly accessible
- Handle POST requests
- Implement proper authentication
- Return 200 status codes

### 3. Monitoring

Set up monitoring for:
- API response times
- Error rates
- Webhook delivery success
- Rate limit usage

## 📚 Additional Resources

- [Helius Documentation](https://docs.helius.xyz/)
- [API Reference](https://docs.helius.xyz/reference)
- [Webhook Guide](https://docs.helius.xyz/webhooks)
- [Rate Limits](https://docs.helius.xyz/rate-limits)

## 🤝 Support

For issues with Helius integration:
1. Check the [Helius Discord](https://discord.gg/helius)
2. Review [Helius Status](https://status.helius.xyz/)
3. Contact Helius support for API-specific issues
