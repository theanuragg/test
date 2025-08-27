# DBC Pool Setup for Fun Launch

## Overview

This document describes the setup and configuration for creating Dynamic Bonding Curve (DBC) pools with multiple quote tokens (USDC and SOL) in the Fun Launch platform.

## Features

### DBC Pool Configuration
- **Pool Type**: Dynamic Bonding Curve (DBC) with automated market making
- **Quote Tokens**: Support for USDC and SOL as trading pairs
- **Dynamic Pricing**: Real-time price discovery through bonding curves
- **Reduced IL**: Lower impermanent loss for liquidity providers

### Supported Quote Tokens

| Token | Symbol | Address | Description |
|-------|--------|---------|-------------|
| USDC | USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` | USD Coin - Stable trading pair |
| SOL | SOL | `So11111111111111111111111111111111111111112` | Solana - Native token trading |

## Implementation Details

### Frontend Components
- **Pool Type Selection**: Dropdown to choose between DBC and Standard pools
- **Quote Token Selection**: Checkbox interface for selecting quote tokens
- **Form Validation**: Ensures at least one quote token is selected
- **DBC Benefits Display**: Information panel showing DBC advantages

### Backend API
- **Enhanced Upload API**: Handles quote token configuration and pool type
- **DBC Pool Creation**: Uses Meteora DBC SDK for pool initialization
- **Multi-Quote Support**: Framework for creating pools with multiple quote tokens

### Key Files Modified
- `src/pages/create-pool.tsx` - Main pool creation interface
- `src/pages/api/upload.ts` - Backend pool creation logic
- `src/contexts/types.ts` - DBC protocol type definitions

## Usage

### Creating a DBC Pool

1. **Navigate** to `/create-pool` page
2. **Select Pool Type**: Choose "Dynamic Bonding Curve (DBC)"
3. **Choose Quote Tokens**: Select USDC and/or SOL
4. **Fill Token Details**: Name, symbol, logo, and social links
5. **Submit**: Pool will be created with DBC configuration

### Pool Configuration Options

```typescript
interface PoolConfig {
  poolType: 'DBC' | 'Standard';
  quoteTokens: string[]; // Array of quote token addresses
  tokenName: string;
  tokenSymbol: string;
  // ... other fields
}
```

## Technical Architecture

### DBC Protocol Integration
- Uses `@meteora-ag/dynamic-bonding-curve-sdk`
- Supports Meteora's DBC protocol for automated market making
- Configurable pool parameters and bonding curves

### Quote Token Management
- Flexible quote token selection system
- Support for adding new quote tokens in the future
- Validation and error handling for token selection

### Pool Creation Flow
1. User submits pool creation form
2. Frontend validates form data
3. Backend creates pool transaction using DBC SDK
4. Pool is initialized on Solana blockchain
5. Success confirmation with pool details

## Benefits of DBC Pools

### For Token Creators
- **Automated Liquidity**: No need to manually manage market making
- **Price Discovery**: Dynamic pricing based on supply and demand
- **Multiple Markets**: Trade against both USDC and SOL

### For Traders
- **Better Liquidity**: Automated market making ensures trading availability
- **Fair Pricing**: Dynamic curves prevent manipulation
- **Multiple Options**: Trade against preferred quote token

### For Liquidity Providers
- **Reduced IL**: Dynamic bonding curves minimize impermanent loss
- **Automated Management**: No need for active position management
- **Yield Opportunities**: Earn fees from automated trading

## Future Enhancements

### Planned Features
- **Additional Quote Tokens**: Support for more stablecoins and tokens
- **Custom Bonding Curves**: Configurable curve parameters
- **Advanced Pool Types**: Hybrid pools with multiple mechanisms
- **Analytics Dashboard**: Pool performance and trading metrics

### Integration Opportunities
- **Jupiter Integration**: Direct swap functionality
- **Wallet Integration**: Seamless trading experience
- **Cross-Chain Support**: Multi-chain DBC pools

## Configuration

### Environment Variables
```bash
RPC_URL=your_solana_rpc_url
POOL_CONFIG_KEY=your_pool_config_key
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_ACCOUNT_ID=your_r2_account_id
R2_BUCKET=your_r2_bucket_name
```

### Dependencies
```json
{
  "@meteora-ag/dynamic-bonding-curve-sdk": "^1.3.6",
  "@solana/web3.js": "^1.98.4",
  "@solana/spl-token": "^0.4.13"
}
```

## Troubleshooting

### Common Issues
1. **Quote Token Selection**: Ensure at least one quote token is selected
2. **Wallet Connection**: Verify Solana wallet is connected and has SOL for fees
3. **RPC Connection**: Check Solana RPC endpoint availability
4. **Pool Creation**: Verify pool configuration parameters

### Error Handling
- Form validation errors are displayed inline
- API errors are shown as toast notifications
- Transaction failures include detailed error messages

## Support

For technical support or questions about DBC pool setup:
- Check the project documentation
- Review error logs and console output
- Verify configuration and environment variables
- Ensure all dependencies are properly installed
