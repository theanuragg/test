import React from 'react'
import { TokenMintForm, TokenDashboard } from '@/components/token'
import { ClusterIndicator } from '@/components/token/cluster-indicator'

export default function TokenPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">SPL Token Management</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">
          Create, manage, and control your SPL tokens on Solana
        </p>
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg max-w-2xl mx-auto mb-6">
          <h2 className="text-lg font-semibold mb-2 text-green-800 dark:text-green-200">Important:</h2>
          <p className="text-green-700 dark:text-green-300">
            Make sure your wallet is connected in the header before creating tokens. 
            You will sign all transactions with your connected wallet, and the transaction 
            signature will be displayed for your records.
          </p>
        </div>
        <ClusterIndicator />
      </div>
      
      <TokenMintForm />
      
      <div className="border-t pt-8">
        <TokenDashboard />
      </div>
    </div>
  )
}
