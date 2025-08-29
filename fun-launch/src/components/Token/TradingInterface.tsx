/**
 * Trading Interface Component
 * 
 * Provides trading functionality using Jupiter APIs
 */

import React, { useState, useEffect } from 'react';
import { useWallet } from '@jup-ag/wallet-adapter';
import { TokenInfo, TokenPrice, SwapQuote } from '../../lib/jupiter/api-client';
import { jupiterAPI } from '../../lib/jupiter/api-client';
import { Transaction } from '@solana/web3.js';
import { toast } from 'sonner';

interface TradingInterfaceProps {
  tokenMint: string;
  tokenInfo: TokenInfo | null;
  price: TokenPrice | null;
  quote: SwapQuote | null;
  loading: boolean;
  onGetQuote: (params: any) => void;
}

export function TradingInterface({
  tokenMint,
  tokenInfo,
  price,
  quote,
  loading,
  onGetQuote,
}: TradingInterfaceProps) {
  const { publicKey, signTransaction } = useWallet();
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [tradeDirection, setTradeDirection] = useState<'buy' | 'sell'>('buy');
  const [executing, setExecuting] = useState(false);

  // USDC mint address (mainnet)
  const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

  const handleGetQuote = () => {
    if (!amount || !publicKey) return;

    const inputMint = tradeDirection === 'buy' ? USDC_MINT : tokenMint;
    const outputMint = tradeDirection === 'buy' ? tokenMint : USDC_MINT;
    const amountIn = tradeDirection === 'buy' 
      ? (parseFloat(amount) * 1e6).toString() // USDC has 6 decimals
      : (parseFloat(amount) * Math.pow(10, tokenInfo?.decimals || 9)).toString();

    onGetQuote({
      inputMint,
      outputMint,
      amount: amountIn,
      slippageBps: slippage * 100,
    });
  };

  const handleSwap = async () => {
    if (!quote || !publicKey || !signTransaction) {
      toast.error('Please connect your wallet and get a quote first');
      return;
    }

    setExecuting(true);
    try {
      // Get hybrid swap transaction (DBC pre-migration, Jupiter post)
      const swapResponse = await fetch('/api/swap/tx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quoteResponse: quote, userPublicKey: publicKey.toString() }),
      }).then(async (r) => {
        if (!r.ok) throw new Error(`Swap tx API error: ${r.status}`);
        const data = await r.json();
        return data;
      });

      if (!swapResponse) {
        throw new Error('Failed to get swap transaction');
      }

      // Sign the transaction
      const signedTx = await signTransaction(
        Transaction.from(Buffer.from(swapResponse.swapTransactionB64, 'base64'))
      );

      // Send the transaction
      // This would typically be sent to the network
      toast.success('Swap transaction signed successfully!');
    } catch (error) {
      console.error('Error executing swap:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to execute swap');
    } finally {
      setExecuting(false);
    }
  };

  useEffect(() => {
    if (amount) {
      handleGetQuote();
    }
  }, [amount, tradeDirection, slippage]);

  const estimatedOutput = quote ? parseFloat(quote.outAmount) / Math.pow(10, tokenInfo?.decimals || 9) : 0;
  const priceImpact = quote?.priceImpactPct || 0;

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">Trade</h3>
      
      {/* Trade Direction Toggle */}
      <div className="flex bg-white/10 rounded-lg p-1 mb-4">
        <button
          onClick={() => setTradeDirection('buy')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
            tradeDirection === 'buy'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Buy
        </button>
        <button
          onClick={() => setTradeDirection('sell')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
            tradeDirection === 'sell'
              ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Sell
        </button>
      </div>

      {/* Amount Input */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            {tradeDirection === 'buy' ? 'USDC Amount' : `${tokenInfo?.symbol || 'Token'} Amount`}
          </label>
          <div className="relative">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">
              {tradeDirection === 'buy' ? 'USDC' : tokenInfo?.symbol || 'TOKEN'}
            </div>
          </div>
        </div>

        {/* Estimated Output */}
        {quote && (
          <div className="bg-white/5 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Estimated Output</span>
              <span className="text-sm font-medium text-white">
                {estimatedOutput.toFixed(6)} {tradeDirection === 'buy' ? tokenInfo?.symbol || 'TOKEN' : 'USDC'}
              </span>
            </div>
            
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Price Impact</span>
              <span className={priceImpact > 1 ? 'text-red-400' : 'text-green-400'}>
                {priceImpact.toFixed(2)}%
              </span>
            </div>
          </div>
        )}

        {/* Slippage Settings */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Slippage Tolerance
          </label>
          <div className="flex space-x-2">
            {[0.1, 0.5, 1.0].map((value) => (
              <button
                key={value}
                onClick={() => setSlippage(value)}
                className={`px-3 py-1 rounded text-sm transition ${
                  slippage === value
                    ? 'bg-white/20 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {value}%
              </button>
            ))}
            <input
              type="number"
              value={slippage}
              onChange={(e) => setSlippage(parseFloat(e.target.value) || 0)}
              placeholder="Custom"
              className="flex-1 bg-white/10 border border-white/20 rounded px-3 py-1 text-white text-sm placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-pink-500"
            />
          </div>
        </div>

        {/* Execute Button */}
        <button
          onClick={handleSwap}
          disabled={!quote || executing || !publicKey}
          className={`w-full py-3 px-4 rounded-lg font-medium transition ${
            !quote || executing || !publicKey
              ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white'
          }`}
        >
          {executing ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Executing...</span>
            </div>
          ) : !publicKey ? (
            'Connect Wallet'
          ) : !quote ? (
            'Get Quote'
          ) : (
            `${tradeDirection === 'buy' ? 'Buy' : 'Sell'} ${tokenInfo?.symbol || 'Token'}`
          )}
        </button>
      </div>

      {/* Price Info */}
      {price && (
        <div className="mt-4 pt-4 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-400">Current Price</span>
            <span className="text-white">
              ${price.price.toFixed(6)} USDC
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
