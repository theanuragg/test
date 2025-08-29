/**
 * DBC Pool Data Hook
 * 
 * Provides real-time data for DBC pools including bonding curve progress,
 * migration status, and accumulated fees
 */

import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

// Environment variables
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.devnet.solana.com';

export interface DbcPoolData {
  // Pool State
  poolAddress: string;
  baseMint: string;
  quoteMint: string;
  poolCreator: string;
  
  // Bonding Curve Progress
  progress: number; // 0-100%
  quoteReserve: string;
  baseReserve: string;
  migrationQuoteThreshold: string;
  
  // Migration Status
  isMigrated: number; // 0 = NotMigrated, 1 = Migrated
  migrationProgress: number; // 0-3 stages
  migrationStatus: 'pre-bonding' | 'post-bonding' | 'locked-vesting' | 'created-pool';
  
  // Fees
  accumulatedFees: string;
  feeClaimer: string;
  
  // Pool Configuration
  configKey: string;
  activationTime: number;
  totalTokenSupply: string;
  
  // Vesting
  lockedVestingAmount: string;
  vestingProgress: number;
  
  // Market Data
  currentPrice: number;
  marketCap: number;
  volume24h: number;
}

export function useDbcPoolData(poolAddress: string | null) {
  const [data, setData] = useState<DbcPoolData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolData = useCallback(async () => {
    if (!poolAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const connection = new Connection(RPC_URL, 'confirmed');
      const dbcClient = new DynamicBondingCurveClient(connection, 'confirmed');
      
      const poolPubkey = new PublicKey(poolAddress);
      
      // Fetch pool state and config (guard against invalid/non-DBC accounts)
      let poolState: any;
      let poolConfig: any;
      try {
        [poolState, poolConfig] = await Promise.all([
          dbcClient.state.getPool(poolPubkey),
          dbcClient.state.getPoolConfig(poolPubkey),
        ]);
      } catch (e) {
        console.warn('DBC pool not ready or invalid pool address. Will retry.', e);
        // Do not set an error to avoid error UI; let the auto-refresh pick it up when ready
        return;
      }
      
      // Calculate bonding curve progress
      const progress = poolConfig.migrationQuoteThreshold.isZero() 
        ? 0 
        : Math.min((poolState.quoteReserve.toNumber() / poolConfig.migrationQuoteThreshold.toNumber()) * 100, 100);
      
      // Determine migration status
      let migrationStatus: DbcPoolData['migrationStatus'] = 'pre-bonding';
      if (poolState.isMigrated === 1) {
        switch (poolState.migrationProgress) {
          case 0:
            migrationStatus = 'pre-bonding';
            break;
          case 1:
            migrationStatus = 'post-bonding';
            break;
          case 2:
            migrationStatus = 'locked-vesting';
            break;
          case 3:
            migrationStatus = 'created-pool';
            break;
        }
      }
      
      // Calculate current price (simplified)
      const currentPrice = poolState.quoteReserve.isZero() || poolState.baseReserve.isZero()
        ? 0
        : poolState.quoteReserve.toNumber() / poolState.baseReserve.toNumber();
      
      // Calculate market cap
      const marketCap = currentPrice * (poolConfig as any).totalTokenSupply.toNumber();
      
      const poolData: DbcPoolData = {
        poolAddress,
        baseMint: poolState.baseMint.toString(),
        quoteMint: (poolState as any).quoteMint.toString(),
        poolCreator: (poolState as any).poolCreator.toString(),
        
        progress,
        quoteReserve: poolState.quoteReserve.toString(),
        baseReserve: poolState.baseReserve.toString(),
        migrationQuoteThreshold: poolConfig.migrationQuoteThreshold.toString(),
        
        isMigrated: poolState.isMigrated,
        migrationProgress: poolState.migrationProgress,
        migrationStatus,
        
        accumulatedFees: (poolState as any).accumulatedFees.toString(),
        feeClaimer: poolConfig.feeClaimer.toString(),
        
        configKey: poolState.config.toString(),
        activationTime: (poolState as any).activationTime.toNumber(),
        totalTokenSupply: (poolConfig as any).totalTokenSupply.toString(),
        
        lockedVestingAmount: (poolConfig as any).lockedVestingParam?.totalLockedVestingAmount?.toString() || '0',
        vestingProgress: 0, // TODO: Calculate vesting progress
        
        currentPrice,
        marketCap,
        volume24h: 0, // TODO: Get from indexing service
      };
      
      setData(poolData);
    } catch (err) {
      console.error('Error fetching DBC pool data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pool data');
    } finally {
      setLoading(false);
    }
  }, [poolAddress]);

  useEffect(() => {
    fetchPoolData();
    
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchPoolData, 10000);
    return () => clearInterval(interval);
  }, [fetchPoolData]);

  return { data, loading, error, refetch: fetchPoolData };
}

/**
 * Hook for getting pool address from token mint
 */
export function usePoolAddress(tokenMint: string | null) {
  const [poolAddress, setPoolAddress] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolAddress = useCallback(async () => {
    if (!tokenMint) return;
    
    setLoading(true);
    setError(null);
    
    try {
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
      
      if (pool) {
        // getPools likely returns ProgramAccount-like objects with publicKey/pubkey
        const poolPubkeyObj = (pool as any).publicKey 
          ?? (pool as any).pubkey 
          ?? (pool as any).pool 
          ?? (pool as any).address;
        if (poolPubkeyObj && typeof poolPubkeyObj.toString === 'function') {
          setPoolAddress(poolPubkeyObj.toString());
        } else {
          console.warn('Unable to resolve pool public key from getPools() result', pool);
          setError('Failed to resolve pool address for this token');
        }
      } else {
        setError('No DBC pool found for this token');
      }
    } catch (err) {
      console.error('Error fetching pool address:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pool address');
    } finally {
      setLoading(false);
    }
  }, [tokenMint]);

  useEffect(() => {
    fetchPoolAddress();
  }, [fetchPoolAddress]);

  return { poolAddress, loading, error, refetch: fetchPoolAddress };
}

/**
 * Hook for getting DBC pool data by token mint
 */
export function useDbcPoolDataByToken(tokenMint: string | null) {
  const { poolAddress, loading: addressLoading, error: addressError } = usePoolAddress(tokenMint);
  const { data, loading: dataLoading, error: dataError } = useDbcPoolData(poolAddress);
  
  return {
    data,
    loading: addressLoading || dataLoading,
    error: addressError || dataError,
  };
}
