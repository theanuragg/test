import React, { useState, useEffect } from 'react';
import { useWallet } from '@jup-ag/wallet-adapter';
import { toast } from 'sonner';

interface MigrationStatus {
  isMigrated: boolean;
  migrationProgress: number;
  currentQuoteReserve: string;
  migrationThreshold: string;
  isReadyForMigration: boolean;
  migrationOption: number;
  migrationFeeOption: number;
  poolStatus: string;
}

interface MigrationManagerProps {
  poolAddress: string;
  onMigrationComplete?: () => void;
}

export const MigrationManager: React.FC<MigrationManagerProps> = ({
  poolAddress,
  onMigrationComplete
}) => {
  const { publicKey } = useWallet();
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);

  // Check migration status on mount and when pool address changes
  useEffect(() => {
    if (poolAddress) {
      checkMigrationStatus();
    }
  }, [poolAddress]);

  // Real-time migration monitoring using Helius WebSocket
  useEffect(() => {
    if (!poolAddress || !publicKey) return;

    // Import and initialize migration stream service
    const initializeMigrationStream = async () => {
      try {
        // Check if Helius is properly configured
        const { isHeliusEnabled } = await import('../../lib/config/helius-config');
        if (!isHeliusEnabled()) {
          console.warn('⚠️ Helius not configured, using polling fallback');
          return startPollingFallback();
        }

        const { MigrationStreamService } = await import('../../lib/helius/migration-stream');
        
        const migrationStream = new MigrationStreamService({
          heliusRpcUrl: process.env.NEXT_PUBLIC_HELIUS_RPC_URL || 'https://api.devnet.solana.com',
          heliusWsUrl: process.env.NEXT_PUBLIC_HELIUS_WS_URL || 'wss://api.devnet.solana.com',
          heliusApiKey: process.env.NEXT_PUBLIC_HELIUS_API_KEY || '',
          onMigrationReady: async (poolAddr, poolData) => {
            if (poolAddr === poolAddress) {
              console.log('🎯 Pool ready for migration - auto-triggering...');
              setMigrationStatus(poolData);
              await triggerMigration();
            }
          },
          onMigrationComplete: (poolAddr, txSignature) => {
            if (poolAddr === poolAddress) {
              console.log('✅ Migration completed:', txSignature);
              checkMigrationStatus();
              onMigrationComplete?.();
            }
          },
          onError: (error) => {
            console.error('❌ Migration stream error:', error);
          }
        });

        // Start monitoring this specific pool
        await migrationStream.start();
        await migrationStream.addPoolToMonitoring(poolAddress);

        // Cleanup function
        return () => {
          migrationStream.removePoolFromMonitoring(poolAddress);
          migrationStream.stop();
        };
      } catch (error) {
        console.error('❌ Failed to initialize migration stream:', error);
        // Fallback to polling if stream fails
        return startPollingFallback();
      }
    };

    // Fallback polling method
    const startPollingFallback = () => {
      console.log('📡 Using polling fallback for migration monitoring...');
      const interval = setInterval(async () => {
        if (poolAddress && !isLoading) {
          const status = await checkMigrationStatus();
          
          // Auto-migrate if pool is ready and not already migrated
          if (status?.isReadyForMigration && !status.isMigrated && publicKey) {
            console.log('🚀 Auto-migrating pool to DAMM v2...');
            await triggerMigration();
          }
        }
      }, 5000); // Faster polling as fallback

      return () => clearInterval(interval);
    };

    // Initialize real-time monitoring
    const cleanup = initializeMigrationStream();

    return () => {
      cleanup.then(cleanupFn => cleanupFn?.());
    };
  }, [poolAddress, publicKey]);

  const checkMigrationStatus = async () => {
    if (!poolAddress) return null;

    setIsCheckingStatus(true);
    try {
      const response = await fetch('/api/migration/check-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ poolAddress }),
      });

      const result = await response.json();
      if (result.success && result.data) {
        setMigrationStatus(result.data);
        return result.data;
      } else {
        console.error('Failed to check migration status:', result.error);
        return null;
      }
    } catch (error) {
      console.error('Error checking migration status:', error);
      return null;
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const triggerMigration = async () => {
    if (!publicKey || !poolAddress || !migrationStatus?.isReadyForMigration) {
      toast.error('Cannot trigger migration');
      return;
    }

    setIsLoading(true);
    try {
      toast.info('🚀 Auto-migrating to DAMM v2...', {
        description: 'This will happen automatically in the background.',
      });

      // Use background migration service for automatic processing
      const response = await fetch('/api/migration/background-migration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
        
        // Refresh status
        await checkMigrationStatus();
        
        // Notify parent component
        onMigrationComplete?.();
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
    } finally {
      setIsLoading(false);
    }
  };

  if (!migrationStatus) {
    return (
      <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Migration Status</h3>
          <button
            onClick={checkMigrationStatus}
            disabled={isCheckingStatus}
            className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 disabled:opacity-50"
          >
            {isCheckingStatus ? 'Checking...' : 'Refresh'}
          </button>
        </div>
        <div className="text-center py-8">
          {isCheckingStatus ? (
            <div className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-300">Checking migration status...</span>
            </div>
          ) : (
            <div className="text-gray-400">
              <p>Click refresh to check migration status</p>
            </div>
          )}
        </div>
      </div>
    );
  }

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

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Migration Status</h3>
        <button
          onClick={checkMigrationStatus}
          disabled={isCheckingStatus}
          className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-lg text-sm hover:bg-blue-500/30 disabled:opacity-50"
        >
          {isCheckingStatus ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {/* Pool Status */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Pool Status</span>
          <span className={`text-sm font-medium ${getStatusColor(migrationStatus.poolStatus)}`}>
            {migrationStatus.poolStatus}
          </span>
        </div>
      </div>

      {/* Migration Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-300">Migration Progress</span>
          <span className="text-sm font-medium text-white">
            {migrationStatus.migrationProgress.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-500 ${getProgressColor(migrationStatus.migrationProgress)}`}
            style={{ width: `${Math.min(migrationStatus.migrationProgress, 100)}%` }}
          ></div>
        </div>
      </div>

      {/* Migration Details */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <span className="text-gray-400">Current Reserve:</span>
          <p className="text-white font-mono">
            {parseFloat(migrationStatus.currentQuoteReserve).toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-gray-400">Threshold:</span>
          <p className="text-white font-mono">
            {parseFloat(migrationStatus.migrationThreshold).toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-gray-400">Migration Type:</span>
          <p className="text-white">
            {migrationStatus.migrationOption === 1 ? 'DAMM V2' : 'DAMM V1'}
          </p>
        </div>
        <div>
          <span className="text-gray-400">Fee Option:</span>
          <p className="text-white">
            {migrationStatus.migrationFeeOption === 0 ? '25 bps' :
             migrationStatus.migrationFeeOption === 1 ? '30 bps' :
             migrationStatus.migrationFeeOption === 2 ? '100 bps' :
             migrationStatus.migrationFeeOption === 3 ? '200 bps' :
             migrationStatus.migrationFeeOption === 4 ? '400 bps' :
             migrationStatus.migrationFeeOption === 5 ? '600 bps' :
             migrationStatus.migrationFeeOption === 6 ? 'Custom' : 'Unknown'}
          </p>
        </div>
      </div>

      {/* Migration Actions */}
      {!migrationStatus.isMigrated && (
        <div className="space-y-3">
          {migrationStatus.isReadyForMigration ? (
            <div className="bg-yellow-500/20 border border-yellow-500/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-400">🎯 Ready for Migration!</span>
              </div>
              <p className="text-yellow-200 text-sm mb-3">
                This pool has reached the migration threshold and will automatically migrate to DAMM v2.
              </p>
              {isLoading ? (
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-yellow-200 text-sm">Auto-migrating to DAMM v2...</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="text-yellow-200 text-sm">Migration will happen automatically</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-blue-500/20 border border-blue-500/50 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-400">📈 Building Liquidity</span>
              </div>
              <p className="text-blue-200 text-sm">
                This pool is still building liquidity. It will automatically migrate when it reaches the threshold.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Already Migrated */}
      {migrationStatus.isMigrated && (
        <div className="bg-green-500/20 border border-green-500/50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-400">✅ Migration Complete</span>
          </div>
          <p className="text-green-200 text-sm">
            This pool has successfully migrated to DAMM v2 and is now trading on regular DEX.
          </p>
        </div>
      )}
    </div>
  );
};
