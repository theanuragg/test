# Solana RPC Setup Guide

## 🚨 403 Error Resolution

This guide helps you resolve the 403 "Access forbidden" error by setting up reliable RPC endpoints.

## Quick Fix

### 1. Environment Variable Setup

Create a `.env.local` file in your project root:

```bash
# Reliable RPC Endpoints (choose one)
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
# NEXT_PUBLIC_SOLANA_RPC_URL=https://solana-api.projectserum.com
# NEXT_PUBLIC_SOLANA_RPC_URL=https://solana.public-rpc.com
```

### 2. Restart Your Development Server

```bash
npm run dev
```

## Why 403 Errors Occur

1. **Rate Limiting**: Public RPC endpoints have strict limits
2. **IP Blocking**: Your IP may be blocked due to excessive requests
3. **Production Usage**: Public endpoints aren't meant for production

## Recommended RPC Providers

### Free Tier (Good for Development)

| Provider | Endpoint | Rate Limit | Reliability |
|----------|----------|------------|-------------|
| Solana Labs | `https://api.mainnet-beta.solana.com` | 200 RPS | ⭐⭐⭐⭐ |
| Serum | `https://solana-api.projectserum.com` | 800 RPS | ⭐⭐⭐⭐ |
| Public RPC | `https://solana.public-rpc.com` | 500 RPS | ⭐⭐⭐ |
| GetBlock | `https://solana.getblock.io/mainnet/` | 400 RPS | ⭐⭐⭐ |

### Paid Tier (Recommended for Production)

| Provider | Pricing | Features |
|----------|---------|----------|
| [QuickNode](https://quicknode.com) | $49/month | High performance, dedicated endpoints |
| [Alchemy](https://alchemy.com) | $49/month | Advanced APIs, webhooks |
| [Helius](https://helius.xyz) | $99/month | Enhanced APIs, webhooks |
| [Triton](https://triton.one) | $50/month | High availability |

## Implementation Details

### Automatic Fallback System

The application now includes:
- ✅ **Multiple RPC endpoints** with automatic fallback
- ✅ **Rate limiting** to prevent abuse
- ✅ **Connection health monitoring**
- ✅ **Retry logic** with exponential backoff

### Configuration Files

1. **`src/lib/config/rpc-config.ts`**: RPC endpoint configurations
2. **`src/lib/config/global-rpc.ts`**: Global connection management
3. **`src/lib/services/RealTimeDataService.ts`**: Updated with fallback logic

## Testing Your Setup

### 1. Test Connection

```typescript
import { testConnection, getGlobalConnection } from '@/lib/config/global-rpc';

const connection = getGlobalConnection();
const isHealthy = await testConnection(connection);
console.log('Connection healthy:', isHealthy);
```

### 2. Monitor Endpoint Usage

```typescript
import { getConnectionStatus } from '@/lib/config/global-rpc';

const status = getConnectionStatus();
console.log('Current endpoint:', status.endpoint);
console.log('Connected:', status.isConnected);
```

## Troubleshooting

### Still Getting 403 Errors?

1. **Check your endpoint**: Ensure you're using a reliable provider
2. **Reduce request frequency**: Implement proper rate limiting
3. **Use paid provider**: Consider upgrading to a paid RPC service
4. **Check IP restrictions**: Some providers block certain IP ranges

### Common Issues

| Error | Solution |
|-------|----------|
| 403 Forbidden | Switch to a different RPC endpoint |
| 429 Too Many Requests | Implement rate limiting |
| Connection timeout | Use a more reliable provider |
| Rate limit exceeded | Upgrade to paid tier |

## Production Recommendations

1. **Use paid RPC providers** for production applications
2. **Implement proper error handling** and retry logic
3. **Monitor RPC usage** and performance
4. **Set up multiple endpoints** for redundancy
5. **Use environment-specific configurations**

## Support

If you continue experiencing issues:
1. Check the [Solana RPC documentation](https://docs.solana.com/developing/clients/jsonrpc-api)
2. Contact your RPC provider's support
3. Consider using a dedicated RPC service

---

**Note**: This setup automatically handles fallbacks and rate limiting to prevent 403 errors.
