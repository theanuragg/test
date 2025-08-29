# Local Configuration Setup for Fun-Launch

This document explains how to set up and use the local `dbc_config.jsonc` file within fun-launch for configuration management.

## 🎯 Overview

Fun-launch uses a pre-configured DBC config key from environment variables, allowing you to:
- **Use existing configuration** without creating new configs
- **Simplified pool creation** using pre-created DBC config
- **Consistent settings** across all pools
- **Easy deployment** with minimal configuration

## 📁 File Structure

```
fun-launch/
├── src/
│   ├── lib/
│   │   └── studio/
│   │       ├── dbc-integration.ts # Studio integration logic
│   │       ├── helpers.ts        # Local helper functions
│   │       └── types.ts          # Local type definitions
│   └── pages/
│       └── api/
│           ├── config-status.ts  # Check config status
│           ├── create-pool-with-studio.ts # Pool creation with studio
│           └── upload.ts         # Updated to use pre-configured DBC config
└── README_LOCAL_CONFIG.md        # This file
```

## 🔧 Environment Configuration

### **Required Environment Variable**: `POOL_CONFIG_KEY`

Set this in your `.env` file to use your pre-created DBC config:

```bash
# .env file
POOL_CONFIG_KEY=your_pre_created_dbc_config_public_key_here
RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_NETWORK=devnet
```

## 🚀 Usage

### **1. Check Configuration Status**

Verify that your pre-configured DBC config is accessible:

```bash
# Check via API
curl http://localhost:3000/api/config-status

# Response
{
  "success": true,
  "isValid": true,
  "errors": [],
  "configKey": "your_pre_created_dbc_config_public_key",
  "message": "Pre-configured DBC config is valid and ready to use"
}
```

### **2. Basic Pool Creation (Uses Pre-configured DBC Config)**

The existing `/api/upload` endpoint now uses your pre-configured DBC config:

```typescript
const response = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenLogo: base64Image,
    tokenName: 'My Token',
    tokenSymbol: 'MTK',
    mint: 'generated_mint_address',
    userWallet: wallet.publicKey.toString(),
  }),
});
```

### **3. Pool Creation with Custom Config**

Override specific parameters from your local config:

```typescript
const response = await fetch('/api/create-pool-with-studio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenName: 'My Token',
    tokenSymbol: 'MTK',
    metadataUrl: 'https://example.com/metadata.json',
    userWallet: wallet.publicKey.toString(),
    // Override local config parameters
    initialMarketCap: 10000,              // Override local default 5000
    migrationMarketCap: 100000,           // Override local default 75000
    creatorTradingFeePercentage: 75,      // Override local default 50%
    dynamicFeeEnabled: false,             // Override local default true
  }),
});
```

## ⚙️ Configuration Management

### **Update Local Configuration**

You can modify the `config/dbc_config.jsonc` file directly:

```jsonc
{
  "rpcUrl": "https://api.mainnet-beta.solana.com", // Switch to mainnet
  "quoteMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC Mainnet
  "dbcConfig": {
    "initialMarketCap": 10000, // Increase initial market cap
    "migrationMarketCap": 100000, // Increase graduation market cap
    "creatorTradingFeePercentage": 75, // More fees to creator
    // ... other parameters
  }
}
```

### **Network-Specific Configuration**

The system automatically handles network-specific settings:

```typescript
// Mainnet
{
  "rpcUrl": "https://api.mainnet-beta.solana.com",
  "quoteMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC Mainnet
  "tokenQuoteDecimal": 6
}

// Devnet
{
  "rpcUrl": "https://api.devnet.solana.com",
  "quoteMint": "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr", // USDC Devnet
  "tokenQuoteDecimal": 6
}
```

## 🔍 Validation

### **Configuration Validation Rules**

The system validates your local configuration against these rules:

1. **Required Fields**: `rpcUrl`, `quoteMint`, `dbcConfig`
2. **Build Curve Mode**: Must be between 0-3
3. **Market Caps**: `migrationMarketCap` must be greater than `initialMarketCap`
4. **Token Supply**: Must be greater than 0
5. **Fee Percentages**: Must be between 0-100
6. **LP Percentages**: Must sum to 100%
7. **Vesting Parameters**: Cannot exceed total token supply

### **Validation Response**

```json
{
  "success": true,
  "isValid": false,
  "errors": [
    "migrationMarketCap must be greater than initialMarketCap",
    "Total LP percentages must equal 100%"
  ],
  "message": "Local configuration has validation errors"
}
```

## 🛠️ Development

### **Local Development Setup**

1. **Copy Configuration**:
   ```bash
   # The config/dbc_config.jsonc file is already included
   # No additional setup required
   ```

2. **Validate Configuration**:
   ```bash
   curl http://localhost:3000/api/config-status
   ```

3. **Test Pool Creation**:
   ```bash
   # Test with local config
   curl -X POST http://localhost:3000/api/upload \
     -H "Content-Type: application/json" \
     -d '{"tokenName":"Test","tokenSymbol":"TEST","tokenLogo":"data:image/png;base64,...","mint":"test_mint","userWallet":"your_wallet"}'
   ```

### **Customizing Configuration**

1. **Edit `config/dbc_config.jsonc`**:
   - Modify parameters as needed
   - Add comments for documentation
   - Test with validation endpoint

2. **Use Overrides in API**:
   - Keep local config as defaults
   - Override specific parameters via API
   - Maintain flexibility for different use cases

## 🔄 Migration from Studio

### **Before (Studio Dependency)**
```typescript
// Required studio folder
import { STUDIO_DEFAULT_CONFIG } from '../../../../studio/config/dbc_config.jsonc';
```

### **After (Local Configuration)**
```typescript
// Uses local config
import { getStudioDefaultConfig } from './config-template';
const config = getStudioDefaultConfig(); // Loads from local dbc_config.jsonc
```

## 🚨 Troubleshooting

### **Common Issues**

1. **"Failed to load local dbc_config.jsonc"**
   - Ensure `config/dbc_config.jsonc` exists
   - Check file permissions
   - Verify JSON syntax

2. **"Configuration validation failed"**
   - Run `/api/config-status` to see specific errors
   - Fix validation errors in the config file
   - Ensure all required fields are present

3. **"Invalid quote mint address"**
   - Check network configuration
   - Verify quote mint address for your network
   - Update `quoteMint` in config file

### **Debug Configuration**

```bash
# Check configuration status
curl http://localhost:3000/api/config-status | jq

# View current configuration template
curl http://localhost:3000/api/config-status | jq '.configTemplate'
```

## 📊 Benefits

### **✅ Independence**
- No dependency on studio folder
- Self-contained configuration management
- Easy to customize and maintain

### **✅ Flexibility**
- Local configuration as defaults
- API overrides for specific cases
- Network-specific handling

### **✅ Validation**
- Real-time configuration validation
- Error reporting and debugging
- Pre-flight checks before pool creation

### **✅ Development**
- Easy local development setup
- No external dependencies
- Version control friendly

---

**Note**: This local configuration setup provides complete independence from the studio folder while maintaining full compatibility with studio's DBC logic and validation rules.
