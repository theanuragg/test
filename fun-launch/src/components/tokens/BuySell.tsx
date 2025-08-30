'use client';
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { variants } from '@/lib/theme';

interface BuySellProps {
  tokenSymbol?: string;
  tokenBalance?: number;
  solBalance?: number;
}

export function BuySell({
  tokenSymbol = 'LARP',
  tokenBalance = 0,
  solBalance = 1.25,
}: BuySellProps) {
  const [activeTab, setActiveTab] = useState<'buy' | 'sell'>('buy');
  const [quantity, setQuantity] = useState<string>('');
  const [minReceived, setMinReceived] = useState<string>('--');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const quickAmounts = [0.1, 0.5, 1];

  const handleTabChange = (tab: 'buy' | 'sell') => {
    setActiveTab(tab);
    setQuantity('');
    setMinReceived('--');
  };

  const handleQuickAmount = (amount: number) => {
    setQuantity(amount.toString());
    if (activeTab === 'buy') {
      setMinReceived((amount * 1000).toFixed(2));
    } else {
      setMinReceived((amount * 0.001).toFixed(4));
    }
  };

  const handleMaxAmount = () => {
    if (activeTab === 'buy') {
      setQuantity(solBalance.toString());
      setMinReceived((solBalance * 1000).toFixed(2));
    } else {
      setQuantity(tokenBalance.toString());
      setMinReceived((tokenBalance * 0.001).toFixed(4));
    }
  };

  const handleReset = () => {
    setQuantity('');
    setMinReceived('--');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="border border-[#00ffff]/40 rounded-4xl p-4 backdrop-blur-sm">
        <div className="relative mb-6">
                     <div className="flex bg-neutral-700 rounded-2xl p-1 gap-1">
             <div
               onClick={() => handleTabChange('buy')}
               className={`w-full py-2 md:py-3 rounded-lg font-medium text-sm md:text-base transition-colors cursor-pointer flex items-center justify-center ${
                 activeTab === 'buy' ? 'opacity-100' : 'opacity-60'
               }`} 
               style={{
                 background: 'linear-gradient(rgb(18, 183, 106) 0%, rgb(5, 79, 49) 100%)',
                 boxShadow: activeTab === 'buy' ? 'rgb(255, 255, 255) 0px 0px 8px 0px inset' : 'none'
               }}
             >
               buy
             </div>
             <div
               onClick={() => handleTabChange('sell')}
               className={`w-full py-2 md:py-3 rounded-lg font-medium text-sm md:text-base transition-colors cursor-pointer flex items-center justify-center ${
                 activeTab === 'sell' ? 'opacity-100' : 'opacity-60'
               }`} 
               style={{
                 background: 'linear-gradient(rgb(240, 68, 56) 0%, rgb(145, 32, 24) 100%)',
                 boxShadow: activeTab === 'sell' ? 'rgb(255, 255, 255) 0px 0px 8px 0px inset' : 'none'
               }}
             >
               sell
             </div>
           </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">quantity</span>
            <span className="text-muted-foreground">
              balance{' '}
              <span className="text-foreground font-medium">
                {activeTab === 'buy' ? solBalance : tokenBalance}
              </span>
            </span>
          </div>

          <div className="relative">
            <div className="flex items-center justify-between bg-background border border-border rounded-xl p-4">
              <input
                type="number"
                value={quantity}
                onChange={e => setQuantity(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent text-2xl font-medium text-foreground placeholder:text-muted-foreground border-none outline-none"
              />
              <div className="flex items-center gap-2 text-foreground">
                {activeTab === 'buy' ? (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">SOL</span>
                  </div>
                ) : (
                  <span className="font-medium">{tokenSymbol}</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-white transition-colors duration-300 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              reset
            </button>

            {quickAmounts.map(amount => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                className="px-3 py-2 text-sm text-muted-foreground hover:text-[#00ffff] hover:bg-[#00ffff]/5 rounded-lg transition-all duration-300"
              >
                {amount} SOL
              </button>
            ))}

            <button
              onClick={handleMaxAmount}
              className="px-3 py-2 text-sm text-muted-foreground hover:text-[#00ffff] hover:bg-[#00ffff]/5 rounded-lg transition-all duration-300"
            >
              max
            </button>
          </div>

          <div className="flex justify-between items-center py-3 border-t border-border">
            <span className="text-muted-foreground">min received</span>
            <span className="text-foreground font-medium">{minReceived}</span>
          </div>

          <div className="border-t border-border pt-4">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full py-2 text-muted-foreground hover:text-white transition-colors duration-300"
            >
              <span>advanced settings</span>
              <div
                style={{
                  transform: showAdvanced ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s',
                }}
              >
                <ChevronDown className="w-4 h-4" />
              </div>
            </button>

            {showAdvanced && (
              <div className="pt-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Slippage Tolerance
                  </span>
                  <span className="text-sm text-foreground">1%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Transaction Deadline
                  </span>
                  <span className="text-sm text-foreground">20 minutes</span>
                </div>
              </div>
            )}
          </div>

          <Button
            className="w-full py-4 text-lg font-medium bg-background text-foreground border border-border hover:border-[#00ffff]/30 hover:bg-[#00ffff]/5 rounded-2xl transition-all duration-300"
            disabled={!quantity || quantity === '0'}
          >
            connect
          </Button>
        </div>
      </div>
    </div>
  );
}

export default BuySell;
