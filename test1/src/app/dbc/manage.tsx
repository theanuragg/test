// pages/dbc/manage.tsx
import React, { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import SwapForm from '../../components/test/sawpform';
import FeeClaimForm from '../../components/test/fee-claim';
import MigrationForm from '../../components/test/migration';

export default function DbcPoolManagement() {
  const { publicKey } = useWallet();
  const [activeTab, setActiveTab] = useState('swap');
  const [poolInfo, setPoolInfo] = useState<any>(null);

  useEffect(() => {
    if (publicKey) {
      // Fetch pool information for the connected wallet
      fetchPoolInfo();
    }
  }, [publicKey]);

  const fetchPoolInfo = async () => {
    // Implementation to fetch pool information
    // This would include pool state, fees, migration status, etc.
  };

  if (!publicKey) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">DBC Pool Management</h1>
          <p>Please connect your wallet to manage DBC pools.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">DBC Pool Management</h1>

      {/* Pool Information Display */}
      {poolInfo && (
        <div className="bg-gray-100 p-6 rounded-lg mb-8">
          <h2 className="text-xl font-semibold mb-4">Pool Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <strong>Pool Address:</strong>
              <p className="text-sm font-mono">{poolInfo.poolAddress}</p>
            </div>
            <div>
              <strong>Status:</strong>
              <p>{poolInfo.isMigrated ? 'Migrated' : 'Active'}</p>
            </div>
            <div>
              <strong>Quote Reserve:</strong>
              <p>{poolInfo.quoteReserve}</p>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg mb-8">
        <button
          onClick={() => setActiveTab('swap')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'swap' ? 'bg-white shadow-sm' : 'text-gray-600'
          }`}
        >
          Swap
        </button>
        <button
          onClick={() => setActiveTab('fees')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'fees' ? 'bg-white shadow-sm' : 'text-gray-600'
          }`}
        >
          Claim Fees
        </button>
        <button
          onClick={() => setActiveTab('migrate')}
          className={`px-4 py-2 rounded-md ${
            activeTab === 'migrate' ? 'bg-white shadow-sm' : 'text-gray-600'
          }`}
        >
          Migrate
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        {activeTab === 'swap' && <SwapForm />}
        {activeTab === 'fees' && <FeeClaimForm />}
        {activeTab === 'migrate' && <MigrationForm />}
      </div>
    </div>
  );
}
