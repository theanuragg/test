'use client'

import { useCallback, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { Keypair, PublicKey } from '@solana/web3.js'
import { TokenService, TokenMintParams } from '@/lib/token-service'
import { toast } from 'sonner'

export interface TokenMintFormData {
  tokenName: string
  tokenSymbol: string
  decimals: number
  totalSupply: number
  description: string
  logoUrl: string
  website: string
  twitter: string
  telegram: string
  discord: string
  category: string
  burnAuthority: boolean
  freezeAuthority: boolean
  teamMultisigPDA?: string
}

export interface TokenMintState {
  isLoading: boolean
  error: string | null
  success: boolean
  mintAddress: string | null
  signature: string | null
}

export function useTokenMinting() {
  const { connection } = useConnection()
  const { publicKey, signTransaction, signAllTransactions } = useWallet()
  
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

  const [state, setState] = useState<TokenMintState>({
    isLoading: false,
    error: null,
    success: false,
    mintAddress: null,
    signature: null,
  })

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: false,
      mintAddress: null,
      signature: null,
    })
  }, [])

  const resetForm = useCallback(() => {
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
  }, [])

  const createToken = useCallback(async (formData: TokenMintFormData) => {
    if (!publicKey || !signTransaction || !signAllTransactions) {
      setState(prev => ({ ...prev, error: 'Wallet not connected or does not support signing' }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Validate form data
      if (!formData.tokenName.trim()) {
        throw new Error('Token name is required')
      }
      if (!formData.tokenSymbol.trim()) {
        throw new Error('Token symbol is required')
      }
      if (formData.tokenSymbol.length > 10) {
        throw new Error('Token symbol must be 10 characters or less')
      }
      if (formData.decimals < 0 || formData.decimals > 9) {
        throw new Error('Decimals must be between 0 and 9')
      }
      if (formData.totalSupply <= 0) {
        throw new Error('Total supply must be greater than 0')
      }

      // Check if user has sufficient balance for mint fee
      const balance = await connection.getBalance(publicKey)
      const mintFee = TokenService.getMintFee()
      if (balance < mintFee * 1e9) { // Convert to lamports
        throw new Error(`Insufficient balance. Required: ${mintFee} SOL`)
      }

      // Only generate a keypair for the mint account (required by SPL token program)
      // The user's connected wallet will be the payer and mint authority
      const mintKeypair = Keypair.generate()
      
      // Prepare mint parameters - use user's wallet as payer and mint authority
      const mintParams: TokenMintParams = {
        connection,
        payer: publicKey, // Use user's connected wallet as payer
        mintAuthority: publicKey, // Use user's connected wallet as mint authority
        decimals: formData.decimals,
        tokenName: formData.tokenName.trim(),
        tokenSymbol: formData.tokenSymbol.trim().toUpperCase(),
        totalSupply: formData.totalSupply,
        teamMultisigPDA: formData.teamMultisigPDA ? new PublicKey(formData.teamMultisigPDA) : undefined,
        mintKeypair, // Pass the mint keypair separately
      }

      // Create the token
      const result = await TokenService.createToken(mintParams)

      // Debug: Check if transaction has required properties
      console.log('Transaction result:', result)
      console.log('Transaction has recentBlockhash:', !!result.transaction.recentBlockhash)
      console.log('Transaction has feePayer:', !!result.transaction.feePayer)

      // Now the user needs to sign the transaction with their wallet
      if (!signTransaction) {
        throw new Error('Wallet does not support transaction signing')
      }

      // Ensure transaction has recent blockhash before signing
      if (!result.transaction.recentBlockhash) {
        throw new Error('Transaction missing recent blockhash')
      }

      // Ensure transaction has fee payer
      if (!result.transaction.feePayer) {
        throw new Error('Transaction missing fee payer')
      }

      // Ensure transaction has instructions
      if (!result.transaction.instructions || result.transaction.instructions.length === 0) {
        throw new Error('Transaction missing instructions')
      }

      console.log('Transaction validation passed, proceeding with signing')

      // Ensure mintKeypair is valid
      if (!result.mintKeypair || !result.mintKeypair.publicKey) {
        throw new Error('Invalid mint keypair received from TokenService')
      }

      console.log('Mint keypair validation passed, public key:', result.mintKeypair.publicKey.toString())

      // Add the mint keypair as a signer to the transaction
      result.transaction.partialSign(result.mintKeypair)

      // Sign the transaction with the user's wallet
      const signedTx = await signTransaction(result.transaction)

      // Send the signed transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

      // If burn authority is requested, burn the mint authority
      if (formData.burnAuthority) {
        try {
          const burnResult = await TokenService.burnMintAuthority({
            connection,
            payer: publicKey, // Use user's wallet as payer
            mint: result.mint,
            currentAuthority: publicKey, // User's wallet is the current authority
          })

          // Sign the burn transaction with the user's wallet
          const signedBurnTx = await signTransaction(burnResult.transaction)
          
          // Send the signed transaction
          const burnSignature = await connection.sendRawTransaction(signedBurnTx.serialize())
          
          // Wait for confirmation
          await connection.confirmTransaction(burnSignature, 'confirmed')
          
          toast.success('Mint authority burned successfully. Token supply is now fixed.')
        } catch (error) {
          console.error('Failed to burn mint authority:', error)
          toast.warning('Token created but failed to burn mint authority')
        }
      }

      setState({
        isLoading: false,
        error: null,
        success: true,
        mintAddress: result.mint.toString(),
        signature: signature,
      })

      toast.success('Token created successfully!')
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        success: false,
      }))
      
      toast.error(`Failed to create token: ${errorMessage}`)
      throw error
    }
  }, [connection, publicKey, signTransaction, signAllTransactions])

  const burnMintAuthority = useCallback(async (mintAddress: string) => {
    if (!publicKey || !signTransaction) {
      setState(prev => ({ ...prev, error: 'Wallet not connected or does not support signing' }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const mint = new PublicKey(mintAddress)
      
      const result = await TokenService.burnMintAuthority({
        connection,
        payer: publicKey, // Use user's wallet as payer
        mint,
        currentAuthority: publicKey, // User's wallet is the current authority
      })

      // Sign the transaction with the user's wallet
      const signedTx = await signTransaction(result.transaction)
      
      // Send the signed transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

      setState(prev => ({
        ...prev,
        isLoading: false,
        success: true,
        signature,
      }))

      toast.success('Mint authority burned successfully. Token supply is now fixed.')
      return signature
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        success: false,
      }))
      
      toast.error(`Failed to burn mint authority: ${errorMessage}`)
      throw error
    }
  }, [connection, publicKey, signTransaction])

  const assignTeamMultisig = useCallback(async (mintAddress: string, teamMultisigPDA: string) => {
    if (!publicKey || !signTransaction) {
      setState(prev => ({ ...prev, error: 'Wallet not connected or does not support signing' }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      const mint = new PublicKey(mintAddress)
      const teamPDA = new PublicKey(teamMultisigPDA)
      
      const result = await TokenService.assignTeamMultisig({
        connection,
        payer: publicKey, // Use user's wallet as payer
        mint,
        currentAuthority: publicKey, // User's wallet is the current authority
        teamMultisigPDA: teamPDA,
      })

      // Sign the transaction with the user's wallet
      const signedTx = await signTransaction(result.transaction)
      
      // Send the signed transaction
      const signature = await connection.sendRawTransaction(signedTx.serialize())
      
      // Wait for confirmation
      await connection.confirmTransaction(signature, 'confirmed')

      setState(prev => ({
        ...prev,
        isLoading: false,
        success: true,
        signature,
      }))

      toast.success('Mint authority transferred to team multisig successfully.')
      return signature
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        success: false,
      }))
      
      toast.error(`Failed to assign team multisig: ${errorMessage}`)
      throw error
    }
  }, [connection, publicKey, signTransaction])

  return {
    ...state,
    createToken,
    burnMintAuthority,
    assignTeamMultisig,
    resetState,
    resetForm,
  }
}
