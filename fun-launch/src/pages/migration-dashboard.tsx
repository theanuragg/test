import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useWallet } from '@jup-ag/wallet-adapter';
import { toast } from 'sonner';
import Header from '../components/Header';

interface PoolMigrationStatus {
  poolAddress: string;
  tokenMint: string;
  tokenName: string;
  tokenSymbol: string;
  isMigrated: boolean;
  migrationProgress: number;
  currentQuoteReserve: string;
  migrationThreshold: string;
  isReadyForMigration: boolean;
  migrationOption: number;
  migrationFeeOption: number;
  poolStatus: string;
  createdAt: string;
}

export default function MigrationDashboard() {
  const { publicKey } = useWallet();
  const [pools, setPools] = useState<PoolMigrationStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'ready' | 'active' | 'migrated'>('all');

  useEffect(() => {
    if (publicKey) {
      fetchAllPools();
    }
  }, [publicKey]);

  const fetchAllPools = async () => {
    if (!publicKey) return;

    setIsLoading(true);
    try {
      // First get all pools from your existing API
      const poolsResponse = await fetch('/api/pools/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userWallet: publicKey.toString() }),
      });

      const poolsData = await poolsResponse.json();
      
      if (poolsData.success && poolsData.pools) {
        // Check migration status for each pool
        const poolsWithMigrationStatus = await Promise.all(
          poolsData.pools.map(async (pool: any) => {
            try {
              const statusResponse = await fetch('/api/migration/check-status', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ poolAddress: pool.poolAddress }),
              });

              const statusData = await statusResponse.json();
              
              if (statusData.success && statusData.data) {
                const poolData = {
                  poolAddress: pool.poolAddress,
                  tokenMint: pool.tokenMint,
                  tokenName: pool.name || 'Unknown',
                  tokenSymbol: pool.symbol || 'UNKNOWN',
                  ...statusData.data,
                  createdAt: pool.createdAt || new Date().toISOString(),
                };

                // Auto-migrate if pool is ready and not already migrated
                if (poolData.isReadyForMigration && !poolData.isMigrated) {
                  console.log(`🚀 Auto-migrating pool ${poolData.tokenSymbol} to DAMM v2...`);
                  setTimeout(() => triggerMigration(pool.poolAddress), 1000); // Small delay to avoid blocking UI
                }

                return poolData;
              }
            } catch (error) {
              console.warn(`Failed to get migration status for pool ${pool.poolAddress}:`, error);
            }

            // Return basic info if migration status check failed
            return {
              poolAddress: pool.poolAddress,
              tokenMint: pool.tokenMint,
              tokenName: pool.name || 'Unknown',
              tokenSymbol: pool.symbol || 'UNKNOWN',
              isMigrated: false,
              migrationProgress: 0,
              currentQuoteReserve: '0',
              migrationThreshold: '0',
              isReadyForMigration: false,
              migrationOption: 0,
              migrationFeeOption: 0,
              poolStatus: 'Unknown',
              createdAt: pool.createdAt || new Date().toISOString(),
            };
          })
        );

        setPools(poolsWithMigrationStatus);
      }
    } catch (error) {
      console.error('Failed to fetch pools:', error);
      toast.error('Failed to fetch pools');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    await fetchAllPools();
    setIsRefreshing(false);
    toast.success('Data refreshed');
  };

  const triggerMigration = async (poolAddress: string) => {
    if (!publicKey) {
      toast.error('Please connect your wallet');
      return;
    }

    try {
      toast.info('🚀 Starting migration to DAMM v2...', {
        description: 'This may take a few minutes. Please wait.',
      });

      const response = await fetch('/api/migration/background-migration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          poolAddress,
          userWallet: publicKey.toString(),
        }),
      });

      const result = await response.json();
      if (result.success) {
        toast.success('✅ Migration completed successfully!', {
          description: `Transaction: ${result.transactionSignature}`,
        });
        
        // Refresh data
        await fetchAllPools();
      } else {
        toast.error('❌ Migration failed', {
          description: result.error || 'Unknown error occurred',
        });
      }
    } catch (error) {
      console.error('Migration error:', error);
      toast.error('❌ Migration failed', {
        description: 'Network error occurred. Please try again.',
      });
    }
  };

  const filteredPools = pools.filter(pool => {
    switch (filter) {
      case 'ready':
        return pool.isReadyForMigration && !pool.isMigrated;
      case 'active':
        return !pool.isMigrated && !pool.isReadyForMigration;
      case 'migrated':
        return pool.isMigrated;
      default:
        return true;
    }
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Migrated to DAMM':
        return 'text-green-400';
      case 'Ready for Migration':
        return 'text-yellow-400';
      case 'Approaching Migration':
        return 'text-orange-400';
      case 'Building Liquidity':
        return 'text-blue-400';
      default:
        return 'text-gray-400';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 80) return 'bg-yellow-500';
    if (progress >= 50) return 'bg-orange-500';
    if (progress >= 20) return 'bg-blue-500';
    return 'bg-gray-500';
  };

  if (!publicKey) {
    return (
      <>
        <Head>
          <title>Migration Dashboard - Fun Launch</title>
          <meta name="description" content="Manage DBC pool migrations to DAMM v2" />
        </Head>
        <Header />
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
          <div className="container mx-auto px-4 py-8">
            <div className="text-center py-16">
              <h1 className="text-4xl font-bold text-white mb-4">Migration Dashboard</h1>
              <p className="text-gray-300 mb-8">Connect your wallet to manage pool migrations</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <title>Migration Dashboard - Fun Launch</title>
        <meta name="description" content="Manage DBC pool migrations to DAMM v2" />
      </Head>
      <Header />
      
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-4xl font-bold text-white">Migration Dashboard</h1>
              <button
                onClick={refreshData}
                disabled={isRefreshing}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white rounded-lg transition-colors"
              >
                {isRefreshing ? 'Refreshing...' : '🔄 Refresh'}
              </button>
            </div>
            <p className="text-gray-300">Monitor and manage automatic migrations from DBC to DAMM v2</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              <div className="text-2xl font-bold text-white">{pools.length}</div>
              <div className="text-gray-300 text-sm">Total Pools</div>
            </div>
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              <div className="text-2xl font-bold text-yellow-400">
                {pools.filter(p => p.isReadyForMigration && !p.isMigrated).length}
              </div>
              <div className="text-gray-300 text-sm">Ready for Migration</div>
            </div>
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              <div className="text-2xl font-bold text-blue-400">
                {pools.filter(p => !p.isMigrated && !p.isReadyForMigration).length}
              </div>
              <div className="text-gray-300 text-sm">Building Liquidity</div>
            </div>
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              <div className="text-2xl font-bold text-green-400">
                {pools.filter(p => p.isMigrated).length}
              </div>
              <div className="text-gray-300 text-sm">Migrated</div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex gap-2">
              {(['all', 'ready', 'active', 'migrated'] as const).map((filterOption) => (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filter === filterOption
                      ? 'bg-blue-500 text-white'
                      : 'bg-white/10 text-gray-300 hover:bg-white/20'
                  }`}
                >
                  {filterOption === 'all' && 'All Pools'}
                  {filterOption === 'ready' && 'Ready to Migrate'}
                  {filterOption === 'active' && 'Building Liquidity'}
                  {filterOption === 'migrated' && 'Migrated'}
                </button>
              ))}
            </div>
          </div>

          {/* Pools List */}
          {isLoading ? (
            <div className="text-center py-16">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-300">Loading pools...</p>
            </div>
          ) : filteredPools.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-400">No pools found matching the current filter</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPools.map((pool) => (
                <div
                  key={pool.poolAddress}
                  className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {pool.tokenName} ({pool.tokenSymbol})
                      </h3>
                      <p className="text-gray-400 text-sm font-mono">
                        {pool.poolAddress.slice(0, 8)}...{pool.poolAddress.slice(-8)}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pool.poolStatus)}`}>
                      {pool.poolStatus}
                    </span>
                  </div>

                  {/* Migration Progress */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-300">Migration Progress</span>
                      <span className="text-sm font-medium text-white">
                        {pool.migrationProgress.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(pool.migrationProgress)}`}
                        style={{ width: `${Math.min(pool.migrationProgress, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Pool Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-400">Current Reserve:</span>
                      <p className="text-white font-mono">
                        {parseFloat(pool.currentQuoteReserve).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Threshold:</span>
                      <p className="text-white font-mono">
                        {parseFloat(pool.migrationThreshold).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Migration Type:</span>
                      <p className="text-white">
                        {pool.migrationOption === 1 ? 'DAMM V2' : 'DAMM V1'}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-400">Created:</span>
                      <p className="text-white">
                        {new Date(pool.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  {!pool.isMigrated && pool.isReadyForMigration && (
                    <div className="flex justify-end">
                      <div className="text-center">
                        <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                        <p className="text-yellow-200 text-sm">Auto-migrating to DAMM v2...</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
