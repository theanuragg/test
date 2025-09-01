# 🔧 DBC Swap Troubleshooting Guide

## 🚨 **Common Swap Errors & Solutions**

### **Error 1: "Output: ∞ holy" (Infinity Tokens)**

#### **Symptoms:**
```
Input: 5.00 USDC
Output: ∞ holy
Price: $0.00 per holy
```

#### **Root Cause:**
- **Division by zero** in price calculation
- Pool state is corrupted or not properly initialized
- Manual price calculation instead of using official DBC SDK

#### **Solution:**
✅ **Use official Meteora DBC `swapQuote` method**
✅ **Remove manual price calculations**
✅ **Let DBC SDK handle all math**

#### **Fixed Code:**
```typescript
// ❌ WRONG - Manual calculation
const price = currentQuoteReserve / currentBaseReserve;
const outputAmount = (amountIn * 0.98) / price;

// ✅ CORRECT - Use official SDK
const swapQuote = await dbcClient.pool.swapQuote({
  pool: poolPubkey,
  inputMint: quoteMint,
  outputMint: baseMint,
  amount: amountIn,
  slippageBps: 100,
  swapBaseForQuote: false,
  hasReferral: false,
});

const outputAmount = Number(swapQuote.outputAmount.toString());
```

---

### **Error 2: "Pool not found"**

#### **Symptoms:**
```
Error: Pool not found - token may not be launched yet
```

#### **Root Cause:**
- Token hasn't been launched yet
- Wrong pool address
- Pool was deleted or migrated

#### **Solution:**
1. **Verify token launch:**
   ```bash
   POST /api/dbc/launch-token
   ```

2. **Check pool address:**
   ```bash
   POST /api/dbc/test-pool-state
   {
     "poolAddress": "YOUR_POOL_ADDRESS"
   }
   ```

3. **Verify pool exists on-chain**

---

### **Error 3: "Insufficient balance"**

#### **Symptoms:**
```
Error: Insufficient balance for swap
```

#### **Root Cause:**
- Not enough USDC/SOL in wallet
- Wrong token mint (devnet vs mainnet)
- Token account not created

#### **Solution:**
1. **Get devnet USDC:**
   ```bash
   POST /api/devnet/usdc-faucet
   {
     "userWallet": "YOUR_WALLET",
     "amount": 1000
   }
   ```

2. **Check wallet balance**
3. **Ensure correct network (devnet)**

---

### **Error 4: "Slippage tolerance exceeded"**

#### **Symptoms:**
```
Error: Slippage tolerance exceeded
```

#### **Root Cause:**
- Price moved too much during transaction
- Slippage setting too low
- High volatility in new pools

#### **Solution:**
1. **Increase slippage:**
   ```typescript
   slippageBps: 500, // 5% instead of 1%
   ```

2. **Use smaller amounts**
3. **Retry transaction**

---

## 🧪 **Testing Your DBC Pool**

### **Step 1: Test Pool State**
```bash
# Test your pool state
curl -X POST http://localhost:3000/api/dbc/test-pool-state \
  -H "Content-Type: application/json" \
  -d '{"poolAddress":"YOUR_POOL_ADDRESS"}'
```

### **Step 2: Expected Response**
```json
{
  "success": true,
  "poolState": {
    "quoteReserve": "0",
    "baseReserve": "1000000000",
    "isMigrated": 0,
    "baseMint": "TOKEN_MINT_ADDRESS",
    "quoteMint": "USDC_MINT_ADDRESS"
  },
  "poolConfig": {
    "buildCurveMode": 1,
    "migrationQuoteThreshold": "75000000000",
    "totalTokenSupply": "1000000000"
  },
  "swapQuote": {
    "inputAmount": "5000000",
    "outputAmount": "123456789",
    "minimumAmountOut": "122222222"
  },
  "debug": {
    "quoteReserve": "0",
    "baseReserve": "1000000000",
    "isMigrated": 0,
    "virtualPrice": 0.000005,
    "effectivePrice": 0.000005
  }
}
```

