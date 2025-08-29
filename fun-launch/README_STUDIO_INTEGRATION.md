# Direct Studio Integration for Fun-Launch

This document explains the implementation of **Option A: Direct Studio Integration** for fun-launch, which imports studio's DBC logic directly and uses `dbc_config.jsonc` as a configuration template.

## 🎯 Overview

This implementation provides:
- **Direct Integration**: Imports studio's DBC logic directly into fun-launch
- **Template-Based Configuration**: Uses studio's `dbc_config.jsonc` as the foundation
- **Pre-configured Setup**: Uses existing DBC config key from environment variables
- **Simplified Flow**: No need to create configs - uses pre-existing configuration
- **Full Compatibility**: Uses the exact same logic as studio CLI commands

## 🏗️ Architecture

### **Core Components**

1. **Studio DBC Integration** (`src/lib/studio/dbc-integration.ts`)
   - Direct port of studio's `createDbcConfig` and `createDbcPool` functions
   - Handles all curve building modes and configurations
   - Provides validation and cost estimation

2. **Configuration Template** (`src/lib/studio/config-template.ts`)
   - Uses studio's `dbc_config.jsonc` as the foundation
   - Provides user-friendly configuration generation
   - Handles network-specific settings

3. **API Endpoints**
   - `/api/create-pool-with-studio.ts` - Pool creation with studio integration
   - `/api/upload.ts` - Updated to use studio integration

## 🔧 Setup and Configuration

### **Environment Variables**

**Required in `.env`:**
```bash
# ✅ Required for pool creation
POOL_CONFIG_KEY=your_pre_created_dbc_config_key
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_ACCOUNT_ID=your_r2_account_id
R2_BUCKET=your_r2_bucket_name
R2_PUBLIC_URL=https://your-custom-domain.com
RPC_URL=your_rpc_url
NEXT_PUBLIC_NETWORK=mainnet  # or devnet
```

### **Dependencies**

Ensure these packages are installed:
```bash
pnpm add @meteora-ag/dynamic-bonding-curve-sdk @coral-xyz/anchor bn.js
```

## 📋 Usage Examples

### **1. Basic Pool Creation (No Changes Required)**

The existing `/api/upload` endpoint now uses studio integration automatically:

```typescript
// Frontend code remains exactly the same
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

// Response now includes studio-generated config
{
  "success": true,
  "imageUrl": "https://...",
  "metadataUrl": "https://...",
  "poolResult": {
    "baseMint": "base_mint_address",
    "baseMintKeypair": [...],
    "configPublicKey": "studio_generated_config_address"
  }
}
```

### **2. Pool Creation with Custom Config**

Use the new studio-based endpoint for custom configurations:

```typescript
const response = await fetch('/api/create-pool-with-studio', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenName: 'My Token',
    tokenSymbol: 'MTK',
    metadataUrl: 'https://example.com/metadata.json',
    userWallet: wallet.publicKey.toString(),
    // Optional customizations
    initialMarketCap: 10000,              // Override studio's default 5000
    migrationMarketCap: 100000,           // Override studio's default 75000
    creatorTradingFeePercentage: 75,      // 75% to creator instead of 50%
    dynamicFeeEnabled: false,             // Disable anti-sniping
    migrationFeeOption: 2,                // 1% LP fee instead of 2%
  }),
});

// Response includes detailed configuration
{
  "success": true,
  "configPublicKey": "studio_generated_config_address",
  "baseMintKeypair": [...],
  "configTemplate": {
    "pool": { "name": "My Token", "symbol": "MTK", ... },
    "launch": { "initialMarketCap": 10000, "migrationMarketCap": 100000, ... },
    "fees": { "creatorTradingFeePercentage": 75, "dynamicFeeEnabled": false, ... },
    "lpDistribution": { "creatorLpPercentage": 25, "partnerLpPercentage": 25, ... },
    "vesting": { "totalLockedVestingAmount": 100000000, ... },
    "advanced": { "buildCurveMode": 1, "activationType": "Timestamp", ... }
  },
  "estimatedCosts": {
    "poolCreation": 0.003,
    "poolCreation": 0.003,
    "total": 0.008
  }
}
```

## 🔄 How Studio Integration Works

### **Configuration Flow**

```
1. Studio dbc_config.jsonc (Template)
   ↓
2. Fun-Launch reads template
   ↓
3. User provides overrides (optional)
   ↓
4. Fun-Launch generates custom config
   ↓
5. Validation against studio rules
   ↓
6. Pool creation with studio logic
```

### **Studio's Default Configuration**

The integration uses studio's `dbc_config.jsonc` as the foundation:

```typescript
const STUDIO_DEFAULT_CONFIG = {
  buildCurveMode: 1, // buildCurveWithMarketCap
  initialMarketCap: 5000,
  migrationMarketCap: 75000,
  totalTokenSupply: 1000000000,
  migrationOption: 1, // Migrate to DAMM v2
  tokenBaseDecimal: 9,
  tokenQuoteDecimal: 6,
  creatorTradingFeePercentage: 50, // 50% to creator, 50% to partner
  dynamicFeeEnabled: true, // Anti-sniping protection
  // ... all other studio defaults
};
```

