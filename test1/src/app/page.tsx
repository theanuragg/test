// pages/index.tsx
import React from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export default function Home() {
  const { publicKey } = useWallet();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            DBC Pool Creation System
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Create, manage, and trade on Dynamic Bonding Curve pools powered by Meteora
          </p>

          <div className="flex justify-center mb-8">
            <WalletMultiButton />
          </div>
        </div>

        {publicKey ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Link href="/tokens/create">
              <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                <h3 className="text-xl font-semibold mb-3">Create Token</h3>
                <p className="text-gray-600">Create a new SPL token with metadata</p>
              </div>
            </Link>

            <Link href="/dbc/create">
              <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                <h3 className="text-xl font-semibold mb-3">Create DBC Pool</h3>
                <p className="text-gray-600">Launch a new Dynamic Bonding Curve pool</p>
              </div>
            </Link>

            <Link href="/dbc/manage">
              <div className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow cursor-pointer">
                <h3 className="text-xl font-semibold mb-3">Manage Pools</h3>
                <p className="text-gray-600">Swap, claim fees, and migrate pools</p>
              </div>
            </Link>
          </div>
        ) : (
          <div className="text-center">
            <p className="text-lg text-gray-600">
              Connect your wallet to get started with DBC pool creation
            </p>
          </div>
        )}

        <div className="mt-16 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🚀</span>
              </div>
              <h3 className="font-semibold mb-2">Token Creation</h3>
              <p className="text-sm text-gray-600">Create SPL tokens with full metadata</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">📊</span>
              </div>
              <h3 className="font-semibold mb-2">DBC Pools</h3>
              <p className="text-sm text-gray-600">Launch Dynamic Bonding Curve pools</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">💱</span>
              </div>
              <h3 className="font-semibold mb-2">Trading</h3>
              <p className="text-sm text-gray-600">Swap tokens on DBC pools</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-white text-2xl">🔄</span>
              </div>
              <h3 className="font-semibold mb-2">Migration</h3>
              <p className="text-sm text-gray-600">Migrate to DAMM V1/V2 pools</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
