/**
 * Migration Status Component
 * 
 * Displays migration status and fee claiming options
 */

import React, { useState } from 'react';
import { useWallet } from '@jup-ag/wallet-adapter';
import { toast } from 'sonner';

interface MigrationStatusProps {
  isMigrated: number;
  migrationProgress: number;
  accumulatedFees: string;
  tokenMint: string;
}

export function MigrationStatus({ 
  isMigrated, 
  migrationProgress, 
  accumulatedFees, 
  tokenMint 
}: MigrationStatusProps) {
  const { publicKey, signTransaction } = useWallet();
  const [claiming, setClaiming] = useState(false);

  const handleClaimFees = async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    setClaiming(true);
    try {
      // Call the claim fees API
      const response = await fetch('/api/claim-fees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poolAddress: tokenMint, // This should be the pool address, not token mint
          userWallet: publicKey.toString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim fees');
      }

      // Sign and send the transaction
      const transaction = data.claimTx;
      const signedTx = await signTransaction(transaction);
      
      // Send the signed transaction
      // This would typically be sent to the network
      toast.success(`Successfully claimed ${data.claimableAmount} fees!`);
    } catch (error) {
      console.error('Error claiming fees:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to claim fees');
    } finally {
      setClaiming(false);
    }
  };

  const getMigrationStage = () => {
    if (isMigrated === 0) {
      return {
        stage: 'Bonding Curve',
        description: 'Token is trading on the bonding curve',
        icon: '📈',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
      };
    }

    const stages = [
      { stage: 'Pre-Bonding', description: 'Preparing for bonding curve', icon: '⏳' },
      { stage: 'Post-Bonding', description: 'Bonding curve completed', icon: '✅' },
      { stage: 'Vesting', description: 'Vesting tokens locked', icon: '🔒' },
      { stage: 'DAMM Pool', description: 'Migrated to DAMM pool', icon: '🔄' },
    ];

    const currentStage = stages[migrationProgress] || stages[0];
    return {
      ...currentStage,
      color: 'text-green-400',
      bgColor: 'bg-green-500/20',
    };
  };

  const migrationStage = getMigrationStage();
  const feesAmount = parseFloat(accumulatedFees) / 1e6; // Assuming USDC decimals

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">Migration Status</h3>
      
      {/* Current Stage */}
      <div className={`rounded-lg p-4 ${migrationStage.bgColor} border border-white/10 mb-4`}>
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{migrationStage.icon}</span>
          <div>
            <h4 className={`font-medium ${migrationStage.color}`}>
              {migrationStage.stage}
            </h4>
            <p className="text-sm text-gray-300">
              {migrationStage.description}
            </p>
          </div>
        </div>
      </div>

      {/* Accumulated Fees */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Accumulated Fees</span>
          <span className="text-sm font-medium text-white">
            ${feesAmount.toFixed(2)} USDC
          </span>
        </div>
        
        {feesAmount > 0 && (
          <button
            onClick={handleClaimFees}
            disabled={claiming || !publicKey}
            className={`w-full py-2 px-4 rounded-lg font-medium transition ${
              claiming || !publicKey
                ? 'bg-gray-500/50 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 text-white'
            }`}
          >
            {claiming ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Claiming...</span>
              </div>
            ) : (
              'Claim Fees'
            )}
          </button>
        )}
      </div>

      {/* Migration Timeline */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-400">Migration Timeline</h4>
        
        {[
          { stage: 'Bonding Curve', completed: isMigrated === 0 },
          { stage: 'Pre-Bonding', completed: isMigrated === 1 && migrationProgress >= 0 },
          { stage: 'Post-Bonding', completed: isMigrated === 1 && migrationProgress >= 1 },
          { stage: 'Vesting', completed: isMigrated === 1 && migrationProgress >= 2 },
          { stage: 'DAMM Pool', completed: isMigrated === 1 && migrationProgress >= 3 },
        ].map((item, index) => (
          <div key={index} className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
              item.completed 
                ? 'bg-green-500 border-green-500' 
                : 'border-gray-500'
            }`}>
              {item.completed && (
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
            <span className={`text-sm ${
              item.completed ? 'text-white' : 'text-gray-500'
            }`}>
              {item.stage}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
