import React, { useState, useEffect } from 'react';
import { useWallet } from '@jup-ag/wallet-adapter';
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { DynamicBondingCurveClient, SwapMode } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { toast } from 'react-hot-toast';
const BN = require('bn.js');

interface DbcSwapInterfaceProps {
  poolAddress: string;
  baseMint: string;
  quoteMint: string;
  tokenName: string;
  tokenSymbol: string;
}

interface SwapQuote {
  inputAmount: number;
  outputAmount: number;
  price: number;
  priceImpact: number;
  fee: number;
  slippage: number;
}

export default function DbcSwapInterface({
  poolAddress,
  baseMint,
  quoteMint,
  tokenName,
  tokenSymbol,
}: DbcSwapInterfaceProps) {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const [isBuying, setIsBuying] = useState(true); // true = buy tokens, false = sell tokens
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [slippage, setSlippage] = useState(1); // 1% default slippage
  const [swapMode, setSwapMode] = useState<number>(0); // 0 = ExactIn, 1 = PartialFill, 2 = ExactOut

  // Test DBC SDK import
  console.log('🔍 DBC SDK Import Test:', {
    DynamicBondingCurveClient: typeof DynamicBondingCurveClient,
    SwapMode: typeof SwapMode,
    SwapModeValues: SwapMode ? Object.values(SwapMode) : 'Not available'
  });

  // Test basic component state
  console.log('🔍 Component State Test:', {
    poolAddress,
    baseMint,
    quoteMint,
    hasPublicKey: !!publicKey,
    amount,
    isBuying
  });

  const connection = new Connection(
    process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  );

  // Helper function to get devnet USDC
  const getDevnetUSDC = async () => {
    try {
      const response = await fetch('/api/devnet/usdc-faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey?.toString(),
        }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        toast.success('Devnet USDC sent to your wallet!');
        // Refresh the page to update balances
        setTimeout(() => window.location.reload(), 2000);
      } else {
        toast.error(result.error || 'Failed to get devnet USDC');
      }
    } catch (error) {
      console.error('Error getting devnet USDC:', error);
      toast.error('Failed to get devnet USDC');
    }
  };

  // Get quote when amount changes
  useEffect(() => {
    console.log('🔄 useEffect triggered:', { amount, hasPublicKey: !!publicKey, isBuying, slippage });
    
    if (!amount || !publicKey || parseFloat(amount) <= 0) {
      console.log('❌ useEffect early return:', { amount, hasPublicKey: !!publicKey, parseFloatAmount: parseFloat(amount) });
      setQuote(null);
      return;
    }

    console.log('✅ useEffect calling getSwapQuote...');
    getSwapQuote();
  }, [amount, isBuying, slippage]);

  const getSwapQuote = async () => {
    if (!amount || !publicKey) {
      console.log('❌ getSwapQuote early return:', { amount, hasPublicKey: !!publicKey });
      return;
    }

    console.log('🚀 Starting getSwapQuote...');
    console.log('🔍 Amount:', amount);
    console.log('🔍 Public key:', publicKey.toString());
    console.log('🔍 Is buying:', isBuying);

    // Simple test quote first
    try {
      console.log('🧪 Testing simple quote calculation...');
      
      const testQuote = {
        inputAmount: parseFloat(amount) * Math.pow(10, isBuying ? 6 : 9),
        outputAmount: parseFloat(amount) * 100, // Simple test: 1 USDC = 100 tokens
        price: 0.01, // Simple test price
        priceImpact: 0,
        fee: parseFloat(amount) * 0.02,
        slippage,
      };
      
      console.log('🧪 Test quote created:', testQuote);
      setQuote(testQuote);
      console.log('✅ Test quote set successfully');
      
      // Now try the real DBC quote
      console.log('🔧 Now trying real DBC quote...');
    } catch (testError) {
      console.error('❌ Test quote failed:', testError);
      return;
    }

          try {
        console.log('🔧 Creating DBC client...');
        console.log('🔍 Connection object:', connection);
        console.log('🔍 Pool address:', poolAddress);
        console.log('🔍 Quote mint:', quoteMint);
        console.log('🔍 Base mint:', baseMint);
        
        let dbcClient;
        
        try {
          console.log('🔧 About to create DynamicBondingCurveClient...');
          console.log('🔍 Connection RPC URL:', connection.rpcEndpoint);
          dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
          console.log('✅ DBC client created:', dbcClient);
          console.log('🔍 DBC client type:', typeof dbcClient);
          console.log('🔍 DBC client constructor:', dbcClient.constructor.name);
          console.log('🔍 DBC client methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(dbcClient)));
        } catch (clientError) {
          console.error('❌ Failed to create DBC client:', clientError);
          console.error('❌ Client error details:', {
            message: clientError instanceof Error ? clientError.message : 'Unknown error',
            stack: clientError instanceof Error ? clientError.stack : 'No stack',
            name: clientError instanceof Error ? clientError.name : 'Unknown'
          });
          toast.error('Failed to create DBC client - SDK error');
          return;
        }
      
      console.log('🔍 DBC client properties:', {
        hasPool: !!dbcClient.pool,
        hasState: !!dbcClient.state,
        poolType: typeof dbcClient.pool,
        stateType: typeof dbcClient.state,
        poolKeys: dbcClient.pool ? Object.keys(dbcClient.pool) : 'NO_POOL',
        stateKeys: dbcClient.state ? Object.keys(dbcClient.state) : 'NO_STATE'
      });
      
      // Validate DBC client
      if (!dbcClient || !dbcClient.pool || !dbcClient.state) {
        console.error('DBC client initialization failed:', { dbcClient, pool: dbcClient?.pool, state: dbcClient?.state });
        toast.error('Failed to initialize DBC client');
        return;
      }
      
      console.log('✅ DBC client validation passed');
      console.log('🔍 DBC client pool methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(dbcClient.pool)));
      console.log('🔍 DBC client state methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(dbcClient.state)));
      
      const amountIn = parseFloat(amount) * Math.pow(10, isBuying ? 6 : 9); // USDC has 6 decimals, tokens have 9
      console.log('🔍 Calculated amountIn (lamports):', amountIn);

      // Get pool state for current reserves
      console.log('🔍 Getting pool state for address:', poolAddress);
      let poolState;
      try {
        poolState = await dbcClient.state.getPool(new PublicKey(poolAddress));
      if (!poolState) {
          console.error('❌ Pool state is null/undefined');
          toast.error('Failed to fetch pool state');
          return;
        }
        console.log('✅ Pool state retrieved:', poolState);
      } catch (poolError) {
        console.error('❌ Failed to get pool state:', poolError);
        console.error('❌ Pool error details:', {
          message: poolError instanceof Error ? poolError.message : 'Unknown error',
          stack: poolError instanceof Error ? poolError.stack : 'No stack'
        });
        toast.error('Failed to fetch pool state');
        return;
      }
      
      // Check if user has sufficient balance for the swap
      if (isBuying) {
        // For buying tokens, check USDC balance
        console.log('🔍 Checking USDC balance for wallet:', publicKey.toString());
        console.log('🔍 USDC mint address from props:', quoteMint);
        console.log('🔍 Expected devnet USDC mint:', 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
        
        // Check if there's a mismatch between expected and actual USDC mint
        if (quoteMint !== 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr') {
          console.warn('⚠️ USDC mint mismatch detected!');
          console.warn('⚠️ Expected: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');
          console.warn('⚠️ Actual: ' + quoteMint);
          console.warn('⚠️ This will cause the swap to fail!');
        }
        
        try {
          // First, check if user has the expected devnet USDC
          const expectedUsdcMint = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr';
          const expectedUsdcAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: new PublicKey(expectedUsdcMint)
          });
          
          console.log('🔍 Expected USDC accounts found:', expectedUsdcAccounts.value.length);
          
          if (expectedUsdcAccounts.value.length === 0) {
            toast.error('No devnet USDC found. Please get some devnet USDC first.');
            return;
          }
          
          const expectedUsdcAccount = expectedUsdcAccounts.value[0];
          const expectedUsdcBalance = expectedUsdcAccount.account.data.parsed.info.tokenAmount;
          
          console.log('🔍 Expected USDC account address:', expectedUsdcAccount.pubkey.toString());
          console.log('🔍 Expected USDC balance:', expectedUsdcBalance.uiAmount, 'USDC');
          console.log('🔍 Amount needed:', amount, 'USDC');
          
          if (expectedUsdcBalance.uiAmount < parseFloat(amount)) {
            toast.error(`Insufficient devnet USDC balance. You have ${expectedUsdcBalance.uiAmount} USDC, need ${amount} USDC`);
            return;
          }
          console.log('✅ Expected USDC balance check passed:', expectedUsdcBalance.uiAmount, 'USDC');
          
          // Also check if user has the output token account (for buying tokens)
          console.log('🔍 Checking if user has output token account...');
          const outputTokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
            mint: new PublicKey(baseMint)
          });
          
          if (outputTokenAccounts.value.length === 0) {
            console.log('⚠️ User does not have output token account, will be created during swap');
          } else {
            console.log('✅ User has output token account:', outputTokenAccounts.value[0].pubkey.toString());
          }
          
          // Check SOL balance for transaction fees
          console.log('🔍 Checking SOL balance for transaction fees...');
          const solBalance = await connection.getBalance(publicKey);
          const solBalanceSol = solBalance / Math.pow(10, 9);
          console.log('🔍 SOL balance:', solBalanceSol, 'SOL');
          
          if (solBalanceSol < 0.01) {
            toast.error(`Insufficient SOL for transaction fees. You have ${solBalanceSol.toFixed(4)} SOL, need at least 0.01 SOL`);
            return;
          }
          console.log('✅ SOL balance check passed:', solBalanceSol, 'SOL');
          
        } catch (balanceError) {
          console.error('❌ Error checking balances:', balanceError);
          toast.error('Failed to check balances');
          return;
        }
      } else {
        // For selling tokens, check token balance
        console.log('🔍 Checking token balance for wallet:', publicKey.toString());
        console.log('🔍 Token mint address:', baseMint);
        
        // Find user's token account
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          mint: new PublicKey(baseMint)
        });
        
        console.log('🔍 Found token accounts:', tokenAccounts.value.length);
        
        if (tokenAccounts.value.length === 0) {
          toast.error(`No ${tokenSymbol} token account found.`);
          return;
        }
        
        const tokenAccount = tokenAccounts.value[0];
        const tokenBalance = tokenAccount.account.data.parsed.info.tokenAmount;
        
        console.log('🔍 Token account address:', tokenAccount.pubkey.toString());
        console.log('🔍 Token balance:', tokenBalance.uiAmount, tokenSymbol);
        console.log('🔍 Amount needed:', amount, tokenSymbol);
        
        if (tokenBalance.uiAmount < parseFloat(amount)) {
          toast.error(`Insufficient token balance. You have ${tokenBalance.uiAmount} ${tokenSymbol}, need ${amount} ${tokenSymbol}`);
          return;
        }
        console.log('✅ Token balance check passed:', tokenBalance.uiAmount, tokenSymbol);
      }

      const currentQuoteReserve = Number(poolState.quoteReserve.toString());
      const currentBaseReserve = Number(poolState.baseReserve.toString());

      console.log('🔍 Current reserves - Quote (USDC):', currentQuoteReserve / Math.pow(10, 6));
      console.log('🔍 Current reserves - Base (Token):', currentBaseReserve / Math.pow(10, 9));
      
      // Check if pool has sufficient liquidity
      if (currentQuoteReserve === 0 || currentBaseReserve === 0) {
        toast.error('Pool has insufficient liquidity for trading');
        return;
      }
      
      // Additional liquidity check for the specific swap amount
      if (isBuying && currentQuoteReserve < amountIn) {
        toast.error(`Insufficient USDC liquidity in pool. Pool has ${currentQuoteReserve / Math.pow(10, 6)} USDC, need ${amountIn / Math.pow(10, 6)} USDC`);
        return;
      }
      
      if (!isBuying && currentBaseReserve < amountIn) {
        toast.error(`Insufficient token liquidity in pool. Pool has ${currentBaseReserve / Math.pow(10, 9)} ${tokenSymbol}, need ${amountIn / Math.pow(10, 9)} ${tokenSymbol}`);
        return;
      }

      // Use official Meteora DBC swapQuote2 for accurate calculation
      try {
        console.log('🔍 Getting DBC swap quote with swapQuote2...');
        console.log('🔍 Swap parameters:', {
          poolAddress,
          quoteMint,
          baseMint,
          amountIn,
          isBuying,
          slippage
        });
        
        console.log('🔍 About to call swapQuote2 on:', dbcClient.pool);
        console.log('🔍 swapQuote2 method exists:', typeof dbcClient.pool.swapQuote2);
        
        // Get pool config for swapQuote2
        const poolConfig = await dbcClient.state.getPoolConfig(poolState.config);
        
        // Get current point (block time or slot)
        const currentPoint = await connection.getSlot();
        
        console.log('🔍 Swap direction:', isBuying ? 'Buying tokens (USDC → Token)' : 'Selling tokens (Token → USDC)');
        console.log('🔍 swapBaseForQuote:', isBuying ? false : true);
        console.log('🔍 Current point:', currentPoint);
        console.log('🔍 Amount in (lamports):', amountIn);
        
        console.log('🔍 About to call swapQuote2 with params:', {
          virtualPool: poolState,
          config: poolConfig,
          swapBaseForQuote: isBuying ? false : true,
          amountIn: amountIn,
          slippageBps: slippage * 100,
          hasReferral: false,
          currentPoint: currentPoint,
          swapMode: swapMode
        });
        
        try {
          const swapQuote = await dbcClient.pool.swapQuote2({
            virtualPool: poolState,
            config: poolConfig,
            swapBaseForQuote: isBuying ? false : true, // false = buy tokens (USDC→Token), true = sell tokens (Token→USDC)
            amountIn: new BN(amountIn),
            slippageBps: slippage * 100, // Convert percentage to basis points
            hasReferral: false,
            currentPoint: new BN(currentPoint),
            swapMode: swapMode, // Use selected swap mode
          });
          
          console.log('✅ swapQuote2 call successful');
          
          // Extract values from the official quote
          console.log('🔍 Swap quote object:', swapQuote);
          console.log('🔍 Swap quote properties:', Object.keys(swapQuote));
          console.log('🔍 Expected output amount:', swapQuote.outputAmount?.toString());
          console.log('🔍 Minimum amount out:', swapQuote.minimumAmountOut?.toString());
          
          // Validate swap quote
          if (!swapQuote.outputAmount) {
            throw new Error('Swap quote failed: No output amount received');
          }
          
          const outputAmount = Number(swapQuote.outputAmount.toString());
          const price = Number(swapQuote.outputAmount.toString()) / (amountIn / Math.pow(10, 6)); // Calculate effective price
          
          // Safety check: ensure output amount is valid
          if (outputAmount <= 0 || !isFinite(outputAmount)) {
            toast.error('Invalid swap calculation - output amount error');
            return;
          }

      const priceImpact = 0; // Calculate based on pool depth
      const fee = amountIn * 0.02; // 2% fee

          // Convert price to proper decimal format for display
          const displayPrice = price / Math.pow(10, 6); // Convert from lamports to USDC
          
          const newQuote = {
        inputAmount: amountIn,
        outputAmount,
            price: displayPrice, // Use display price
        priceImpact,
        fee,
        slippage,
          };
          
          console.log('🔍 About to set quote:', newQuote);
          setQuote(newQuote);
          console.log('✅ Quote set successfully');
          
          // Verify quote was set
          setTimeout(() => {
            console.log('🔍 Quote state after setting:', quote);
          }, 100);
          
        } catch (swapQuoteError) {
          console.error('❌ swapQuote2 failed:', swapQuoteError);
          throw new Error(`Swap quote failed: ${swapQuoteError instanceof Error ? swapQuoteError.message : 'Unknown error'}`);
        }

      } catch (quoteError) {
        console.error('Error getting swap quote:', quoteError);
        
        // Fallback to manual calculation if DBC SDK fails
        try {
          console.log('🔄 Falling back to manual calculation...');
          
          // Use virtual baseline calculation as fallback
          const virtualQuoteBaseline = 5000 * Math.pow(10, 6); // $5K in lamports
          const effectiveQuoteReserve = currentQuoteReserve + virtualQuoteBaseline;
          
          if (currentBaseReserve === 0) {
            toast.error('Pool has no base tokens available');
            return;
          }
          
          const price = effectiveQuoteReserve / currentBaseReserve;
          const outputAmount = (amountIn * 0.98) / price; // Apply 2% fee
          
          if (outputAmount <= 0 || !isFinite(outputAmount)) {
            toast.error('Fallback calculation failed');
            return;
          }
          
          const displayPrice = price / Math.pow(10, 6);
          const fee = amountIn * 0.02;
          
          const fallbackQuote = {
            inputAmount: amountIn,
            outputAmount,
            price: displayPrice,
            priceImpact: 0,
            fee,
            slippage,
          };
          
          console.log('🔍 About to set fallback quote:', fallbackQuote);
          setQuote(fallbackQuote);
          console.log('✅ Fallback calculation successful');
          
          // Verify fallback quote was set
          setTimeout(() => {
            console.log('🔍 Quote state after fallback:', quote);
          }, 100);
          
        } catch (fallbackError) {
          console.error('Fallback calculation also failed:', fallbackError);
          toast.error('Failed to get swap quote - please try again later');
          return;
        }
      }

    } catch (error) {
      console.error('Error getting quote:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Pool not found')) {
          toast.error('DBC pool not found - token may not be launched yet');
        } else if (error.message.includes('Insufficient')) {
          toast.error('Insufficient balance for swap');
        } else if (error.message.includes('Slippage')) {
          toast.error('Slippage tolerance exceeded');
        } else {
          toast.error(`Quote error: ${error.message}`);
        }
      } else {
        toast.error('Failed to get swap quote - unknown error');
      }
    }
  };

  const executeSwap = async () => {
    if (!publicKey || !quote || !amount) {
      toast.error('Please connect wallet and enter amount');
      return;
    }

    setLoading(true);

    try {
      console.log('🔧 Creating DBC client for swap execution...');
      let dbcClient;
      
      try {
        dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
        console.log('✅ DBC client created for swap:', dbcClient);
      } catch (clientError) {
        console.error('❌ Failed to create DBC client for swap:', clientError);
        toast.error('Failed to create DBC client - SDK error');
        return;
      }
      
      // Validate DBC client
      if (!dbcClient || !dbcClient.pool || !dbcClient.state) {
        console.error('DBC client initialization failed:', { dbcClient, pool: dbcClient?.pool, state: dbcClient?.state });
        toast.error('Failed to initialize DBC client');
        return;
      }
      
      const amountIn = parseFloat(amount) * Math.pow(10, isBuying ? 6 : 9);

      // First get a swap quote from DBC using swapQuote2 (official method)
      const poolState = await dbcClient.state.getPool(new PublicKey(poolAddress));
      const poolConfig = await dbcClient.state.getPoolConfig(poolState.config);
      const currentPoint = await connection.getSlot();
      
      console.log('🔍 Getting swap quote...');
      console.log('🔍 Pool state:', poolState);
      console.log('🔍 Pool config:', poolConfig);
      console.log('🔍 Current point:', currentPoint);
      console.log('🔍 Amount in (lamports):', amountIn);
      console.log('🔍 Swap direction:', isBuying ? 'Buying tokens (USDC → Token)' : 'Selling tokens (Token → USDC)');
      console.log('🔍 swapBaseForQuote:', isBuying ? false : true);
      
      const swapQuote = await dbcClient.pool.swapQuote2({
        virtualPool: poolState,
        config: poolConfig,
        swapBaseForQuote: isBuying ? false : true, // false = buy tokens (USDC→Token), true = sell tokens (Token→USDC)
        amountIn: new BN(amountIn),
        slippageBps: slippage * 100, // Convert percentage to basis points
        hasReferral: false,
        currentPoint: new BN(currentPoint),
        swapMode: SwapMode.ExactIn,
      });

      console.log('✅ Swap quote received:', swapQuote);
      console.log('🔍 Expected output amount:', swapQuote.outputAmount?.toString());
      console.log('🔍 Minimum amount out:', swapQuote.minimumAmountOut?.toString());
      
      // Validate swap quote
      if (!swapQuote.outputAmount) {
        throw new Error('Swap quote failed: No output amount received');
      }
      
      // Calculate minimum amount out with slippage protection
      const slippageMultiplier = 1 - (slippage / 100);
      const minimumAmountOut = new BN(swapQuote.outputAmount.toString()).mul(new BN(Math.floor(slippageMultiplier * 1000))).div(new BN(1000));
      
      console.log('🔍 Calculated minimum amount out with slippage:', minimumAmountOut.toString());
      
      let swapTx;
      try {
        // Use swap2 method (official method) with proper parameters
        console.log('🔍 Creating swap transaction with swap2...');
        
        const swapParams: any = {
          amountIn: new BN(amountIn),
          minimumAmountOut: minimumAmountOut,
          swapMode: swapMode, // Use selected swap mode
          swapBaseForQuote: isBuying ? false : true, // false = buy tokens (USDC→Token), true = sell tokens (Token→USDC)
          owner: publicKey,
          pool: new PublicKey(poolAddress),
          referralTokenAccount: null, // No referral for now
          payer: publicKey,
        };
        
        console.log('🔍 Swap2 params:', swapParams);
        
        swapTx = await dbcClient.pool.swap2(swapParams);
        console.log('✅ Swap2 transaction created successfully');
        
        // Validate the transaction structure
        console.log('🔍 Transaction validation:');
        console.log('🔍 Transaction instructions count:', swapTx.instructions.length);
        console.log('🔍 Transaction signers count:', swapTx.signatures.length);
        console.log('🔍 Transaction fee payer:', swapTx.feePayer?.toString());
        
        // Log each instruction for debugging
        swapTx.instructions.forEach((instruction, index) => {
          console.log(`🔍 Instruction ${index}:`, {
            programId: instruction.programId.toString(),
            keys: instruction.keys.length,
            dataLength: instruction.data.length
          });
        });
        
      } catch (swapError) {
        console.error('❌ Failed to create swap2 transaction:', swapError);
        console.error('❌ Swap error details:', {
          message: swapError instanceof Error ? swapError.message : 'Unknown error',
          stack: swapError instanceof Error ? swapError.stack : 'No stack',
          name: swapError instanceof Error ? swapError.name : 'Unknown'
        });
        throw new Error(`Failed to create swap2 transaction: ${swapError instanceof Error ? swapError.message : 'Unknown error'}`);
      }

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      swapTx.feePayer = publicKey;
      swapTx.recentBlockhash = blockhash;

      // Sign transaction
      const signedTx = await signTransaction(swapTx);
      
      // Simulate transaction first to catch errors
      try {
        console.log('🔍 Simulating transaction...');
        const simulation = await connection.simulateTransaction(signedTx);
        
        if (simulation.value.err) {
          console.error('❌ Transaction simulation failed:', simulation.value.err);
          
          // Parse the specific error
          const error = simulation.value.err;
          if (error && typeof error === 'object' && 'InstructionError' in error) {
            const instructionError = (error as any).InstructionError;
            if (Array.isArray(instructionError) && instructionError.length === 2) {
              const [instructionIndex, instructionErrorDetails] = instructionError;
              console.error('🚨 Instruction error details:', {
                instructionIndex,
                errorDetails: instructionErrorDetails,
                errorType: typeof instructionErrorDetails === 'object' ? Object.keys(instructionErrorDetails) : 'unknown'
              });
              
              if (instructionErrorDetails && typeof instructionErrorDetails === 'object' && 'Custom' in instructionErrorDetails) {
                const customErrorCode = (instructionErrorDetails as any).Custom;
                console.error('🚨 Custom program error code:', customErrorCode);
                
                // Map common SPL Token error codes
                const errorMessages: { [key: number]: string } = {
                  1: 'Insufficient funds',
                  2: 'Invalid account',
                  3: 'Invalid mint',
                  4: 'Invalid owner',
                  5: 'Invalid account data',
                  6: 'Invalid instruction data',
                  7: 'Invalid program',
                  8: 'Invalid program data',
                  9: 'Invalid program execution',
                  10: 'Invalid argument'
                };
                
                const errorMessage = errorMessages[customErrorCode] || `Unknown error code: ${customErrorCode}`;
                console.error('🚨 Error message:', errorMessage);
                
                throw new Error(`Transaction simulation failed: ${errorMessage} (Instruction ${instructionIndex}, Error Code ${customErrorCode})`);
              }
            }
          }
          
          throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}`);
        }
        
        console.log('✅ Transaction simulation successful');
        console.log('🔍 Compute units used:', simulation.value.unitsConsumed);
        
      } catch (simError) {
        console.error('❌ Transaction simulation error:', simError);
        throw simError;
      }
      
      // Now send the actual transaction
      try {
        console.log('🚀 Sending transaction...');
      const signature = await connection.sendRawTransaction(signedTx.serialize());
        console.log('✅ Transaction sent, signature:', signature);

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');
        console.log('✅ Transaction confirmed');
      } catch (sendError: any) {
        console.error('❌ Transaction failed:', sendError);
        
        // Check if it's a simulation error with logs
        if (sendError.logs) {
          console.error('🔍 Transaction logs:', sendError.logs);
          
          // Look for specific DBC program errors
          const dbcError = sendError.logs.find((log: string) => 
            log.includes('AnchorError') || log.includes('custom program error')
          );
          
          if (dbcError) {
            console.error('🚨 DBC Program Error:', dbcError);
            throw new Error(`DBC Program Error: ${dbcError}`);
          }
        }
        
        throw sendError;
      }

      toast.success(
        `Successfully ${isBuying ? 'bought' : 'sold'} ${parseFloat(amount).toFixed(2)} ${isBuying ? tokenSymbol : 'USDC'}!`
      );

      // Reset form
      setAmount('');
      setQuote(null);

    } catch (error) {
      console.error('Swap error:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('Pool not found')) {
          toast.error('DBC pool not found - token may not be launched yet');
        } else if (error.message.includes('Insufficient')) {
          toast.error('Insufficient balance for swap');
        } else if (error.message.includes('Slippage')) {
          toast.error('Slippage tolerance exceeded');
        } else if (error.message.includes('User rejected')) {
          toast.error('Transaction was cancelled by user');
        } else if (error.message.includes('Blockhash')) {
          toast.error('Network error - please try again');
        } else {
          toast.error(`Swap failed: ${error.message}`);
        }
      } else {
        toast.error('Swap failed - unknown error');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number, decimals: number = 6) => {
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: decimals,
    });
  };

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <h3 className="text-xl font-semibold mb-4">🔄 DBC Swap Interface</h3>
      
      {/* Swap Direction Toggle */}
      <div className="flex bg-black/20 rounded-lg p-1 mb-4">
        <button
          onClick={() => setIsBuying(true)}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
            isBuying
              ? 'bg-green-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Buy {tokenSymbol}
        </button>
        <button
          onClick={() => setIsBuying(false)}
          className={`flex-1 py-2 px-4 rounded-md font-medium transition ${
            !isBuying
              ? 'bg-red-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Sell {tokenSymbol}
        </button>
      </div>

      {/* Devnet USDC Faucet */}
      <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="text-sm text-blue-300">
            💧 Need devnet USDC for testing?
          </div>
          <button
            onClick={getDevnetUSDC}
            className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-xs rounded-md transition"
          >
            Get USDC
          </button>
        </div>
      </div>

      {/* USDC Mint Mismatch Warning */}
      {quoteMint !== 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr' && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <div className="text-sm text-red-300">
            ⚠️ <strong>USDC Mint Mismatch Detected!</strong>
          </div>
          <div className="text-xs text-red-400 mt-1">
            Expected: Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr
          </div>
          <div className="text-xs text-red-400">
            Actual: {quoteMint}
          </div>
          <div className="text-xs text-red-400 mt-1">
            This will cause swap failures. Check your DBC configuration.
          </div>
        </div>
      )}

      {/* Amount Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Amount ({isBuying ? 'USDC' : tokenSymbol})
        </label>
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={`Enter ${isBuying ? 'USDC' : tokenSymbol} amount`}
          className="w-full bg-black/20 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
        />
      </div>

      {/* Swap Mode Setting */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Swap Mode
        </label>
        <div className="flex gap-2">
          {[
            { value: 0, label: 'ExactIn', desc: 'Exact input amount' },
            { value: 1, label: 'PartialFill', desc: 'Allow partial fills' },
            { value: 2, label: 'ExactOut', desc: 'Exact output amount' }
          ].map((mode) => (
            <button
              key={mode.value}
              onClick={() => setSwapMode(mode.value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                swapMode === mode.value
                  ? 'bg-purple-500 text-white'
                  : 'bg-black/20 text-gray-400 hover:text-white'
              }`}
              title={mode.desc}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Slippage Setting */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          Slippage Tolerance
        </label>
        <div className="flex gap-2">
          {[0.5, 1, 2, 5].map((value) => (
            <button
              key={value}
              onClick={() => setSlippage(value)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition ${
                slippage === value
                  ? 'bg-blue-500 text-white'
                  : 'bg-black/20 text-gray-400 hover:text-white'
              }`}
            >
              {value}%
            </button>
          ))}
        </div>
      </div>

      {/* Quote Display */}
      {quote && (
        <div className="bg-black/20 rounded-lg p-4 mb-4">
          <h4 className="text-sm font-medium text-gray-300 mb-2">Swap Quote</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Input:</span>
              <span className="text-white">
                {formatNumber(quote.inputAmount / Math.pow(10, isBuying ? 6 : 9))} {isBuying ? 'USDC' : tokenSymbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Output:</span>
              <span className="text-white">
                {formatNumber(quote.outputAmount / Math.pow(10, isBuying ? 9 : 6))} {isBuying ? tokenSymbol : 'USDC'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Price:</span>
              <span className="text-white">
                ${formatNumber(quote.price, 8)} per {tokenSymbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Fee:</span>
              <span className="text-white">
                {formatNumber(quote.fee / Math.pow(10, isBuying ? 6 : 9))} {isBuying ? 'USDC' : tokenSymbol}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Slippage:</span>
              <span className="text-white">{slippage}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Debug Quote State */}
      <div className="mb-4 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-xs">
        <div className="text-yellow-300">Debug Info:</div>
        <div>Public Key: {publicKey ? '✅' : '❌'}</div>
        <div>Quote: {quote ? '✅' : '❌'}</div>
        <div>Loading: {loading ? '✅' : '❌'}</div>
        <div>Button Disabled: {(!publicKey || !quote || loading) ? 'Yes' : 'No'}</div>
        {quote && (
          <div>Quote Details: {JSON.stringify(quote, null, 2)}</div>
        )}
      </div>

      {/* Execute Swap Button */}
      <button
        onClick={executeSwap}
        disabled={!publicKey || !quote || loading}
        className={`w-full py-3 px-4 rounded-lg font-semibold transition ${
          !publicKey || !quote || loading
            ? 'bg-gray-600 cursor-not-allowed'
            : isBuying
            ? 'bg-green-500 hover:bg-green-600'
            : 'bg-red-500 hover:bg-red-600'
        }`}
      >
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
            Processing...
          </div>
        ) : !publicKey ? (
          'Connect Wallet'
        ) : !quote ? (
          'Enter Amount'
        ) : (
          `${isBuying ? 'Buy' : 'Sell'} ${tokenSymbol}`
        )}
      </button>

      {/* Pool Information */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <h4 className="text-sm font-medium text-gray-300 mb-2">Pool Information</h4>
        <div className="text-xs text-gray-400 space-y-1">
          <div>Pool Address: {poolAddress.slice(0, 8)}...{poolAddress.slice(-8)}</div>
          <div>Base Mint: {baseMint.slice(0, 8)}...{baseMint.slice(-8)}</div>
          <div>Quote Mint: {quoteMint.slice(0, 8)}...{quoteMint.slice(-8)}</div>
        </div>
      </div>
    </div>
  );
}
