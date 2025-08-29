/**
 * Creator Actions Component
 * 
 * Provides actions for token creators to manage their tokens
 */

import React, { useState } from 'react';
import { useWallet } from '@jup-ag/wallet-adapter';
import { TokenInfo } from '../../lib/jupiter/api-client';
import { DbcPoolData } from '../../hooks/useDbcPool';
import { toast } from 'sonner';

interface CreatorActionsProps {
  tokenMint: string;
  tokenInfo: TokenInfo | null;
  dbcData: DbcPoolData | null;
}

export function CreatorActions({ 
  tokenMint, 
  tokenInfo, 
  dbcData 
}: CreatorActionsProps) {
  const { publicKey } = useWallet();
  const [claiming, setClaiming] = useState(false);

  const isCreator = publicKey && dbcData && 
    publicKey.toString() === dbcData.poolCreator;

  const handleClaimFees = async () => {
    if (!publicKey || !dbcData) {
      toast.error('Please connect your wallet');
      return;
    }

    setClaiming(true);
    try {
      const response = await fetch('/api/claim-fees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poolAddress: dbcData.poolAddress,
          userWallet: publicKey.toString(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to claim fees');
      }

      toast.success(`Successfully claimed ${data.claimableAmount} fees!`);
    } catch (error) {
      console.error('Error claiming fees:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to claim fees');
    } finally {
      setClaiming(false);
    }
  };

  const handleViewOnExplorer = () => {
    const explorerUrl = `https://solscan.io/token/${tokenMint}`;
    window.open(explorerUrl, '_blank');
  };

  const handleViewPoolOnExplorer = () => {
    if (!dbcData) return;
    const explorerUrl = `https://solscan.io/account/${dbcData.poolAddress}`;
    window.open(explorerUrl, '_blank');
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(tokenMint);
    toast.success('Token address copied to clipboard');
  };

  if (!isCreator) {
    return null;
  }

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <h3 className="text-lg font-semibold text-white mb-4">Creator Actions</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Claim Fees */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">Accumulated Fees</h4>
            <span className="text-sm font-medium text-white">
              ${(parseFloat(dbcData?.accumulatedFees || '0') / 1e6).toFixed(2)} USDC
            </span>
          </div>
          
          <button
            onClick={handleClaimFees}
            disabled={claiming || parseFloat(dbcData?.accumulatedFees || '0') === 0}
            className={`w-full py-2 px-4 rounded-lg font-medium transition ${
              claiming || parseFloat(dbcData?.accumulatedFees || '0') === 0
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
        </div>

        {/* Pool Status */}
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-gray-300">Pool Status</h4>
            <span className={`text-sm font-medium ${
              dbcData?.isMigrated === 1 ? 'text-green-400' : 'text-yellow-400'
            }`}>
              {dbcData?.isMigrated === 1 ? 'Migrated' : 'Active'}
            </span>
          </div>
          
          <div className="text-xs text-gray-400 space-y-1">
            <div>Progress: {dbcData?.progress.toFixed(1)}%</div>
            <div>Stage: {dbcData?.migrationProgress}/3</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <h4 className="text-sm font-medium text-gray-300 mb-3">Quick Actions</h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <button
            onClick={handleCopyAddress}
            className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm text-white transition"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z"/>
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z"/>
            </svg>
            <span>Copy Address</span>
          </button>
          
          <button
            onClick={handleViewOnExplorer}
            className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm text-white transition"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <span>View Token</span>
          </button>
          
          <button
            onClick={handleViewPoolOnExplorer}
            className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm text-white transition"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            <span>View Pool</span>
          </button>
          
          {tokenInfo?.extensions?.website && (
            <a
              href={tokenInfo.extensions.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm text-white transition"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12.586 4.586a2 2 0 112.828 2.828l-3 3a2 2 0 01-2.828 0 1 1 0 00-1.414 1.414 4 4 0 005.656 0l3-3a4 4 0 00-5.656-5.656l-1.5 1.5a1 1 0 101.414 1.414l1.5-1.5zm-5 5a2 2 0 012.828 0 1 1 0 101.414-1.414 4 4 0 00-5.656 0l-3 3a4 4 0 105.656 5.656l1.5-1.5a1 1 0 10-1.414-1.414l-1.5 1.5a2 2 0 11-2.828-2.828l3-3z" clipRule="evenodd" />
              </svg>
              <span>Website</span>
            </a>
          )}
        </div>
      </div>

      {/* Creator Info */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Creator Address</span>
          <span className="text-white font-mono">
            {shortenAddress(dbcData?.poolCreator || '')}
          </span>
        </div>
        
        <div className="flex items-center justify-between text-sm mt-2">
          <span className="text-gray-400">Pool Address</span>
          <span className="text-white font-mono">
            {shortenAddress(dbcData?.poolAddress || '')}
          </span>
        </div>
      </div>
    </div>
  );
}

function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
