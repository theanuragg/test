import React from 'react'
import { TokenMintForm, TokenDashboard } from '@/components/token'
import { ClusterIndicator } from '@/components/token/cluster-indicator'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap, Coins } from 'lucide-react'

export default function TokenPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">SPL Token Management</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Create, manage, and control your SPL tokens on Solana
        </p>
        <ClusterIndicator />
      </div>

      {/* Feature Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
        <Link href="/token" className="block">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
            <div className="flex items-center space-x-3 mb-4">
              <Coins className="text-blue-600" size={24} />
              <h3 className="text-xl font-semibold text-blue-800 dark:text-blue-200">Token Creation</h3>
            </div>
            <p className="text-blue-700 dark:text-blue-300 text-sm">
              Create new SPL tokens with advanced authority management and metadata
            </p>
          </div>
        </Link>

        <Link href="/lp-pool" className="block">
          <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-lg p-6 hover:shadow-lg transition-all duration-200 hover:scale-105">
            <div className="flex items-center space-x-3 mb-4">
              <Zap className="text-green-600" size={24} />
              <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">LP Pool Creation</h3>
            </div>
            <p className="text-green-700 dark:text-green-300 text-sm">
              Create liquidity pools using Meteora DLMM/DBC with anti-sniper protection
            </p>
          </div>
        </Link>
      </div>
      
      <TokenMintForm />
      
      <div className="border-t pt-8">
        <TokenDashboard />
      </div>
    </div>
  )
}
