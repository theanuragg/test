'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLPPoolCreation, LPPoolFormData } from './use-lp-pool-creation'
import { WalletButton } from '../solana/solana-provider'
import { useWallet } from '@solana/wallet-adapter-react'
import { useCluster } from '@/components/cluster/cluster-data-access'
import { MeteoraService } from '@/lib/meteora-service'
import { Copy, ExternalLink, Shield, Zap, Info } from 'lucide-react'
import { toast } from 'sonner'

export function LPPoolCreationForm() {
  const { publicKey } = useWallet()
  const {
    formData,
    state,
    updateFormData,
    createPool,
    resetState,
    resetForm,
    getPoolCreationFee,
    getMinimumLiquidity,
  } = useLPPoolCreation()

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [showAntiSniper, setShowAntiSniper] = useState(false)

  const { cluster } = useCluster()

  const handleInputChange = (field: keyof LPPoolFormData, value: string | number | boolean) => {
    updateFormData(field, value)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createPool(formData)
    } catch (error) {
      // Error is already handled in the hook
      console.error('LP Pool creation failed:', error)
    }
  }

  const handleReset = () => {
    resetState()
    resetForm()
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const openExplorer = (path: string) => {
    const explorerUrl = `https://explorer.solana.com/${path}${cluster.network === 'devnet' ? '?cluster=devnet' : ''}`
    window.open(explorerUrl, '_blank')
  }

  if (!publicKey) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <h2 className="text-2xl font-bold">Create LP Pool</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your wallet to create a new LP Pool using Meteora
        </p>
        <WalletButton />
      </div>
    )
  }

  if (state.success && state.poolResult) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🏊‍♂️</div>
          <h2 className="text-3xl font-bold text-green-600">LP Pool Created Successfully!</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your liquidity pool has been created on Meteora
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-green-800 dark:text-green-200">Pool Details</h3>
            
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Pool Type:</Label>
              <span className="font-mono bg-green-100 dark:bg-green-800 px-2 py-1 rounded">
                {formData.poolType}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Fee Rate:</Label>
              <span className="font-mono">{(formData.feeRate / 100).toFixed(2)}%</span>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Tick Spacing:</Label>
              <span className="font-mono">{formData.tickSpacing}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Anti-Sniper:</Label>
              <span className={formData.antiSniper ? 'text-green-600' : 'text-red-600'}>
                {formData.antiSniper ? 'Enabled' : 'Disabled'}
              </span>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">Liquidity Amounts</h3>
            
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Base Amount:</Label>
              <span className="font-mono">{formData.baseAmount.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Quote Amount:</Label>
              <span className="font-mono">{formData.quoteAmount.toLocaleString()}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Base Decimals:</Label>
              <span className="font-mono">{formData.baseDecimals}</span>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Quote Decimals:</Label>
              <span className="font-mono">{formData.quoteDecimals}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold">Pool Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Pool ID:</Label>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm">{state.poolResult.poolId.toString()}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(state.poolResult!.poolId.toString())}
                >
                  <Copy size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openExplorer(`address/${state.poolResult!.poolId.toString()}`)}
                >
                  <ExternalLink size={16} />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Pool Address:</Label>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm">{state.poolResult.poolAddress}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(state.poolResult!.poolAddress)}
                >
                  <Copy size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openExplorer(`address/${state.poolResult!.poolAddress}`)}
                >
                  <ExternalLink size={16} />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Pool Config PDA:</Label>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm">{state.poolResult.poolConfigPDA.toString()}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(state.poolResult!.poolConfigPDA.toString())}
                >
                  <Copy size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openExplorer(`address/${state.poolResult!.poolConfigPDA.toString()}`)}
                >
                  <ExternalLink size={16} />
                </Button>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <Label className="font-semibold">Transaction Signature:</Label>
              <div className="flex items-center space-x-2">
                <span className="font-mono text-sm">{state.poolResult.signature}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(state.poolResult!.signature)}
                >
                  <Copy size={16} />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openExplorer(`tx/${state.poolResult!.signature}`)}
                >
                  <ExternalLink size={16} />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <Button onClick={handleReset} variant="outline">
            Create Another Pool
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Create LP Pool</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a new liquidity pool using Meteora DLMM/DBC Dammv2
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center space-x-2 mb-2">
            <Info className="text-blue-600" size={20} />
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
              Pool Creation Information
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700 dark:text-blue-300">
            <div>
              <strong>Pool Creation Fee:</strong> {getPoolCreationFee()} SOL
            </div>
            <div>
              <strong>Minimum Liquidity:</strong> {getMinimumLiquidity().toLocaleString()}
            </div>
            <div>
              <strong>Network:</strong> {cluster.network === 'devnet' ? 'Devnet' : 'Mainnet'}
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Pool Type Selection */}
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Zap className="text-yellow-600" size={20} />
            <span>Pool Type Selection</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="poolType">Pool Type *</Label>
              <select
                id="poolType"
                value={formData.poolType}
                onChange={(e) => handleInputChange('poolType', e.target.value as 'DLMM' | 'DBC')}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                required
              >
                <option value="DLMM">DLMM (Dynamic Liquidity Market Maker)</option>
                <option value="DBC">DBC (Dynamic Bonding Curve)</option>
              </select>
              <p className="text-xs text-gray-500">
                {formData.poolType === 'DLMM' 
                  ? 'DLMM provides concentrated liquidity with customizable fee tiers'
                  : 'DBC offers dynamic bonding curve for flexible pricing'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Token Configuration */}
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Token Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseMint">Base Token Mint Address *</Label>
              <Input
                id="baseMint"
                value={formData.baseMint}
                onChange={(e) => handleInputChange('baseMint', e.target.value)}
                placeholder="Enter base token mint address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quoteMint">Quote Token Mint Address *</Label>
              <Input
                id="quoteMint"
                value={formData.quoteMint}
                onChange={(e) => handleInputChange('quoteMint', e.target.value)}
                placeholder="Enter quote token mint address"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="baseDecimals">Base Token Decimals</Label>
              <Input
                id="baseDecimals"
                type="number"
                min="0"
                max="9"
                value={formData.baseDecimals}
                onChange={(e) => handleInputChange('baseDecimals', parseInt(e.target.value) || 0)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quoteDecimals">Quote Token Decimals</Label>
              <Input
                id="quoteDecimals"
                type="number"
                min="0"
                max="9"
                value={formData.quoteDecimals}
                onChange={(e) => handleInputChange('quoteDecimals', parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>
        </div>

        {/* Liquidity Configuration */}
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Liquidity Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseAmount">Base Token Amount *</Label>
              <Input
                id="baseAmount"
                type="number"
                min={getMinimumLiquidity()}
                value={formData.baseAmount}
                onChange={(e) => handleInputChange('baseAmount', parseInt(e.target.value) || 0)}
                required
              />
              <p className="text-xs text-gray-500">
                Minimum: {getMinimumLiquidity().toLocaleString()}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quoteAmount">Quote Token Amount *</Label>
              <Input
                id="quoteAmount"
                type="number"
                min="1"
                value={formData.quoteAmount}
                onChange={(e) => handleInputChange('quoteAmount', parseInt(e.target.value) || 0)}
                required
              />
            </div>
          </div>
        </div>

        {/* Pool Parameters */}
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Pool Parameters</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feeRate">Fee Rate (Basis Points) *</Label>
              <Input
                id="feeRate"
                type="number"
                min="0"
                max="10000"
                value={formData.feeRate}
                onChange={(e) => handleInputChange('feeRate', parseInt(e.target.value) || 0)}
                required
              />
              <p className="text-xs text-gray-500">
                {formData.feeRate} bp = {(formData.feeRate / 100).toFixed(2)}%
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tickSpacing">Tick Spacing *</Label>
              <Input
                id="tickSpacing"
                type="number"
                min="1"
                value={formData.tickSpacing}
                onChange={(e) => handleInputChange('tickSpacing', parseInt(e.target.value) || 1)}
                required
              />
              <p className="text-xs text-gray-500">
                Lower values = higher precision, higher gas costs
              </p>
            </div>
          </div>
        </div>

        {/* Anti-Sniper Protection */}
        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center space-x-2">
            <Shield className="text-green-600" size={20} />
            <span>Anti-Sniper Protection</span>
          </h3>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="antiSniper"
                checked={formData.antiSniper}
                onChange={(e) => handleInputChange('antiSniper', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="antiSniper" className="cursor-pointer">
                Enable Anti-Sniper Protection
              </Label>
            </div>
            
            {formData.antiSniper && (
              <div className="space-y-2">
                <Label htmlFor="sniperProtectionDelay">Protection Delay (seconds)</Label>
                <Input
                  id="sniperProtectionDelay"
                  type="number"
                  min="60"
                  max="3600"
                  value={formData.sniperProtectionDelay}
                  onChange={(e) => handleInputChange('sniperProtectionDelay', parseInt(e.target.value) || 300)}
                />
                <p className="text-xs text-gray-500">
                  Delay before allowing large trades (60s - 3600s)
                </p>
              </div>
            )}
            
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                <strong>💡 Anti-Sniper Tip:</strong> This feature helps prevent large trades from manipulating 
                the pool price immediately after creation. The delay allows the pool to establish a stable 
                price before allowing significant liquidity movements.
              </p>
            </div>
          </div>
        </div>

        {state.error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{state.error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={state.isLoading}
            className="px-8 py-3 text-lg"
          >
            {state.isLoading ? 'Creating LP Pool...' : 'Create LP Pool'}
          </Button>
        </div>
      </form>
    </div>
  )
}
