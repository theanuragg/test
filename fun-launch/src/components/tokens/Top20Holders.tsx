'use client';
import React from 'react';

interface TokenStats {
  marketCap: string;
  fdv: string;
  liquidity: string;
  holders: string;
  likes: number;
  orgScore: number;
  vol24h: string;
  netVol: string;
  traders24h: string;
  netBuyers: string;
  timeStats: {
    fiveMin: number;
    oneHour: number;
    sixHour: number;
    twentyFourHour: number;
  };
  buyPercentage: number;
  sellPercentage: number;
}

const mockStats: TokenStats = {
  marketCap: '$708M',
  fdv: '$708M',
  liquidity: '$16.3M',
  holders: '30.1K',
  likes: 18,
  orgScore: 96.0,
  vol24h: '$48.7M',
  netVol: '$502K',
  traders24h: '8.22K',
  netBuyers: '2.62K',
  timeStats: {
    fiveMin: -0.68,
    oneHour: -3.33,
    sixHour: -0.02,
    twentyFourHour: 4.04
  },
  buyPercentage: 51,
  sellPercentage: 68
};

export function TokenStatistics() {
  const formatPercentage = (value: number) => {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getPercentageColor = (value: number) => {
    return value >= 0 ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className="bg-card-foreground border border-[#00ffff]/40 rounded-2xl p-6 backdrop-blur-sm">
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">MC</div>
            <div className="text-2xl font-bold">{mockStats.marketCap}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">FDV</div>
            <div className="text-2xl font-bold">{mockStats.fdv}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Liquidity</div>
            <div className="text-2xl font-bold">{mockStats.liquidity}</div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Holders</div>
            <div className="text-xl font-semibold">{mockStats.holders}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Likes</div>
            <div className="text-xl font-semibold">{mockStats.likes}</div>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground uppercase tracking-wider">Org Score</div>
            <div className="text-xl font-semibold text-green-400">{mockStats.orgScore}</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 py-4 border-y border-border">
          <div className="text-center space-y-1">
            <div className="text-xs text-muted-foreground">5m</div>
            <div className={`text-sm font-medium ${getPercentageColor(mockStats.timeStats.fiveMin)}`}>
              {formatPercentage(mockStats.timeStats.fiveMin)}
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-xs text-muted-foreground">1h</div>
            <div className={`text-sm font-medium ${getPercentageColor(mockStats.timeStats.oneHour)}`}>
              {formatPercentage(mockStats.timeStats.oneHour)}
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-xs text-muted-foreground">6h</div>
            <div className={`text-sm font-medium ${getPercentageColor(mockStats.timeStats.sixHour)}`}>
              {formatPercentage(mockStats.timeStats.sixHour)}
            </div>
          </div>
          <div className="text-center space-y-1">
            <div className="text-xs text-muted-foreground">24h</div>
            <div className={`text-sm font-medium ${getPercentageColor(mockStats.timeStats.twentyFourHour)}`}>
              {formatPercentage(mockStats.timeStats.twentyFourHour)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">24h Vol</div>
              <div className="text-xl font-semibold">{mockStats.vol24h}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">24h Traders</div>
              <div className="text-xl font-semibold">{mockStats.traders24h}</div>
            </div>
          </div>
          
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Net Vol</div>
              <div className="text-xl font-semibold text-green-400">{mockStats.netVol}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">Net Buyers</div>
              <div className="text-xl font-semibold">{mockStats.netBuyers}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#00ffff]"></div>
              <span className="text-sm font-medium">{mockStats.buyPercentage}% Buy</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-sm font-medium">{mockStats.sellPercentage}% Sell</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TokenStatistics;
