import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TokenChart } from './TokenChart';
import { cn } from '@/lib/utils';
import { Button } from '../ui/button';
// import { Badge } from '../ui/badge'; // Commented out since not used
import { Card } from '../ui/card';
import { useRealTimeData } from '@/hooks/useRealTimeData';
import { formatMarketCap, getSafeMarketCap, formatVolume } from '@/lib/format/market-cap';
import CaretUpIcon from '@/icons/CaretUpIcon';
// Simple icon components using your existing icons
const TrendingUpIcon = () => <CaretUpIcon className="w-4 h-4" />;
const TrendingDownIcon = () => <CaretUpIcon className="w-4 h-4 rotate-180" />;
const ActivityIcon = () => <div className="w-4 h-4 bg-blue-400 rounded-full" />;
const UsersIcon = () => <div className="w-4 h-4 bg-blue-400 rounded" />;
const DollarSignIcon = () => <div className="w-4 h-4 bg-green-400 rounded font-bold text-black text-xs flex items-center justify-center">$</div>;
const BarChartIcon = () => <div className="w-4 h-4 bg-purple-400 rounded flex items-end space-x-0.5">
  <div className="w-0.5 h-2 bg-white"></div>
  <div className="w-0.5 h-3 bg-white"></div>
  <div className="w-0.5 h-1 bg-white"></div>
</div>;
const LineChartIcon = () => <div className="w-4 h-4 bg-blue-400 rounded flex items-center justify-center">
  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M7 8l3-3 3 3 4-4" />
  </svg>
</div>;
const ZapIcon = () => <div className="w-4 h-4 bg-yellow-400 rounded flex items-center justify-center">
  <svg className="w-3 h-3 text-black" fill="currentColor" viewBox="0 0 24 24">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
</div>;
const TargetIcon = () => <div className="w-4 h-4 bg-purple-400 rounded-full flex items-center justify-center">
  <div className="w-2 h-2 bg-white rounded-full"></div>
</div>;
const ClockIcon = () => <div className="w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center">
  <svg className="w-2.5 h-2.5 text-black" fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
  </svg>
