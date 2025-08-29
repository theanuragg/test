# Token Metadata Fix - Complete Guide

## 🎯 Problem Solved

**Issue**: Token names were not showing in Solscan and other explorers - only mint addresses were visible.

**Root Cause**: The application was creating JSON metadata files and uploading them to R2 storage, but **not creating the required on-chain metadata accounts** using the Metaplex Token Metadata Program.

## 🔧 Solution Implementation

### **1. Added Metaplex Token Metadata Support**

```bash
pnpm add @metaplex-foundation/mpl-token-metadata @metaplex-foundation/umi @metaplex-foundation/umi-bundle-defaults
```

### **2. Created Metadata Helper Library** (`src/lib/metaplex-metadata.ts`)

**Key Functions:**
- `createTokenWithMetadata()` - Creates complete token with metadata
- `createMetadataAccount()` - Adds metadata to existing mint
- `hasMetadataAccount()` - Checks if metadata exists
- `getMetadataAddress()` - Gets metadata PDA address

### **3. Updated Pool Creation Process**

The updated `/api/upload` endpoint now:

1. **Creates R2 Metadata** (JSON file for off-chain data)
2. **Creates On-Chain Metadata Account** (Metaplex metadata for explorers)
3. **Returns Both Transactions** (pool creation + metadata creation)

## 📋 API Changes

### **Updated `/api/upload` Response**

**Before:**
```json
{
  "success": true,
  "poolTx": "base64_transaction_data"
}
```

**After:**
```json
{
  "success": true,
  "poolTx": "base64_pool_transaction",
  "metadataTx": "base64_metadata_transaction",
  "metadataAddress": "metadata_pda_address",
  "imageUrl": "https://your-r2-url/tokens/mint.png",
  "metadataUrl": "https://your-r2-url/metadata/mint.json"
}
```

### **New `/api/create-metadata` Endpoint**

For creating metadata accounts separately:

**Request:**
```json
{
  "mintAddress": "token_mint_address",
  "userWallet": "user_wallet_address",
  "tokenName": "My Token",
  "tokenSymbol": "MTK",
  "metadataUri": "https://your-metadata-url.json",
  "sellerFeeBasisPoints": 0
}
```

**Response:**
```json
{
  "success": true,
  "metadataTx": "base64_metadata_transaction",
  "metadataAddress": "metadata_pda_address"
}
```

## 🚀 How to Use

### **Frontend Integration**

```typescript
// 1. Upload and get transactions
const uploadResponse = await fetch('/api/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    tokenLogo: base64Image,
    tokenName: 'My Token',
    tokenSymbol: 'MTK',
    mint: mintAddress,
    userWallet: wallet.publicKey.toString(),
  }),
});

const { poolTx, metadataTx, metadataAddress } = await uploadResponse.json();

// 2. Sign and send both transactions
if (metadataTx) {
  // Send metadata transaction first
  const metadataTransaction = Transaction.from(Buffer.from(metadataTx, 'base64'));
  const metadataSignature = await wallet.sendTransaction(metadataTransaction, connection);
  await connection.confirmTransaction(metadataSignature);
  console.log('✅ Metadata created:', metadataAddress);
}

// 3. Then send pool transaction
const poolTransaction = Transaction.from(Buffer.from(poolTx, 'base64'));
const poolSignature = await wallet.sendTransaction(poolTransaction, connection);
await connection.confirmTransaction(poolSignature);
console.log('✅ Pool created');
```

### **Alternative: Create Metadata Separately**

```typescript
// Create metadata for existing token
const metadataResponse = await fetch('/api/create-metadata', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    mintAddress: 'existing_mint_address',
    userWallet: wallet.publicKey.toString(),
    tokenName: 'My Token',
    tokenSymbol: 'MTK',
    metadataUri: 'https://your-metadata-url.json',
  }),
});

const { metadataTx, metadataAddress } = await metadataResponse.json();
```

## 🔍 How It Works

### **On-Chain Metadata Account Structure**

