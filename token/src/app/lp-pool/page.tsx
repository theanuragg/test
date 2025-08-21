import React from 'react'
import { LPPoolCreationForm } from '@/components/token/lp-pool-creation-form'
import { ClusterIndicator } from '@/components/token/cluster-indicator'

export default function LPPoolPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Meteora LP Pool Creation</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          Create liquidity pools using Meteora DLMM/DBC Dammv2 with anti-sniper protection
        </p>
        <ClusterIndicator />
      </div>
      
      <LPPoolCreationForm />
    </div>
  )
}
