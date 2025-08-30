import React, { useState, useEffect } from 'react';
import { useWallet } from '@jup-ag/wallet-adapter';
import { PublicKey, Connection, Transaction } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { toast } from 'react-hot-toast';

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

  const connection = new Connection(
    process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com',
    'confirmed'
  );

  // Get quote when amount changes
  useEffect(() => {
    if (!amount || !publicKey || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    getSwapQuote();
  }, [amount, isBuying, slippage]);

  const getSwapQuote = async () => {
    if (!amount || !publicKey) return;

    try {
      const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
      const amountIn = parseFloat(amount) * Math.pow(10, isBuying ? 6 : 9); // USDC has 6 decimals, tokens have 9

      // Get pool state for current reserves
      const poolState = await dbcClient.state.getPool(new PublicKey(poolAddress));
      if (!poolState) {
        toast.error('Failed to fetch pool state');
        return;
      }

      const currentQuoteReserve = Number(poolState.quoteReserve.toString());
      const currentBaseReserve = Number(poolState.baseReserve.toString());

      // Calculate price using Meteora bonding curve formula
      const price = currentQuoteReserve / currentBaseReserve;
      
      // Calculate output amount (simplified - in real implementation, use SDK quote function)
      const outputAmount = isBuying 
        ? (amountIn * 0.98) / price // Apply 2% fee
        : amountIn * price * 0.98; // Apply 2% fee

      const priceImpact = 0; // Calculate based on pool depth
      const fee = amountIn * 0.02; // 2% fee

      setQuote({
        inputAmount: amountIn,
        outputAmount,
        price,
        priceImpact,
        fee,
        slippage,
      });

    } catch (error) {
      console.error('Error getting quote:', error);
      toast.error('Failed to get swap quote');
    }
  };

  const executeSwap = async () => {
    if (!publicKey || !quote || !amount) {
      toast.error('Please connect wallet and enter amount');
      return;
    }

    setLoading(true);

    try {
      const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
      const amountIn = parseFloat(amount) * Math.pow(10, isBuying ? 6 : 9);

      // Create swap transaction
      const swapTx = await dbcClient.pool.swap({
        pool: new PublicKey(poolAddress),
        inputMint: isBuying ? new PublicKey(quoteMint) : new PublicKey(baseMint),
        outputMint: isBuying ? new PublicKey(baseMint) : new PublicKey(quoteMint),
        amount: amountIn,
        slippageBps: slippage * 100, // Convert percentage to basis points
        swapBaseForQuote: !isBuying, // true for selling tokens
        hasReferral: false,
        payer: publicKey,
      });

      // Get latest blockhash
      const { blockhash } = await connection.getLatestBlockhash();
      swapTx.feePayer = publicKey;
      swapTx.recentBlockhash = blockhash;

      // Sign and send transaction
      const signedTx = await signTransaction(swapTx);
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success(
        `Successfully ${isBuying ? 'bought' : 'sold'} ${parseFloat(amount).toFixed(2)} ${isBuying ? tokenSymbol : 'USDC'}!`
      );

      // Reset form
      setAmount('');
      setQuote(null);

    } catch (error) {
      console.error('Swap error:', error);
      toast.error(error instanceof Error ? error.message : 'Swap failed');
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
