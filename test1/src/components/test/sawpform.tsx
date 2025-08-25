 'use client'

// components/SwapForm.tsx (Completed)
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { swap } from '../../app/lib/dbc';

export default function SwapForm() {
  const { publicKey, signTransaction } = useWallet();
  const [formData, setFormData] = useState({
    baseMint: '',
    amountIn: 0,
    slippageBps: 100,
    swapBaseForQuote: false,
    referralTokenAccount: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    setLoading(true);
    try {
      const config = {
        rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '<https://api.devnet.solana.com>',
        dryRun: false,
        baseMint: formData.baseMint,
        dbcSwap: formData,
      };

      const response = await fetch('/api/dbc/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, walletPublicKey: publicKey.toString() }),
      });

      if (!response.ok) {
        throw new Error('Swap failed');
      }

      console.log('Swap successful');
    } catch (error) {
      console.error('Failed to swap:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label>Base Token Mint</label>
        <input
          type="text"
          value={formData.baseMint}
          onChange={(e) => setFormData({...formData, baseMint: e.target.value})}
          placeholder="Enter base token mint address"
          required
        />
      </div>

      <div>
        <label>Amount In</label>
        <input
          type="number"
          value={formData.amountIn}
          onChange={(e) => setFormData({...formData, amountIn: parseFloat(e.target.value)})}
          step="0.000001"
          required
        />
      </div>

      <div>
        <label>Slippage (BPS)</label>
        <input
          type="number"
          value={formData.slippageBps}
          onChange={(e) => setFormData({...formData, slippageBps: parseInt(e.target.value)})}
          min="1"
          max="10000"
          required
        />
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={formData.swapBaseForQuote}
            onChange={(e) => setFormData({...formData, swapBaseForQuote: e.target.checked})}
          />
          Swap Base for Quote (Sell)
        </label>
      </div>

      <div>
        <label>Referral Token Account (Optional)</label>
        <input
          type="text"
          value={formData.referralTokenAccount}
          onChange={(e) => setFormData({...formData, referralTokenAccount: e.target.value})}
          placeholder="Referral token account address"
        />
      </div>

      <button
        type="submit"
        disabled={loading || !publicKey}
        className="btn-primary"
      >
        {loading ? 'Swapping...' : 'Execute Swap'}
      </button>
    </form>
  );
}