### **User Override Examples**

```typescript
// Example 1: Custom market caps
const overrides = {
  initialMarketCap: 10000,    // Override studio's default 5000
  migrationMarketCap: 100000, // Override studio's default 75000
};

// Example 2: Custom fee structure
const overrides = {
  creatorTradingFeePercentage: 75, // 75% to creator instead of 50%
  dynamicFeeEnabled: false,        // Disable anti-sniping
};

// Example 3: Custom LP distribution
const overrides = {
  creatorLpPercentage: 40,        // More LP to creator
  partnerLpPercentage: 10,        // Less LP to partner
  creatorLockedLpPercentage: 30,  // More locked LP to creator
  partnerLockedLpPercentage: 20,  // Less locked LP to partner
};
```

## 🌐 Network Support

### **Mainnet**
- **USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **SOL**: `So11111111111111111111111111111111111111112`
- **JUP**: `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`

### **Devnet**
- **USDC**: `Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr`
- **SOL**: `So11111111111111111111111111111111111111112`
- **JUP**: `JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN`

## 🔒 Security Features

### **Transaction Safety**
- **Simulation**: All transactions are simulated before execution
- **Error Handling**: Comprehensive error catching and reporting
- **Retry Logic**: Automatic retry on transaction failures
- **Compute Units**: Priority fee optimization

### **Configuration Validation**
- **Input Validation**: All user inputs are validated
- **Parameter Bounds**: Market caps, fees, and other parameters are bounded
- **Network Validation**: Quote mint addresses are validated per network
- **Studio Constraints**: All configurations must meet studio's validation rules

## 🧪 Testing

### **Development Testing**

1. **Set Network to Devnet**
   ```bash
   NEXT_PUBLIC_NETWORK=devnet
   ```

2. **Test Basic Pool Creation**
   ```bash
   curl -X POST http://localhost:3000/api/upload \
     -H "Content-Type: application/json" \
     -d '{"tokenName":"Test","tokenSymbol":"TEST","tokenLogo":"data:image/png;base64,...","mint":"test_mint","userWallet":"your_wallet"}'
   ```

3. **Test Pool Creation with Studio**
   ```bash
   curl -X POST http://localhost:3000/api/create-pool-with-studio \
     -H "Content-Type: application/json" \
     -d '{"tokenName":"Test","tokenSymbol":"TEST","metadataUrl":"https://example.com/metadata.json","userWallet":"your_wallet","initialMarketCap":10000}'
   ```

### **Production Testing**

1. **Dry Run Mode**
   ```typescript
   config.dryRun = true; // Simulate without execution
   ```

2. **Small Market Caps**
   - Use small initial market caps for testing
   - Monitor transaction costs

## 📊 Monitoring and Analytics

### **Transaction Tracking**
```typescript
// Log pool creation
console.log(`📊 Config created: ${configPublicKey.toString()}`);

// Log pool creation
console.log(`🏊 Pool created: ${baseMint.publicKey.toString()}`);

// Log transaction hashes
console.log(`✅ Config TX: ${configTxHash}`);
console.log(`✅ Pool TX: ${poolTxHash}`);
```

### **Cost Estimation**
```typescript
// Estimate costs
const poolCost = 0.003; // ~0.003 SOL for pool creation
const totalCost = poolCost;
```

## 🚨 Troubleshooting

### **Common Issues**

1. **"Missing dbc configuration"**
   - Ensure `generateDbcConfig` is called with valid parameters
   - Check that all required fields are provided

2. **"Failed to build curve config"**
   - Verify `buildCurveMode` is valid (0-3)
   - Check that all required curve parameters are set

3. **"Transaction simulation failed"**
   - Check wallet has sufficient SOL
   - Verify RPC connection
   - Review transaction parameters

4. **"Invalid quote mint"**
   - Ensure quote mint address is valid for the network
   - Check network configuration

### **Debug Mode**

Enable detailed logging:
```typescript
// Add to your configuration
console.log('🔍 Debug mode enabled');
console.log('📋 Config:', JSON.stringify(config, null, 2));
```

## 🔮 Future Enhancements

### **Planned Features**

1. **Advanced Configuration UI**
   - Web interface for customizing studio parameters
   - Real-time cost estimation
   - Configuration templates

2. **Multi-Network Support**
   - Automatic network detection
   - Cross-network compatibility
   - Network-specific optimizations

3. **Analytics Dashboard**
   - Pool performance tracking
   - Cost analysis
   - Success metrics

4. **Template System**
   - Pre-configured templates for common use cases
   - Community templates
   - Template marketplace

## 📞 Support

### **Getting Help**

1. **Documentation**
   - This README
   - Studio documentation
   - Code comments

2. **Community**
   - GitHub issues
   - Discord channel
   - Developer forum

3. **Technical Support**
   - Email support
   - Live chat
   - Video calls

---

**Note**: This Direct Studio Integration maintains full compatibility with existing fun-launch functionality while providing enhanced flexibility and eliminating the need for pre-configured DBC config keys. Each pool now gets a unique, dynamically generated configuration based on studio's battle-tested logic.
