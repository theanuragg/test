'use client'


// components/DbcConfigForm.tsx
import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

interface DbcConfigFormProps {
  onConfigComplete: (config: unknown) => void;
}

export default function DbcConfigForm({ onConfigComplete }: DbcConfigFormProps) {
  const { publicKey } = useWallet();
  const [formData, setFormData] = useState({
    buildCurveMode: 0,
    quoteMint: 'So11111111111111111111111111111111111111112',
    totalTokenSupply: 1000000000,
    migrationOption: 1,
    tokenBaseDecimal: 6,
    tokenQuoteDecimal: 9,
    percentageSupplyOnMigration: 20,
    migrationQuoteThreshold: 1,
    initialMarketCap: 20,
    migrationMarketCap: 600,
    liquidityWeights: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    lockedVestingParam: {
      totalLockedVestingAmount: 100000000,
      numberOfVestingPeriod: 24,
      cliffUnlockAmount: 100000000,
      totalVestingDuration: 2592000,
      cliffDurationFromMigrationTime: 0,
    },
    baseFeeParams: {
      baseFeeMode: 0,
      feeSchedulerParam: {
        startingFeeBps: 200,
        endingFeeBps: 200,
        numberOfPeriod: 0,
        totalDuration: 0,
      },
    },
    dynamicFeeEnabled: true,
    activationType: 1,
    collectFeeMode: 0,
    migrationFeeOption: 3,
    tokenType: 0,
    partnerLpPercentage: 25,
    creatorLpPercentage: 25,
    partnerLockedLpPercentage: 25,
    creatorLockedLpPercentage: 25,
    creatorTradingFeePercentage: 0,
    leftover: 0,
    tokenUpdateAuthority: 1,
    migrationFee: {
      feePercentage: 0,
      creatorFeePercentage: 0,
    },
    leftoverReceiver: '',
    feeClaimer: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields based on curve mode
    if (formData.buildCurveMode === 0) {
      if (!formData.percentageSupplyOnMigration || !formData.migrationQuoteThreshold) {
        alert('Please fill in all required fields for this curve mode');
        return;
      }
    } else if (formData.buildCurveMode === 1 || formData.buildCurveMode === 2) {
      if (!formData.initialMarketCap || !formData.migrationMarketCap) {
        alert('Please fill in all required fields for this curve mode');
        return;
      }
    } else if (formData.buildCurveMode === 3) {
      if (!formData.initialMarketCap || !formData.migrationMarketCap || !formData.liquidityWeights) {
        alert('Please fill in all required fields for this curve mode');
        return;
      }
    }

    // Create configuration object
    const config = {
      rpcUrl: process.env.NEXT_PUBLIC_SOLANA_RPC_URL || '<https://api.devnet.solana.com>',
      dryRun: false,
      computeUnitPriceMicroLamports: 100000,
      quoteMint: formData.quoteMint,
      dbcConfig: formData,
    };

    onConfigComplete(config);
  };

  const renderCurveModeFields = () => {
    switch (formData.buildCurveMode) {
      case 0:
        return (
          <>
            <div>
              <label>Percentage Supply on Migration (%)</label>
              <input
                type="number"
                value={formData.percentageSupplyOnMigration}
                onChange={(e) => setFormData({...formData, percentageSupplyOnMigration: parseInt(e.target.value)})}
                min="1"
                max="100"
                required
              />
            </div>
            <div>
              <label>Migration Quote Threshold</label>
              <input
                type="number"
                value={formData.migrationQuoteThreshold}
                onChange={(e) => setFormData({...formData, migrationQuoteThreshold: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
          </>
        );
      case 1:
        return (
          <>
            <div>
              <label>Initial Market Cap</label>
              <input
                type="number"
                value={formData.initialMarketCap}
                onChange={(e) => setFormData({...formData, initialMarketCap: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
            <div>
              <label>Migration Market Cap</label>
              <input
                type="number"
                value={formData.migrationMarketCap}
                onChange={(e) => setFormData({...formData, migrationMarketCap: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
          </>
        );
      case 2:
        return (
          <>
            <div>
              <label>Initial Market Cap</label>
              <input
                type="number"
                value={formData.initialMarketCap}
                onChange={(e) => setFormData({...formData, initialMarketCap: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
            <div>
              <label>Migration Market Cap</label>
              <input
                type="number"
                value={formData.migrationMarketCap}
                onChange={(e) => setFormData({...formData, migrationMarketCap: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
            <div>
              <label>Percentage Supply on Migration (%)</label>
              <input
                type="number"
                value={formData.percentageSupplyOnMigration}
                onChange={(e) => setFormData({...formData, percentageSupplyOnMigration: parseInt(e.target.value)})}
                min="1"
                max="100"
                required
              />
            </div>
          </>
        );
      case 3:
        return (
          <>
            <div>
              <label>Initial Market Cap</label>
              <input
                type="number"
                value={formData.initialMarketCap}
                onChange={(e) => setFormData({...formData, initialMarketCap: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
            <div>
              <label>Migration Market Cap</label>
              <input
                type="number"
                value={formData.migrationMarketCap}
                onChange={(e) => setFormData({...formData, migrationMarketCap: parseInt(e.target.value)})}
                min="1"
                required
              />
            </div>
            <div>
              <label>Liquidity Weights (16 values, comma-separated)</label>
              <input
                type="text"
                value={formData.liquidityWeights.join(', ')}
                onChange={(e) => {
                  const weights = e.target.value.split(',').map(w => parseInt(w.trim()) || 0);
                  setFormData({...formData, liquidityWeights: weights});
                }}
                placeholder="1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16"
                required
              />
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label>Build Curve Mode</label>
        <select
          value={formData.buildCurveMode}
          onChange={(e) => setFormData({...formData, buildCurveMode: parseInt(e.target.value)})}
          required
        >
          <option value={0}>Build Curve (Percentage + Threshold)</option>
          <option value={1}>Build Curve with Market Cap</option>
          <option value={2}>Build Curve with Two Segments</option>
          <option value={3}>Build Curve with Liquidity Weights</option>
        </select>
      </div>

      <div>
        <label>Quote Mint</label>
        <input
          type="text"
          value={formData.quoteMint}
          onChange={(e) => setFormData({...formData, quoteMint: e.target.value})}
          placeholder="SOL or USDC mint address"
          required
        />
      </div>

      <div>
        <label>Total Token Supply</label>
        <input
          type="number"
          value={formData.totalTokenSupply}
          onChange={(e) => setFormData({...formData, totalTokenSupply: parseInt(e.target.value)})}
          min="1"
          required
        />
      </div>

      <div>
        <label>Migration Option</label>
        <select
          value={formData.migrationOption}
          onChange={(e) => setFormData({...formData, migrationOption: parseInt(e.target.value)})}
          required
        >
          <option value={0}>Migrate to DAMM V1</option>
          <option value={1}>Migrate to DAMM V2</option>
        </select>
      </div>

      <div>
        <label>Token Base Decimals</label>
        <input
          type="number"
          value={formData.tokenBaseDecimal}
          onChange={(e) => setFormData({...formData, tokenBaseDecimal: parseInt(e.target.value)})}
          min="0"
          max="9"
          required
        />
      </div>

      <div>
        <label>Token Quote Decimals</label>
        <input
          type="number"
          value={formData.tokenQuoteDecimal}
          onChange={(e) => setFormData({...formData, tokenQuoteDecimal: parseInt(e.target.value)})}
          min="0"
          max="9"
          required
        />
      </div>

      {/* Curve Mode Specific Fields */}
      {renderCurveModeFields()}

      <div>
        <label>Partner LP Percentage (%)</label>
        <input
          type="number"
          value={formData.partnerLpPercentage}
          onChange={(e) => setFormData({...formData, partnerLpPercentage: parseInt(e.target.value)})}
          min="0"
          max="100"
          required
        />
      </div>

      <div>
        <label>Creator LP Percentage (%)</label>
        <input
          type="number"
          value={formData.creatorLpPercentage}
          onChange={(e) => setFormData({...formData, creatorLpPercentage: parseInt(e.target.value)})}
          min="0"
          max="100"
          required
        />
      </div>

      <div>
        <label>Partner Locked LP Percentage (%)</label>
        <input
          type="number"
          value={formData.partnerLockedLpPercentage}
          onChange={(e) => setFormData({...formData, partnerLockedLpPercentage: parseInt(e.target.value)})}
          min="0"
          max="100"
          required
        />
      </div>

      <div>
        <label>Creator Locked LP Percentage (%)</label>
        <input
          type="number"
          value={formData.creatorLockedLpPercentage}
          onChange={(e) => setFormData({...formData, creatorLockedLpPercentage: parseInt(e.target.value)})}
          min="0"
          max="100"
          required
        />
      </div>

      <div>
        <label>Creator Trading Fee Percentage (%)</label>
        <input
          type="number"
          value={formData.creatorTradingFeePercentage}
          onChange={(e) => setFormData({...formData, creatorTradingFeePercentage: parseInt(e.target.value)})}
          min="0"
          max="100"
          required
        />
      </div>

      <div>
        <label>Migration Fee Option</label>
        <select
          value={formData.migrationFeeOption}
          onChange={(e) => setFormData({...formData, migrationFeeOption: parseInt(e.target.value)})}
          required
        >
          <option value={0}>LP Fee 0.25%</option>
          <option value={1}>LP Fee 0.3%</option>
          <option value={2}>LP Fee 1%</option>
          <option value={3}>LP Fee 2%</option>
          <option value={4}>LP Fee 4%</option>
          <option value={5}>LP Fee 6%</option>
        </select>
      </div>

      <div>
        <label>Leftover Receiver Address</label>
        <input
          type="text"
          value={formData.leftoverReceiver}
          onChange={(e) => setFormData({...formData, leftoverReceiver: e.target.value})}
          placeholder="Wallet address for leftover tokens"
          required
        />
      </div>

      <div>
        <label>Fee Claimer Address</label>
        <input
          type="text"
          value={formData.feeClaimer}
          onChange={(e) => setFormData({...formData, feeClaimer: e.target.value})}
          placeholder="Wallet address for fee claiming"
          required
        />
      </div>

      <button
        type="submit"
        className="btn-primary w-full"
      >
        Create Configuration
      </button>
    </form>
  );
}
