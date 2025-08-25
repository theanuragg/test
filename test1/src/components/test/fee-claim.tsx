'use client'

// components/FeeClaimForm.tsx
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export default function FeeClaimForm() {
  const { publicKey } = useWallet();
  const [formData, setFormData] = useState({
    baseMint: '',
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
      };

      const response = await fetch('/api/dbc/claim-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, walletPublicKey: publicKey.toString() }),
      });

      if (!response.ok) {
        throw new Error('Fee claim failed');
      }

      console.log('Fees claimed successfully');
    } catch (error) {
      console.error('Failed to claim fees:', error);
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

      <button
        type="submit"
        disabled={loading || !publicKey}
        className="btn-primary"
      >
        {loading ? 'Claiming...' : 'Claim Trading Fees'}
      </button>
    </form>
  );
}
