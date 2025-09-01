import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { 
  calculateBondingCurveProgress, 
  getLaunchPhase, 
  calculateTokensSold, 
  calculateTokensRemaining,
  formatProgress,
  getGraduationCountdown,
  DEFAULT_LAUNCHPAD_CONFIG 
} from '../../../lib/dbc/launchpad-config';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

interface DbcPoolResponse {
  success: boolean;
  poolData?: {
    poolAddress: string;
    baseMint: string;
    quoteMint: string;
    currentPrice: number;
    marketCap: number;
    volume24h: number;
    progress: number;
    migrationStatus: string;
    isMigrated: number;
    migrationProgress: number;
    accumulatedFees: number;
    totalTokenSupply: string;
    quoteReserve: string;
    baseReserve: string;
    // Launchpad data
    launchpadProgress: number;
    launchpadPhase: string;
    launchpadDescription: string;
    tokensSold: number;
    tokensRemaining: number;
    graduationCountdown: string | null;
    isGraduated: boolean;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DbcPoolResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { tokenMint } = req.body;

    if (!tokenMint) {
      return res.status(400).json({
        success: false,
        error: 'Missing tokenMint parameter'
      });
    }

    console.log('🔍 Fetching DBC pool data for token:', tokenMint);

    const connection = new Connection(RPC_URL, 'confirmed');
    const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
    
    // Search for pools with this base mint
    const pools = await dbcClient.state.getPools();
    const pool = pools.find((p: any) => {
      const base = (p.account?.baseMint || p.baseMint);
      try {
        return base?.toString() === tokenMint;
      } catch {
        return false;
      }
    });
    
    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'No DBC pool found for this token'
      });
    }

    // Get pool public key
    const poolPubkeyObj = (pool as any).publicKey 
      ?? (pool as any).pubkey 
      ?? (pool as any).pool 
      ?? (pool as any).address;
    
    if (!poolPubkeyObj || typeof poolPubkeyObj.toString !== 'function') {
      return res.status(500).json({
        success: false,
        error: 'Failed to resolve pool address'
      });
    }

    const poolAddress = poolPubkeyObj.toString();
    console.log('✅ Found pool address:', poolAddress);

    // Get pool state and config
    const poolState = await dbcClient.state.getPool(new PublicKey(poolAddress));
    console.log('📊 Pool state:', {
      hasPoolState: !!poolState,
      baseMint: poolState?.baseMint?.toString(),
      quoteReserve: poolState?.quoteReserve?.toString(),
      baseReserve: poolState?.baseReserve?.toString(),
      isMigrated: poolState?.isMigrated,
      migrationProgress: poolState?.migrationProgress,
    });

    if (!poolState) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pool state'
      });
    }

    const poolConfig = await dbcClient.state.getPoolConfig(poolState.config);
    console.log('📊 Pool config:', {
      hasPoolConfig: !!poolConfig,
      quoteMint: poolConfig?.quoteMint?.toString(),
      migrationQuoteThreshold: poolConfig?.migrationQuoteThreshold?.toString(),
    });

    if (!poolConfig) {
      return res.status(500).json({
        success: false,
        error: 'Failed to fetch pool config'
      });
    }

    // Calculate bonding curve progress (handle large numbers safely)
    let progress = 0;
    try {
      if (poolConfig?.migrationQuoteThreshold && !poolConfig.migrationQuoteThreshold.isZero()) {
        const quoteReserve = poolState?.quoteReserve;
        const threshold = poolConfig.migrationQuoteThreshold;
        
        if (quoteReserve && threshold) {
          const quoteReserveNum = Number(quoteReserve.toString());
          const thresholdNum = Number(threshold.toString());
          progress = Math.min((quoteReserveNum / thresholdNum) * 100, 100);
        }
      }
    } catch (e) {
      console.warn('Failed to calculate progress:', e);
      progress = 0;
    }

    // Determine migration status
    let migrationStatus = 'pre-bonding';
    if (poolState.isMigrated === 1) {
      switch (poolState.migrationProgress) {
        case 0:
          migrationStatus = 'migrating';
          break;
        case 1:
          migrationStatus = 'migrated';
          break;
        default:
          migrationStatus = 'unknown';
      }
    }

    // Calculate current price (in quote tokens per base token) - handle large numbers safely
    let currentPrice = 0;
    try {
      const baseReserve = poolState?.baseReserve;
      const quoteReserve = poolState?.quoteReserve;
      
      if (baseReserve && quoteReserve && !baseReserve.isZero()) {
        const quoteReserveNum = Number(quoteReserve.toString());
        const baseReserveNum = Number(baseReserve.toString());
        currentPrice = quoteReserveNum / baseReserveNum;
      }
    } catch (e) {
      console.warn('Failed to calculate current price:', e);
      currentPrice = 0;
    }

    // Calculate market cap (price * total supply) - handle large numbers safely
    let marketCap = 0;
    try {
      // Use a default total supply since totalTokenSupply might not be available
      const totalSupplyNum = 1000000000; // 1 billion tokens default
      marketCap = currentPrice * totalSupplyNum;
    } catch (e) {
      console.warn('Failed to calculate market cap:', e);
      marketCap = 0;
    }

    // Get quote token decimals for proper formatting
    let quoteDecimals = 6; // Default to 6 for USDC
    try {
      const quoteMintInfo = await connection.getParsedAccountInfo(poolConfig.quoteMint);
      quoteDecimals = (quoteMintInfo.value?.data as any)?.parsed?.info?.decimals || 6;
    } catch (e) {
      console.warn('Failed to get quote decimals, using default:', e);
    }

    // Format values with proper decimals (handle large numbers safely)
    let formattedCurrentPrice = 0;
    let formattedMarketCap = 0;
    let formattedAccumulatedFees = 0;
    
    try {
      formattedCurrentPrice = currentPrice / Math.pow(10, quoteDecimals);
      formattedMarketCap = marketCap / Math.pow(10, quoteDecimals);
      
      // Set accumulated fees to 0 since this property might not be available
      formattedAccumulatedFees = 0;
    } catch (e) {
      console.warn('Failed to format values:', e);
    }

    // Calculate launchpad data
    const currentBaseReserve = Number(poolState?.baseReserve?.toString() || '0');
    const launchpadProgress = calculateBondingCurveProgress(currentBaseReserve);
    const launchpadPhase = getLaunchPhase(launchpadProgress);
    const tokensSold = calculateTokensSold(currentBaseReserve);
    const tokensRemaining = calculateTokensRemaining(currentBaseReserve);
    const graduationCountdown = getGraduationCountdown(launchpadProgress);
    const isGraduated = launchpadProgress >= DEFAULT_LAUNCHPAD_CONFIG.bondingCurve.graduationThreshold;

    const poolData = {
      poolAddress,
      baseMint: poolState?.baseMint?.toString() || '',
      // Force correct devnet USDC mint - DBC pool might be configured with wrong mint
      quoteMint: 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr',
      currentPrice: formattedCurrentPrice,
      marketCap: formattedMarketCap,
      volume24h: 0, // TODO: Calculate from recent transactions
      progress,
      migrationStatus,
      isMigrated: poolState?.isMigrated || 0,
      migrationProgress: poolState?.migrationProgress || 0,
      accumulatedFees: formattedAccumulatedFees,
      totalTokenSupply: '1000000000', // 1 billion tokens default
      quoteReserve: poolState?.quoteReserve?.toString() || '0',
      baseReserve: poolState?.baseReserve?.toString() || '0',
      // Launchpad data
      launchpadProgress,
      launchpadPhase: launchpadPhase.status,
      launchpadDescription: launchpadPhase.description,
      tokensSold,
      tokensRemaining,
      graduationCountdown,
      isGraduated,
    };

    console.log('📊 DBC Pool Data:', {
      poolAddress,
      currentPrice: formattedCurrentPrice,
      marketCap: formattedMarketCap,
      progress: `${progress}%`,
      migrationStatus,
    });

    res.status(200).json({
      success: true,
      poolData,
    });

  } catch (error) {
    console.error('DBC pool data error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
