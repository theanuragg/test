/**
 * Bonding Curve Progress Component
 * 
 * Displays DBC bonding curve progress and migration status
 */

import React from 'react';
import { DbcPoolData } from '../../hooks/useDbcPool';

interface BondingCurveProgressProps {
  progress: number;
  isMigrated: number;
  migrationProgress: number;
}

export function BondingCurveProgress({ 
  progress, 
  isMigrated, 
  migrationProgress 
}: BondingCurveProgressProps) {
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-yellow-500';
    if (progress >= 50) return 'bg-orange-500';
    return 'bg-blue-500';
  };

  const getMigrationStatus = () => {
    if (isMigrated === 0) {
      return {
        status: 'Bonding Curve Active',
        description: 'Token is currently trading on the bonding curve',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/20',
      };
    }

    switch (migrationProgress) {
      case 0:
        return {
          status: 'Pre-Bonding Curve',
          description: 'Pool is being prepared for bonding curve',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
        };
      case 1:
        return {
          status: 'Post-Bonding Curve',
          description: 'Bonding curve completed, preparing for migration',
          color: 'text-yellow-400',
          bgColor: 'bg-yellow-500/20',
        };
      case 2:
        return {
          status: 'Locked Vesting',
          description: 'Vesting tokens are being locked',
          color: 'text-orange-400',
          bgColor: 'bg-orange-500/20',
        };
      case 3:
        return {
          status: 'DAMM Pool Created',
          description: 'Successfully migrated to DAMM pool',
          color: 'text-green-400',
          bgColor: 'bg-green-500/20',
        };
      default:
        return {
          status: 'Unknown Status',
          description: 'Migration status unknown',
          color: 'text-gray-400',
          bgColor: 'bg-gray-500/20',
        };
    }
  };

  const migrationInfo = getMigrationStatus();

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">Bonding Curve Progress</h3>
      
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Progress to Migration</span>
          <span className="text-sm font-medium text-white">{progress.toFixed(1)}%</span>
        </div>
        
        <div className="w-full bg-white/10 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Migration Status */}
      <div className={`rounded-lg p-4 ${migrationInfo.bgColor} border border-white/10`}>
        <div className="flex items-center space-x-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${migrationInfo.color.replace('text-', 'bg-')}`} />
          <h4 className={`font-medium ${migrationInfo.color}`}>
            {migrationInfo.status}
          </h4>
        </div>
        <p className="text-sm text-gray-300">
          {migrationInfo.description}
        </p>
      </div>

      {/* Progress Details */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Current Stage:</span>
          <span className="text-white font-medium">
            {migrationProgress === 0 && isMigrated === 0 ? 'Bonding Curve' : `Stage ${migrationProgress}`}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Migration Status:</span>
          <span className={`font-medium ${isMigrated === 1 ? 'text-green-400' : 'text-yellow-400'}`}>
            {isMigrated === 1 ? 'Migrated' : 'Not Migrated'}
          </span>
        </div>
      </div>
    </div>
  );
}
