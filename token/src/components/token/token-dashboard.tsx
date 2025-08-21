'use client'

import { useState, useEffect } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { TokenService } from '@/lib/token-service'
import { useTokenMinting } from './use-token-minting'
import { useCluster } from '@/components/cluster/cluster-data-access'
import { Copy, ExternalLink, Trash2, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { ellipsify } from '@/lib/utils'

interface TokenInfo {
  mint: PublicKey
  decimals: number
  supply: bigint
  mintAuthority: PublicKey | null
  freezeAuthority: PublicKey | null
  isInitialized: boolean
}

export function TokenDashboard() {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const { cluster } = useCluster()
  const { burnMintAuthority, assignTeamMultisig } = useTokenMinting()
  
  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [teamMultisigPDA, setTeamMultisigPDA] = useState('')
  const [selectedToken, setSelectedToken] = useState<PublicKey | null>(null)

  useEffect(() => {
    if (publicKey) {
      loadTokens()
    }
  }, [publicKey, connection])

  const loadTokens = async () => {
    if (!publicKey) return
    
    setLoading(true)
    try {
      // In a real implementation, you would store created tokens in a database
      // For now, we'll show a message about how to view tokens
      setTokens([])
    } catch (error) {
      console.error('Failed to load tokens:', error)
      toast.error('Failed to load tokens')
    } finally {
      setLoading(false)
    }
  }

  const handleBurnAuthority = async (mint: PublicKey) => {
    try {
      await burnMintAuthority(mint.toString())
      toast.success('Mint authority burned successfully')
      loadTokens()
    } catch (error) {
      console.error('Failed to burn authority:', error)
    }
  }

  const handleAssignTeamMultisig = async (mint: PublicKey) => {
    if (!teamMultisigPDA.trim()) {
      toast.error('Please enter a team multisig PDA')
      return
    }

    try {
      await assignTeamMultisig(mint.toString(), teamMultisigPDA)
      toast.success('Mint authority transferred to team multisig')
      loadTokens()
      setTeamMultisigPDA('')
    } catch (error) {
      console.error('Failed to assign team multisig:', error)
    }
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
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold mb-4">Token Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400">
          Connect your wallet to view and manage your tokens
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold">Token Dashboard</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your SPL tokens and authority settings
        </p>
      </div>

      {tokens.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/20 rounded-lg">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No Tokens Found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You haven't created any tokens yet, or they're not stored in this dashboard.
          </p>
          <p className="text-sm text-gray-500">
            To view your tokens, you can:
          </p>
          <ul className="text-sm text-gray-500 mt-2 space-y-1">
            <li>• Check your wallet's token accounts</li>
            <li>• Use Solana Explorer to search by your wallet address</li>
            <li>• Create a new token using the form above</li>
          </ul>
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>💡 Devnet Tip:</strong> Get free devnet SOL from the{' '}
              <a 
                href="https://faucet.solana.com/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="underline hover:text-blue-600"
              >
                Solana Faucet
              </a>{' '}
              to test token creation
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold">Your Tokens</h3>
            <Button onClick={loadTokens} variant="outline" size="sm">
              Refresh
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Token</TableHead>
                <TableHead>Decimals</TableHead>
                <TableHead>Supply</TableHead>
                <TableHead>Mint Authority</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tokens.map((token) => (
                <TableRow key={token.mint.toString()}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm">
                        {ellipsify(token.mint.toString(), 8)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(token.mint.toString())}
                      >
                        <Copy size={14} />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openExplorer(`address/${token.mint.toString()}`)}
                      >
                        <ExternalLink size={14} />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>{token.decimals}</TableCell>
                  <TableCell>{token.supply.toString()}</TableCell>
                  <TableCell>
                    {token.mintAuthority ? (
                      <span className="text-green-600">Active</span>
                    ) : (
                      <span className="text-red-600">Burned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {token.mintAuthority && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleBurnAuthority(token.mint)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={14} />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedToken(token.mint)}
                          >
                            <Shield size={14} />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Team Multisig Assignment Modal */}
      {selectedToken && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Assign to Team Multisig</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="teamMultisigPDA">Team Multisig PDA</Label>
                <Input
                  id="teamMultisigPDA"
                  value={teamMultisigPDA}
                  onChange={(e) => setTeamMultisigPDA(e.target.value)}
                  placeholder="Enter PDA address"
                />
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={() => handleAssignTeamMultisig(selectedToken)}
                  disabled={!teamMultisigPDA.trim()}
                >
                  Assign
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedToken(null)
                    setTeamMultisigPDA('')
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
