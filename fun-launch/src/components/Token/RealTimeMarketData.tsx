import React from 'react';
import { useRealTimeData } from '../../hooks/useRealTimeData';
import { formatPrice, formatMarketCap, formatVolume } from '../../lib/format/market-cap';

interface RealTimeMarketDataProps {
  poolAddress: string;
  baseMint: string;
  quoteMint: string;
  tokenDecimals?: number;
  quoteDecimals?: number;
}

export function RealTimeMarketData({
  poolAddress,
  baseMint,
  quoteMint,
  tokenDecimals = 9,
  quoteDecimals = 6
}: RealTimeMarketDataProps) {
  const { marketData, loading, error, isConnected, refreshData } = useRealTimeData({
    poolAddress,
    baseMint,
    quoteMint,
    tokenDecimals,
    quoteDecimals,
    updateInterval: 15000 // 15 seconds
  });

  if (loading && !marketData) {
    return (
      <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Market Data</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-gray-400">Loading...</span>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-700 rounded mb-2"></div>
              <div className="h-6 bg-gray-600 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Market Data</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span className="text-sm text-red-400">Error</span>
          </div>
        </div>
        <div className="text-red-400 text-sm mb-4">{error}</div>
        <button
          onClick={refreshData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!marketData) {
    return (
      <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Market Data</h3>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
            <span className="text-sm text-gray-400">No Data</span>
          </div>
        </div>
        <div className="text-gray-400 text-sm">No market data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Live Market Data</h3>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={refreshData}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* Price */}
        <div className="space-y-2">
          <div className="text-sm text-gray-400">Price</div>
          <div className="text-xl font-bold text-white">
            ${formatPrice(marketData.price)}
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {marketData.lastUpdated.toLocaleTimeString()}
          </div>
        </div>

        {/* Market Cap */}
        <div className="space-y-2">
          <div className="text-sm text-gray-400">Market Cap</div>
          <div className="text-xl font-bold text-white">
            ${formatMarketCap(marketData.marketCap)}
          </div>
          <div className="text-xs text-gray-500">
            Supply: {marketData.totalSupply.toLocaleString()}
          </div>
        </div>

        {/* 24h Volume */}
        <div className="space-y-2">
          <div className="text-sm text-gray-400">24h Volume</div>
          <div className="text-xl font-bold text-white">
            ${formatVolume(marketData.volume24h)}
          </div>
          <div className="text-xs text-gray-500">
            Circulating: {marketData.circulatingSupply.toLocaleString()}
          </div>
        </div>

        {/* Bonding Curve Progress */}
        <div className="space-y-2">
          <div className="text-sm text-gray-400">Bonding Curve</div>
          <div className="text-xl font-bold text-white">
            {marketData.bondingCurveProgress.toFixed(2)}%
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${marketData.bondingCurveProgress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Real-time indicator */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">Real-time updates</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-green-400">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
