'use client'

// components/DbcPoolForm.tsx
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface DbcPoolFormProps {
  config: any;
  onPoolCreated: () => void;
}

export default function DbcPoolForm({ config, onPoolCreated }: DbcPoolFormProps) {
  const { publicKey } = useWallet();
  const [formData, setFormData] = useState({
    name: '',
    symbol: '',
    uri: '',
    baseMintKeypairFilepath: '',
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey) return;

    setLoading(true);
    try {
      const poolConfig = {
        ...config,
        dbcPool: {
          ...formData,
          baseMintKeypairFilepath: formData.baseMintKeypairFilepath || undefined,
        },
      };

      const response = await fetch('/api/dbc/create-pool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          config: poolConfig,
          walletPublicKey: publicKey.toString()
        }),
      });

      if (!response.ok) {
        throw new Error('Pool creation failed');
      }

      console.log('Pool created successfully');
      onPoolCreated();
    } catch (error) {
      console.error('Failed to create pool:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold mb-2">Configuration Summary</h3>
        <p className="text-sm text-gray-600">
          Curve Mode: {config.dbcConfig.buildCurveMode === 0 ? 'Build Curve' :
                       config.dbcConfig.buildCurveMode === 1 ? 'Build Curve with Market Cap' :
                       config.dbcConfig.buildCurveMode === 2 ? 'Build Curve with Two Segments' :
                       'Build Curve with Liquidity Weights'}
        </p>
        <p className="text-sm text-gray-600">
          Quote Mint: {config.quoteMint}
        </p>
        <p className="text-sm text-gray-600">
          Total Supply: {config.dbcConfig.totalTokenSupply.toLocaleString()}
        </p>
      </div>

      <div>
        <label>Token Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({...formData, name: e.target.value})}
          placeholder="e.g., My Awesome Token"
          required
        />
      </div>

      <div>
        <label>Token Symbol</label>
        <input
          type="text"
          value={formData.symbol}
          onChange={(e) => setFormData({...formData, symbol: e.target.value})}
          placeholder="e.g., MAT"
          maxLength={10}
          required
        />
      </div>

      <div>
        <label>Metadata URI</label>
        <input
          type="url"
          value={formData.uri}
          onChange={(e) => setFormData({...formData, uri: e.target.value})}
          placeholder="<https://example.com/metadata.json>"
          required
        />
        <p className="text-sm text-gray-500 mt-1">
          This should point to a JSON file containing token metadata
        </p>
      </div>

      <div>
        <label>Base Mint Keypair File Path (Optional)</label>
        <input
          type="text"
          value={formData.baseMintKeypairFilepath}
          onChange={(e) => setFormData({...formData, baseMintKeypairFilepath: e.target.value})}
          placeholder="Path to existing keypair file, or leave empty to generate new"
        />
        <p className="text-sm text-gray-500 mt-1">
          Leave empty to generate a new keypair for the base token
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !publicKey}
        className="btn-primary w-full"
      >
        {loading ? 'Creating Pool...' : 'Create DBC Pool'}
      </button>
    </form>
  );
}