### **Step 3: Verify Values**
- ✅ `quoteReserve`: Should be 0 (empty pool)
- ✅ `baseReserve`: Should be 1,000,000,000 (1B tokens)
- ✅ `isMigrated`: Should be 0 (still on bonding curve)
- ✅ `virtualPrice`: Should be ~0.000005 ($5K / 1B tokens)
- ✅ `swapQuote`: Should show valid input/output amounts

---

## 🔍 **Debugging Steps**

### **1. Check Console Logs**
```typescript
// Add detailed logging
console.log('🔍 Pool state:', {
  quoteReserve: poolState.quoteReserve.toString(),
  baseReserve: poolState.baseReserve.toString(),
  isMigrated: poolState.isMigrated,
});

console.log('💱 Swap quote:', {
  inputAmount: swapQuote.inputAmount.toString(),
  outputAmount: swapQuote.outputAmount.toString(),
});
```

### **2. Verify Pool Creation**
```typescript
// Check if pool was created correctly
const poolState = await dbcClient.state.getPool(poolPubkey);
if (!poolState) {
  console.error('❌ Pool not found');
  return;
}

console.log('✅ Pool found:', poolState.publicKey.toString());
```

### **3. Test Swap Quote Separately**
```typescript
// Test quote before swap
try {
  const quote = await dbcClient.pool.swapQuote({
    pool: poolPubkey,
    inputMint: quoteMint,
    outputMint: baseMint,
    amount: 5000000, // 5 USDC
    slippageBps: 100,
    swapBaseForQuote: false,
    hasReferral: false,
  });
  
  console.log('✅ Quote successful:', quote);
} catch (error) {
  console.error('❌ Quote failed:', error);
}
```

---

## 🚀 **Complete Working Example**

### **Fixed DbcSwapInterface.tsx:**
```typescript
const getSwapQuote = async () => {
  if (!amount || !publicKey) return;

  try {
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
    const amountIn = parseFloat(amount) * Math.pow(10, 6); // USDC has 6 decimals

    // Get pool state
    const poolState = await dbcClient.state.getPool(new PublicKey(poolAddress));
    if (!poolState) {
      toast.error('Failed to fetch pool state');
      return;
    }

    // Use official DBC swapQuote
    const swapQuote = await dbcClient.pool.swapQuote({
      pool: new PublicKey(poolAddress),
      inputMint: new PublicKey(quoteMint),
      outputMint: new PublicKey(baseMint),
      amount: amountIn,
      slippageBps: slippage * 100,
      swapBaseForQuote: false, // Buy tokens
      hasReferral: false,
    });

    // Extract values from official quote
    const outputAmount = Number(swapQuote.outputAmount.toString());
    const price = Number(swapQuote.outputAmount.toString()) / (amountIn / Math.pow(10, 6));
    const fee = amountIn * 0.02; // 2% fee

    setQuote({
      inputAmount: amountIn,
      outputAmount,
      price: price,
      priceImpact: 0,
      fee,
      slippage,
    });

  } catch (error) {
    console.error('Error getting quote:', error);
    handleQuoteError(error);
  }
};
```

---

## 📋 **Checklist for Working Swaps**

- [ ] Token launched successfully with DBC pool
- [ ] Pool address is correct
- [ ] Using official DBC `swapQuote` method
- [ ] No manual price calculations
- [ ] Proper error handling
- [ ] Devnet USDC balance > 0
- [ ] Wallet connected to correct network
- [ ] Slippage tolerance reasonable (1-5%)
- [ ] Pool not migrated yet (`isMigrated = 0`)

---

## 🆘 **Still Having Issues?**

1. **Test pool state first:**
   ```bash
   POST /api/dbc/test-pool-state
   ```

2. **Check console for detailed errors**

3. **Verify token launch was successful**

4. **Ensure you're using devnet**

5. **Check RPC connection health**

Your DBC swap should work perfectly after these fixes! 🎉