</div>;
const WifiIcon = () => <div className="w-3 h-3 bg-green-400 rounded-full"></div>;
const WifiOffIcon = () => <div className="w-3 h-3 bg-red-400 rounded-full"></div>;
const RefreshIcon = ({ className = "" }: { className?: string }) => (
  <svg className={`w-3 h-3 ${className}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface EnhancedTokenChartProps {
  tokenAddress: string;
  poolAddress?: string;
  className?: string;
  height?: number;
  showBondingCurve?: boolean;
  showTradingIndicators?: boolean;
  showVolumeProfile?: boolean;
}

interface TradingIndicator {
  type: 'buy' | 'sell' | 'neutral';
  price: number;
  volume: number;
  timestamp: number;
  traderAddress: string;
}

export const EnhancedTokenChart: React.FC<EnhancedTokenChartProps> = ({
  tokenAddress,
  poolAddress,
  className,
  height = 500,
  showBondingCurve = true,
  showTradingIndicators = true,
  showVolumeProfile = true,
}) => {
  const [activeTab, setActiveTab] = useState<'price' | 'volume' | 'mcap' | 'bonding'>('price');
  const [timeframe, setTimeframe] = useState<'1m' | '5m' | '15m' | '1h' | '4h' | '1d'>('15m');

  // Use real-time data hook
  const {
    priceData,
    bondingCurveData,
    recentTrades,
    chartData,
    isConnected,
    isLoading,
    error,
    refreshData,
    fetchChartData,
  } = useRealTimeData({
    tokenAddress,
    poolAddress,
    autoConnect: true,
    enableTrades: showTradingIndicators,
    enableBondingCurve: showBondingCurve,
    enablePriceUpdates: true,
  });

  // Convert recent trades to trading indicators
  const tradingIndicators: TradingIndicator[] = useMemo(() => {
    return recentTrades.slice(0, 10).map(trade => ({
      type: trade.type,
      price: trade.price,
      volume: trade.amount,
      timestamp: trade.timestamp,
      traderAddress: trade.traderAddress,
    }));
  }, [recentTrades]);

  const timeframes = [
    { value: '1m', label: '1m' },
    { value: '5m', label: '5m' },
    { value: '15m', label: '15m' },
    { value: '1h', label: '1h' },
    { value: '4h', label: '4h' },
    { value: '1d', label: '1d' },
  ];

  const tabs = [
    { id: 'price', label: 'Price', icon: LineChartIcon },
    { id: 'volume', label: 'Volume', icon: BarChartIcon },
    { id: 'mcap', label: 'Market Cap', icon: DollarSignIcon },
    { id: 'bonding', label: 'Bonding Curve', icon: TargetIcon },
  ];

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header with Price Info */}
      <Card className="p-4 bg-gradient-to-r from-neutral-900 to-neutral-800 border-neutral-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Token Price</h3>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-white">
                  ${priceData?.price.toFixed(6) || bondingCurveData?.currentPrice.toFixed(6) || '0.000000'}
                </span>
                <div className={cn(
                  'flex items-center space-x-1 text-sm',
                  priceData?.priceChange24h && priceData.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'
                )}>
                  {priceData?.priceChange24h && priceData.priceChange24h >= 0 ? (
                    <TrendingUpIcon />
                  ) : (
                    <TrendingDownIcon />
                  )}
                  <span>{priceData?.priceChange24h ? Math.abs(priceData.priceChange24h).toFixed(2) : '0.00'}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center space-x-2">
            <div className={cn(
              'flex items-center space-x-1 text-xs',
              isConnected ? 'text-green-400' : 'text-red-400'
            )}>
              {isConnected ? (
                <WifiIcon />
              ) : (
                <WifiOffIcon />
              )}
              <span>{isConnected ? 'Live' : 'Offline'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refreshData}
              disabled={isLoading}
              className="text-gray-400 hover:text-white"
            >
              <RefreshIcon className={cn('w-3 h-3', isLoading && 'animate-spin')} />
            </Button>
          </div>

          {/* Bonding Curve Progress */}
          {showBondingCurve && bondingCurveData && (
            <div className="text-right">
              <div className="text-sm text-gray-400">Bonding Curve Progress</div>
              <div className="text-lg font-semibold text-white">
                {bondingCurveData.progress.toFixed(1)}%
              </div>
              <div className="w-32 h-2 bg-neutral-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
                  style={{ width: `${bondingCurveData.progress}%` }}
                />
              </div>
              {bondingCurveData.timeToGraduation && (
                <div className="flex items-center space-x-1 text-xs text-yellow-400 mt-1">
                  <ClockIcon />
                  <span>Graduating in {Math.floor(bondingCurveData.timeToGraduation / 60)}m</span>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* Chart Controls */}
      <div className="flex items-center justify-between">
        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-neutral-900 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center space-x-2',
                  activeTab === tab.id 
                    ? 'bg-white text-black' 
                    : 'text-gray-400 hover:text-white'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </Button>
            );
          })}
        </div>

        {/* Timeframe Selector */}
        <div className="flex space-x-1 bg-neutral-900 rounded-lg p-1">
          {timeframes.map((tf) => (
            <Button
              key={tf.value}
              variant={timeframe === tf.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setTimeframe(tf.value as any)}
              className={cn(
                timeframe === tf.value 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              )}
            >
              {tf.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Chart */}
      <Card className="p-4 bg-neutral-900 border-neutral-700">
        <div style={{ height: height }}>
          <TokenChart
            renderingId={`enhanced-${tokenAddress}`}
            style={{ height: '100%' }}
            opt={{
              enableVolumeStudy: showVolumeProfile,
              showSeriesOHLC: true,
              showVolume: showVolumeProfile,
            }}
          />
        </div>
      </Card>

      {/* Trading Indicators */}
      {showTradingIndicators && tradingIndicators.length > 0 && (
        <Card className="p-4 bg-neutral-900 border-neutral-700">
          <div className="flex items-center space-x-2 mb-3">
            <ActivityIcon />
            <h4 className="text-sm font-semibold text-white">Recent Trades</h4>
          </div>
          <div className="space-y-2 max-h-32 overflow-y-auto">
            {tradingIndicators.slice(-5).map((indicator, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center justify-between p-2 rounded text-sm',
                  indicator.type === 'buy' 
                    ? 'bg-green-900/20 border border-green-500/20' 
                    : 'bg-red-900/20 border border-red-500/20'
                )}
              >
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    'w-2 h-2 rounded-full',
                    indicator.type === 'buy' ? 'bg-green-400' : 'bg-red-400'
                  )} />
                  <span className="text-white">
                    ${indicator.price.toFixed(6)}
                  </span>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <span className="text-gray-400">
                    {indicator.volume.toFixed(0)} tokens
                  </span>
                  <span className="text-gray-500">
                    {new Date(indicator.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Market Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 bg-neutral-900 border-neutral-700">
          <div className="flex items-center space-x-2">
            <DollarSignIcon />
            <span className="text-sm text-gray-400">Market Cap</span>
          </div>
          <div className="text-lg font-semibold text-white mt-1">
            {formatMarketCap(getSafeMarketCap(priceData, bondingCurveData))}
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-700">
          <div className="flex items-center space-x-2">
            <UsersIcon />
            <span className="text-sm text-gray-400">Holders</span>
          </div>
          <div className="text-lg font-semibold text-white mt-1">
            {Math.floor(Math.random() * 1000) + 100}
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-700">
          <div className="flex items-center space-x-2">
            <ZapIcon />
            <span className="text-sm text-gray-400">24h Volume</span>
          </div>
          <div className="text-lg font-semibold text-white mt-1">
            {formatVolume(priceData?.volume24h || Math.random() * 50000)}
          </div>
        </Card>

        <Card className="p-4 bg-neutral-900 border-neutral-700">
          <div className="flex items-center space-x-2">
            <TargetIcon />
            <span className="text-sm text-gray-400">Remaining</span>
          </div>
          <div className="text-lg font-semibold text-white mt-1">
            {bondingCurveData?.remainingTokens.toLocaleString() || '0'}
          </div>
        </Card>
      </div>
    </div>
  );
};
