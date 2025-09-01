import { useState, useEffect, useCallback, useRef } from 'react';
import { realTimeDataService, TokenPriceData, TradingActivity, BondingCurveData, ChartDataPoint } from '@/lib/services/RealTimeDataService';

interface UseRealTimeDataOptions {
  tokenAddress: string;
  poolAddress?: string;
  autoConnect?: boolean;
  enableTrades?: boolean;
  enableBondingCurve?: boolean;
  enablePriceUpdates?: boolean;
}

interface UseRealTimeDataReturn {
  // Data
  priceData: TokenPriceData | null;
  bondingCurveData: BondingCurveData | null;
  recentTrades: TradingActivity[];
  chartData: ChartDataPoint[];
  
  // State
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshData: () => Promise<void>;
  fetchChartData: (interval: string, from: number, to: number) => Promise<ChartDataPoint[]>;
}

export const useRealTimeData = ({
  tokenAddress,
  poolAddress,
  autoConnect = true,
  enableTrades = true,
  enableBondingCurve = true,
  enablePriceUpdates = true,
}: UseRealTimeDataOptions): UseRealTimeDataReturn => {
  const [priceData, setPriceData] = useState<TokenPriceData | null>(null);
  const [bondingCurveData, setBondingCurveData] = useState<BondingCurveData | null>(null);
  const [recentTrades, setRecentTrades] = useState<TradingActivity[]>([]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubscribed = useRef(false);

  // Connect to real-time data service
  const connect = useCallback(async () => {
    if (isSubscribed.current) return;

    try {
      setIsLoading(true);
      setError(null);

      // Connect to the service
      await realTimeDataService.connect();
      setIsConnected(true);

      // Subscribe to token updates
      await realTimeDataService.subscribeToToken(tokenAddress, poolAddress);
      isSubscribed.current = true;

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
      setIsLoading(false);
    }
  }, [tokenAddress, poolAddress]);

  // Disconnect from real-time data service
  const disconnect = useCallback(() => {
    if (isSubscribed.current) {
      realTimeDataService.unsubscribeFromToken(tokenAddress);
      isSubscribed.current = false;
    }
    setIsConnected(false);
  }, [tokenAddress]);

  // Refresh all data
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Fetch fresh data
      if (enablePriceUpdates) {
        const priceData = await realTimeDataService.fetchTokenPriceData(tokenAddress);
        setPriceData(priceData);
      }

      if (enableBondingCurve) {
        const bondingCurveData = await realTimeDataService.fetchBondingCurveData(tokenAddress);
        setBondingCurveData(bondingCurveData);
      }

      if (enableTrades) {
        const trades = await realTimeDataService.fetchRecentTrades(tokenAddress);
        setRecentTrades(trades);
      }

      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
      setIsLoading(false);
    }
  }, [tokenAddress, enablePriceUpdates, enableBondingCurve, enableTrades]);

  // Fetch chart data
  const fetchChartData = useCallback(async (
    interval: string,
    from: number,
    to: number
  ): Promise<ChartDataPoint[]> => {
    try {
      const data = await realTimeDataService.fetchChartData(tokenAddress, interval, from, to);
      setChartData(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch chart data');
      throw err;
    }
  }, [tokenAddress]);

  // Set up event listeners
  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleInitialPriceData = ({ tokenAddress: eventTokenAddress, priceData: data }: any) => {
      if (eventTokenAddress === tokenAddress && enablePriceUpdates) {
        setPriceData(data);
      }
    };

    const handleInitialBondingCurveData = ({ tokenAddress: eventTokenAddress, bondingCurveData: data }: any) => {
      if (eventTokenAddress === tokenAddress && enableBondingCurve) {
        setBondingCurveData(data);
      }
    };

    const handleInitialTrades = ({ tokenAddress: eventTokenAddress, trades }: any) => {
      if (eventTokenAddress === tokenAddress && enableTrades) {
        setRecentTrades(trades);
      }
    };

    const handleTokenUpdate = ({ tokenAddress: eventTokenAddress }: any) => {
      if (eventTokenAddress === tokenAddress) {
        // Refresh data when token updates
        refreshData();
      }
    };

    const handlePoolUpdate = ({ poolAddress: eventPoolAddress }: any) => {
      if (eventPoolAddress === poolAddress) {
        // Refresh data when pool updates
        refreshData();
      }
    };

    // Add event listeners
    realTimeDataService.on('connected', handleConnected);
    realTimeDataService.on('disconnected', handleDisconnected);
    realTimeDataService.on('initialPriceData', handleInitialPriceData);
    realTimeDataService.on('initialBondingCurveData', handleInitialBondingCurveData);
    realTimeDataService.on('initialTrades', handleInitialTrades);
    realTimeDataService.on('tokenUpdate', handleTokenUpdate);
    realTimeDataService.on('poolUpdate', handlePoolUpdate);

    // Auto-connect if enabled
    if (autoConnect) {
      connect();
    }

    // Cleanup function
    return () => {
      realTimeDataService.off('connected', handleConnected);
      realTimeDataService.off('disconnected', handleDisconnected);
      realTimeDataService.off('initialPriceData', handleInitialPriceData);
      realTimeDataService.off('initialBondingCurveData', handleInitialBondingCurveData);
      realTimeDataService.off('initialTrades', handleInitialTrades);
      realTimeDataService.off('tokenUpdate', handleTokenUpdate);
      realTimeDataService.off('poolUpdate', handlePoolUpdate);

      // Disconnect when component unmounts
      disconnect();
    };
  }, [tokenAddress, poolAddress, autoConnect, enablePriceUpdates, enableBondingCurve, enableTrades, connect, disconnect, refreshData]);

  return {
    // Data
    priceData,
    bondingCurveData,
    recentTrades,
    chartData,
    
    // State
    isConnected,
    isLoading,
    error,
    
    // Actions
    connect,
    disconnect,
    refreshData,
    fetchChartData,
  };
};
