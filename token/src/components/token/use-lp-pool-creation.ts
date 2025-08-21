'use client'

import { useCallback, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { PublicKey } from '@solana/web3.js'
import { MeteoraService, PoolCreationParams, PoolCreationResult } from '@/lib/meteora-service'
import { toast } from 'sonner'

export interface LPPoolFormData {
  baseMint: string
  quoteMint: string
  baseDecimals: number
  quoteDecimals: number
  baseAmount: number
  quoteAmount: number
  feeRate: number
  tickSpacing: number
  poolType: 'DLMM' | 'DBC'
  antiSniper: boolean
  sniperProtectionDelay: number
}

export interface LPPoolCreationState {
  isLoading: boolean
  error: string | null
  success: boolean
  poolResult: PoolCreationResult | null
}

export function useLPPoolCreation() {
  const { connection } = useConnection()
  const { publicKey, signTransaction, sendTransaction } = useWallet()
  
  const [formData, setFormData] = useState<LPPoolFormData>({
    baseMint: '',
    quoteMint: '',
    baseDecimals: 6,
    quoteDecimals: 6,
    baseAmount: 1000000,
    quoteAmount: 1000000,
    feeRate: 30, // 0.3%
    tickSpacing: 1,
    poolType: 'DLMM',
    antiSniper: true,
    sniperProtectionDelay: 300, // 5 minutes
  })

  const [state, setState] = useState<LPPoolCreationState>({
    isLoading: false,
    error: null,
    success: false,
    poolResult: null,
  })

  const resetState = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      success: false,
      poolResult: null,
    })
  }, [])

  const resetForm = useCallback(() => {
    setFormData({
      baseMint: '',
      quoteMint: '',
      baseDecimals: 6,
      quoteDecimals: 6,
      baseAmount: 1000000,
      quoteAmount: 1000000,
      feeRate: 30,
      tickSpacing: 1,
      poolType: 'DLMM',
      antiSniper: true,
      sniperProtectionDelay: 300,
    })
  }, [])

  const updateFormData = useCallback((field: keyof LPPoolFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }, [])

  const createPool = useCallback(async (formData: LPPoolFormData) => {
    if (!publicKey || !signTransaction || !sendTransaction) {
      setState(prev => ({ ...prev, error: 'Wallet not connected or does not support signing' }))
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Validate form data
      if (!formData.baseMint.trim() || !formData.quoteMint.trim()) {
        throw new Error('Base and quote mint addresses are required')
      }

      if (formData.baseMint === formData.quoteMint) {
        throw new Error('Base and quote mints must be different')
      }

      if (formData.baseAmount <= 0 || formData.quoteAmount <= 0) {
        throw new Error('Base and quote amounts must be greater than 0')
      }

      if (formData.feeRate < 0 || formData.feeRate > 10000) {
        throw new Error('Fee rate must be between 0 and 10000 basis points')
      }

      if (formData.tickSpacing <= 0) {
        throw new Error('Tick spacing must be greater than 0')
      }

      // Check if user has sufficient balance for pool creation fee
      const balance = await connection.getBalance(publicKey)
      const poolCreationFee = MeteoraService.getPoolCreationFee()
      if (balance < poolCreationFee * 1e9) { // Convert to lamports
        throw new Error(`Insufficient balance for pool creation. Required: ${poolCreationFee} SOL`)
      }

      // Create pool parameters
      const poolParams: PoolCreationParams = {
        connection,
        payer: publicKey,
        baseMint: new PublicKey(formData.baseMint.trim()),
        quoteMint: new PublicKey(formData.quoteMint.trim()),
        baseDecimals: formData.baseDecimals,
        quoteDecimals: formData.quoteDecimals,
        baseAmount: formData.baseAmount,
        quoteAmount: formData.quoteAmount,
        feeRate: formData.feeRate,
        tickSpacing: formData.tickSpacing,
        poolType: formData.poolType,
        antiSniper: formData.antiSniper,
        sniperProtectionDelay: formData.sniperProtectionDelay,
      }

      // Create the pool using Meteora service
      const result = await MeteoraService.createPool(poolParams)

      setState({
        isLoading: false,
        error: null,
        success: true,
        poolResult: result,
      })

      toast.success('LP Pool created successfully!')
      
      return result
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
        success: false,
      }))
      
      toast.error(`Failed to create LP Pool: ${errorMessage}`)
      throw error
    }
  }, [connection, publicKey, signTransaction, sendTransaction])

  const getPoolCreationFee = useCallback(() => {
    return MeteoraService.getPoolCreationFee()
  }, [])

  const getMinimumLiquidity = useCallback(() => {
    return MeteoraService.getMinimumLiquidity()
  }, [])

  return {
    formData,
    state,
    updateFormData,
    createPool,
    resetState,
    resetForm,
    getPoolCreationFee,
    getMinimumLiquidity,
  }
}