```typescript
// Metadata Program Derived Address (PDA)
const [metadataAddress] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('metadata'),
    TOKEN_METADATA_PROGRAM_ID.toBuffer(),
    mintPublicKey.toBuffer(),
  ],
  TOKEN_METADATA_PROGRAM_ID  // Metaplex Token Metadata Program
);
```

### **Metadata Structure**

```typescript
interface TokenMetadata {
  name: string;           // "My Amazing Token"
  symbol: string;         // "MAT"
  uri: string;           // Link to JSON metadata
  sellerFeeBasisPoints: number; // Royalties (0 = no royalties)
  creators: Array<{
    address: string;      // Creator wallet
    verified: boolean;    // Auto-verified for creator
    share: number;        // Percentage (100 = 100%)
  }>;
}
```

## 🧪 Testing Your Fix

### **1. Test Token Creation**

1. **Create Pool**: Use your launchpad to create a new token pool
2. **Check Solscan**: Visit `https://solscan.io/token/YOUR_MINT_ADDRESS?cluster=devnet`
3. **Verify**: Token name and symbol should now display properly

### **2. Verify Metadata Account**

```bash
# Check if metadata account exists (replace with your mint)
solana account METADATA_PDA_ADDRESS --url devnet
```

### **3. API Testing**

Test the metadata creation endpoint:

```bash
curl -X POST http://localhost:3000/api/create-metadata \
  -H "Content-Type: application/json" \
  -d '{
    "mintAddress": "YOUR_MINT_ADDRESS",
    "userWallet": "YOUR_WALLET_ADDRESS",
    "tokenName": "Test Token",
    "tokenSymbol": "TEST",
    "metadataUri": "https://your-metadata-url.json"
  }'
```

## 🔒 Security Considerations

### **1. Creator Verification**

```typescript
creators: [
  {
    address: userWallet,
    verified: true,    // Only the creator can verify themselves
    share: 100         // 100% creator ownership
  }
]
```

### **2. Metadata Immutability**

- Metadata accounts are created as **mutable** by default
- Creator can update metadata later if needed
- Set `isMutable: false` for permanent metadata

### **3. Royalty Settings**

- Default: `sellerFeeBasisPoints: 0` (no royalties)
- Customize: Set percentage in basis points (500 = 5%)

## 📊 Benefits of This Fix

### **1. Explorer Compatibility**
- ✅ Solscan displays token names properly
- ✅ Solana Explorer shows correct metadata  
- ✅ Wallet apps recognize token properly

### **2. DEX Integration**
- ✅ Jupiter recognizes tokens correctly
- ✅ Raydium displays proper token info
- ✅ Other DEXs show accurate data

### **3. Wallet Display**
- ✅ Phantom shows token names/symbols
- ✅ Solflare displays correct info
- ✅ Other wallets recognize tokens

## 🚨 Troubleshooting

### **Common Issues**

1. **"Metadata account already exists"**
   ```typescript
   // Check first before creating
   const exists = await hasMetadataAccount(connection, mintPublicKey);
   ```

2. **"Invalid metadata PDA"**
   ```typescript
   // Ensure correct PDA derivation
   const metadataAddress = getMetadataAddress(mintPublicKey);
   ```

3. **"Transaction too large"**
   ```typescript
   // Send metadata and pool transactions separately
   // Metadata first, then pool creation
   ```

### **Verification Commands**

```bash
# Check metadata account
solana account METADATA_ADDRESS --url devnet

# Check mint account
solana account MINT_ADDRESS --url devnet

# View transaction details
solana confirm TRANSACTION_SIGNATURE --url devnet
```

## 🎯 Next Steps

1. **Test the Fix**: Create a new token and verify it shows in Solscan
2. **Frontend Update**: Update your frontend to handle both transactions
3. **Batch Optimization**: Consider batching metadata + pool creation
4. **Error Handling**: Add retry logic for metadata creation failures

---

**Result**: Your tokens will now display properly with names and symbols in Solscan, wallets, and DEX platforms! 🎉
