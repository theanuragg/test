'use client'

// components/MigrationForm.tsx
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export default function MigrationForm() {
  const { publicKey } = useWallet();
  const [formData, setFormData] = useState({
    baseMint: '',
    migrationVersion: 'v1',
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

      const endpoint = formData.migrationVersion === 'v1' ? '/api/dbc/migrate-v1' : '/api/dbc/migrate-v2';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config, walletPublicKey: publicKey.toString() }),
      });

      if (!response.ok) {
        throw new Error('Migration failed');
      }

      console.log('Migration successful');
    } catch (error) {
      console.error('Failed to migrate:', error);
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
        <label>Migration Version</label>
        <select
          value={formData.migrationVersion}
          onChange={(e) => setFormData({...formData, migrationVersion: e.target.value})}
          required
        >
          <option value="v1">DAMM V1</option>
          <option value="v2">DAMM V2</option>
        </select>
      </div>

      <button
        type="submit"
        disabled={loading || !publicKey}
        className="btn-primary"
      >
        {loading ? 'Migrating...' : `Migrate to DAMM ${formData.migrationVersion.toUpperCase()}`}
      </button>
    </form>
  );
}
