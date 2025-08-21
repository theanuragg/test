'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AppModal } from '@/components/app-modal'
import { useTokenMinting, TokenMintFormData } from './use-token-minting'
import { WalletButton } from '../solana/solana-provider'
import { useWallet } from '@solana/wallet-adapter-react'
import { useCluster } from '@/components/cluster/cluster-data-access'
import { TokenService } from '@/lib/token-service'
import { Copy, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'

export function TokenMintForm() {
  const { publicKey } = useWallet()
  const {
    createToken,
    burnMintAuthority,
    assignTeamMultisig,
    isLoading,
    error,
    success,
    mintAddress,
    signature,
    resetState,
  } = useTokenMinting()

  const [formData, setFormData] = useState<TokenMintFormData>({
    tokenName: '',
    tokenSymbol: '',
    decimals: 6,
    totalSupply: 1000000,
    description: '',
    logoUrl: '',
    website: '',
    twitter: '',
    telegram: '',
    discord: '',
    category: 'Utility',
    burnAuthority: false,
    freezeAuthority: false,
    teamMultisigPDA: '',
  })

  const [showAdvanced, setShowAdvanced] = useState(false)

  const handleInputChange = (field: keyof TokenMintFormData, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await createToken(formData)
    } catch (error) {
      // Error is already handled in the hook
      console.error('Token creation failed:', error)
    }
  }

  const handleReset = () => {
    resetState()
    setFormData({
      tokenName: '',
      tokenSymbol: '',
      decimals: 6,
      totalSupply: 1000000,
      description: '',
      logoUrl: '',
      website: '',
      twitter: '',
      telegram: '',
      discord: '',
      category: 'Utility',
      burnAuthority: false,
      freezeAuthority: false,
      teamMultisigPDA: '',
    })
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard!')
  }

  const { cluster } = useCluster()
  
  const openExplorer = (path: string) => {
    const explorerUrl = `https://explorer.solana.com/${path}${cluster.network === 'devnet' ? '?cluster=devnet' : ''}`
    window.open(explorerUrl, '_blank')
  }

  if (!publicKey) {
    return (
      <div className="max-w-md mx-auto text-center space-y-4">
        <h2 className="text-2xl font-bold">Create SPL Token</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your wallet to create a new SPL token
        </p>
        <WalletButton />
      </div>
    )
  }

  if (success && mintAddress) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-3xl font-bold text-green-600">Token Created Successfully!</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Your SPL token has been created on the Solana blockchain
          </p>
        </div>

        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Token Name:</Label>
            <span className="font-mono">{formData.tokenName}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Token Symbol:</Label>
            <span className="font-mono">{formData.tokenSymbol}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Description:</Label>
            <span className="text-sm max-w-xs text-right">{formData.description}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Category:</Label>
            <span>{formData.category}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Decimals:</Label>
            <span>{formData.decimals}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Total Supply:</Label>
            <span>{formData.totalSupply.toLocaleString()}</span>
          </div>
        </div>

        {(formData.website || formData.logoUrl || formData.twitter || formData.telegram || formData.discord) && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 space-y-4">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200">Token Links</h3>
            
            {formData.website && (
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Website:</Label>
                <a 
                  href={formData.website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {formData.website}
                </a>
              </div>
            )}
            
            {formData.logoUrl && (
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Logo:</Label>
                <a 
                  href={formData.logoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View Logo
                </a>
              </div>
            )}
            
            {formData.twitter && (
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Twitter:</Label>
                <span className="text-sm">{formData.twitter}</span>
              </div>
            )}
            
            {formData.telegram && (
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Telegram:</Label>
                <span className="text-sm">{formData.telegram}</span>
              </div>
            )}
            
            {formData.discord && (
              <div className="flex items-center justify-between">
                <Label className="font-semibold">Discord:</Label>
                <span className="text-sm">{formData.discord}</span>
              </div>
            )}
          </div>
        )}

        <div className="bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg p-6 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Mint Address:</Label>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm">{mintAddress}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(mintAddress)}
              >
                <Copy size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openExplorer(`address/${mintAddress}`)}
              >
                <ExternalLink size={16} />
              </Button>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <Label className="font-semibold">Transaction Signature:</Label>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm">{signature}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(signature || '')}
              >
                <Copy size={16} />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openExplorer(`tx/${signature}`)}
              >
                <ExternalLink size={16} />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex justify-center space-x-4">
          <Button onClick={handleReset} variant="outline">
            Create Another Token
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Create SPL Token</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create a new SPL token on Solana with advanced authority management
        </p>
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Mint Fee:</strong> {TokenService.getMintFee()} SOL
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
            <strong>Network:</strong> Devnet (Test Environment) - Use devnet SOL for testing
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="tokenName">Token Name *</Label>
            <Input
              id="tokenName"
              value={formData.tokenName}
              onChange={(e) => handleInputChange('tokenName', e.target.value)}
              placeholder="e.g., My Awesome Token"
              required
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tokenSymbol">Token Symbol *</Label>
            <Input
              id="tokenSymbol"
              value={formData.tokenSymbol}
              onChange={(e) => handleInputChange('tokenSymbol', e.target.value.toUpperCase())}
              placeholder="e.g., MAT"
              required
              maxLength={10}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Token Description *</Label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            placeholder="Describe your token's purpose, use case, and value proposition..."
            required
            maxLength={500}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          />
          <div className="flex justify-between items-center">
            <p className="text-xs text-gray-500">
              Describe your token's purpose and value proposition
            </p>
            <span className={`text-xs ${formData.description.length >= 450 ? 'text-orange-500' : 'text-gray-500'}`}>
              {formData.description.length}/500
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="logoUrl">Logo URL</Label>
            <Input
              id="logoUrl"
              type="url"
              value={formData.logoUrl}
              onChange={(e) => handleInputChange('logoUrl', e.target.value)}
              placeholder="https://example.com/logo.png"
            />
            <p className="text-xs text-gray-500">
              Direct link to your token logo (PNG, JPG, SVG)
            </p>
            {formData.logoUrl && (
              <div className="mt-2">
                <Label className="text-xs text-gray-600 dark:text-gray-400">Logo Preview:</Label>
                <div className="mt-1 p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800">
                  <img 
                    src={formData.logoUrl} 
                    alt="Token Logo Preview" 
                    className="w-16 h-16 object-contain mx-auto"
                    onError={(e) => {
                      const target = e.currentTarget as HTMLImageElement
                      target.style.display = 'none'
                      const errorDiv = target.nextElementSibling as HTMLDivElement
                      if (errorDiv) errorDiv.style.display = 'block'
                    }}
                  />
                  <div className="hidden text-xs text-red-500 text-center">Invalid image URL</div>
                </div>
              </div>
            )}
            
            <div className="mt-4 p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <div className="mb-2">📁</div>
                <div>Drag & drop logo here or</div>
                <button
                  type="button"
                  onClick={() => document.getElementById('logoFile')?.click()}
                  className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                >
                  browse files
                </button>
                <input
                  id="logoFile"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      // In a real app, you'd upload this to IPFS or similar
                      // For now, we'll just show a message
                      toast.info('File upload feature coming soon! Please use a direct URL for now.')
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Token Category</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
            >
              <option value="Utility">Utility Token</option>
              <option value="Governance">Governance Token</option>
              <option value="Stablecoin">Stablecoin</option>
              <option value="NFT">NFT Collection</option>
              <option value="DeFi">DeFi Token</option>
              <option value="Gaming">Gaming Token</option>
              <option value="Meme">Meme Token</option>
              <option value="Other">Other</option>
            </select>
            <p className="text-xs text-gray-500">
              Choose the category that best describes your token
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="website">Website URL</Label>
          <Input
            id="website"
            type="url"
            value={formData.website}
            onChange={(e) => handleInputChange('website', e.target.value)}
            placeholder="https://yourproject.com"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="twitter">Twitter</Label>
            <Input
              id="twitter"
              value={formData.twitter}
              onChange={(e) => handleInputChange('twitter', e.target.value)}
              placeholder="@username or URL"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telegram">Telegram</Label>
            <Input
              id="telegram"
              value={formData.telegram}
              onChange={(e) => handleInputChange('telegram', e.target.value)}
              placeholder="Group link or username"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="discord">Discord</Label>
            <Input
              id="discord"
              value={formData.discord}
              onChange={(e) => handleInputChange('discord', e.target.value)}
              placeholder="Server invite link"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="decimals">Decimals *</Label>
            <Input
              id="decimals"
              type="number"
              min="0"
              max="9"
              value={formData.decimals}
              onChange={(e) => handleInputChange('decimals', parseInt(e.target.value) || 0)}
              required
            />
            <p className="text-xs text-gray-500">
              Most tokens use 6-9 decimals. 6 decimals = 1,000,000 = 1 token
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="totalSupply">Total Supply *</Label>
            <Input
              id="totalSupply"
              type="number"
              min="1"
              value={formData.totalSupply}
              onChange={(e) => handleInputChange('totalSupply', parseInt(e.target.value) || 1)}
              required
            />
            <p className="text-xs text-gray-500">
              Initial supply to mint. With {formData.decimals} decimals: {formData.totalSupply.toLocaleString()} = {(formData.totalSupply / Math.pow(10, formData.decimals)).toLocaleString()} tokens
            </p>
          </div>
        </div>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <div className="text-yellow-600 dark:text-yellow-400 mt-0.5">💡</div>
            <div className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Token Economics Tip:</strong> Consider your token's use case when setting decimals and supply. 
              Utility tokens often use 6-9 decimals, while governance tokens might use 0-6 decimals. 
              Total supply should reflect your tokenomics strategy.
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </Button>

          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="burnAuthority"
                  checked={formData.burnAuthority}
                  onChange={(e) => handleInputChange('burnAuthority', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="burnAuthority" className="cursor-pointer">
                  Burn Mint Authority (Fixed Supply)
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                This will permanently disable the ability to mint more tokens
              </p>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="freezeAuthority"
                  checked={formData.freezeAuthority}
                  onChange={(e) => handleInputChange('freezeAuthority', e.target.checked)}
                  className="rounded"
                />
                <Label htmlFor="freezeAuthority" className="cursor-pointer">
                  Burn Freeze Authority
                </Label>
              </div>
              <p className="text-xs text-gray-500 ml-6">
                This will permanently disable the ability to freeze token accounts
              </p>

              <div className="space-y-2">
                <Label htmlFor="teamMultisigPDA">Team Multisig PDA (Optional)</Label>
                <Input
                  id="teamMultisigPDA"
                  value={formData.teamMultisigPDA}
                  onChange={(e) => handleInputChange('teamMultisigPDA', e.target.value)}
                  placeholder="Enter PDA address for team multisig"
                />
                <p className="text-xs text-gray-500">
                  Transfer mint authority to a team multisig program
                </p>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        )}

        <div className="flex justify-center">
          <Button
            type="submit"
            disabled={isLoading}
            className="px-8 py-3 text-lg"
          >
            {isLoading ? 'Creating Token...' : 'Create Token'}
          </Button>
        </div>
      </form>
    </div>
  )
}
