/**
 * Price Chart Component
 * 
 * Displays token price history using lightweight-charts
 */

import React, { useEffect, useRef } from 'react';
import { createChart, IChartApi, ISeriesApi, LineData } from 'lightweight-charts';

interface PriceChartProps {
  data: any[];
  loading: boolean;
  timeframe: '4H' | '1D' | '1W' | '1M' | 'All';
  onTimeframeChange: (timeframe: '4H' | '1D' | '1W' | '1M' | 'All') => void;
  priceChange?: number;
}

export function PriceChart({ 
  data, 
  loading, 
  timeframe, 
  onTimeframeChange, 
  priceChange 
}: PriceChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

  const timeframes = [
    { value: '4H', label: '4H' },
    { value: '1D', label: '1D' },
    { value: '1W', label: '1W' },
    { value: '1M', label: '1M' },
    { value: 'All', label: 'All' },
  ] as const;

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: { color: 'transparent' },
        textColor: '#ffffff',
      },
      grid: {
        vertLines: { color: '#ffffff10' },
        horzLines: { color: '#ffffff10' },
      },
      crosshair: {
        mode: 1,
        vertLine: {
          color: '#ffffff40',
          width: 1,
          style: 0,
        },
        horzLine: {
          color: '#ffffff40',
          width: 1,
          style: 0,
        },
      },
      rightPriceScale: {
        borderColor: '#ffffff20',
        textColor: '#ffffff',
      },
      timeScale: {
        borderColor: '#ffffff20',
        textColor: '#ffffff',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Create line series
    const lineSeries = chart.addLineSeries({
      color: priceChange && priceChange >= 0 ? '#00ff88' : '#ff4444',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    seriesRef.current = lineSeries;

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [priceChange]);

  useEffect(() => {
    if (!seriesRef.current || !data.length) return;

    // Transform data for chart
    const chartData: LineData[] = data
      .filter(item => item.timestamp && item.price)
      .map(item => ({
        time: new Date(item.timestamp).getTime() / 1000,
        value: parseFloat(item.price),
      }))
      .sort((a, b) => a.time - b.time);

    if (chartData.length > 0) {
      seriesRef.current.setData(chartData);
    }
  }, [data]);

  if (loading) {
    return (
      <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Price Chart</h3>
          <div className="flex space-x-2">
            {timeframes.map((tf) => (
              <button
                key={tf.value}
                className={`px-3 py-1 rounded text-sm transition ${
                  timeframe === tf.value
                    ? 'bg-white/20 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
                onClick={() => onTimeframeChange(tf.value)}
              >
                {tf.label}
              </button>
            ))}
          </div>
        </div>
        <div className="h-96 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-white">Price Chart</h3>
          {priceChange !== undefined && (
            <div className={`flex items-center space-x-1 text-sm ${
              priceChange >= 0 ? 'text-green-400' : 'text-red-400'
            }`}>
              <svg 
                className={`w-4 h-4 ${priceChange >= 0 ? 'rotate-0' : 'rotate-180'}`} 
                fill="currentColor" 
                viewBox="0 0 20 20"
              >
                <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              <span>{Math.abs(priceChange).toFixed(2)}%</span>
            </div>
          )}
        </div>
        
        <div className="flex space-x-2">
          {timeframes.map((tf) => (
            <button
              key={tf.value}
              className={`px-3 py-1 rounded text-sm transition ${
                timeframe === tf.value
                  ? 'bg-white/20 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
              onClick={() => onTimeframeChange(tf.value)}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>
      
      <div 
        ref={chartContainerRef} 
        className="h-96 w-full"
      />
      
      {!data.length && (
        <div className="h-96 flex items-center justify-center text-gray-400">
          No price data available
        </div>
      )}
    </div>
  );
}
