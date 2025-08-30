'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  createChart,
  ColorType,
  Time,
  CandlestickData,
  ISeriesApi,
} from 'lightweight-charts';

export default function Chart() {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const seriesRef = useRef<any>(null);
  const [currentPrice, setCurrentPrice] = useState(0.03442);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create the chart
    const chart = createChart(chartContainerRef.current, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: '#0a0a0a' },
        textColor: '#ffffff',
      },
      grid: {
        vertLines: { color: '#1a1a1a' },
        horzLines: { color: '#1a1a1a' },
      },
      rightPriceScale: {
        borderColor: '#1a1a1a',
        textColor: '#6b7280',
      },
      timeScale: {
        borderColor: '#1a1a1a',
        timeVisible: true,
        secondsVisible: false,
      },
      crosshair: {
        mode: 1,
        vertLine: {
          width: 1,
          color: '#6b7280',
          style: 1,
        },
        horzLine: {
          width: 1,
          color: '#6b7280',
          style: 1,
        },
      },
      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
      },
      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },
    });

    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    const generateCandlestickData = () => {
      const data: CandlestickData[] = [];
      const basePrice = 0.03442;
      const now = Math.floor(Date.now() / 1000);
      let lastClose = basePrice;

      for (let i = 50; i >= 0; i--) {
        const variation = (Math.random() - 0.5) * 0.002;
        const open = lastClose;
        const volatility = Math.random() * 0.001;

        const high = open + Math.random() * volatility;
        const low = open - Math.random() * volatility;
        const close = Math.max(0.03, open + variation);

        data.push({
          time: (now - i * 300) as Time, // 5-minute intervals
          open,
          high: Math.max(open, high, close),
          low: Math.min(open, low, close),
          close,
        });

        lastClose = close;
      }

      return data;
    };

    const initialData = generateCandlestickData();
    candlestickSeries.setData(initialData);
    setCurrentPrice(initialData[initialData.length - 1].close);

    chartRef.current = chart;
    seriesRef.current = candlestickSeries;

    const interval = setInterval(() => {
      const lastCandle = initialData[initialData.length - 1];
      const basePrice = lastCandle.close;
      const variation = (Math.random() - 0.5) * 0.002;
      const volatility = Math.random() * 0.001;

      const open = basePrice;
      const close = Math.max(0.03, basePrice + variation);
      const high = Math.max(open, close) + Math.random() * volatility;
      const low = Math.min(open, close) - Math.random() * volatility;

      const newCandle: CandlestickData = {
        time: Math.floor(Date.now() / 1000) as Time,
        open,
        high,
        low,
        close,
      };
      if (initialData.length > 0) {
        const currentTime = Math.floor(Date.now() / 1000);
        const lastCandleTime = initialData[initialData.length - 1]
          .time as number;

        if (currentTime - lastCandleTime >= 300) {
          initialData.push(newCandle);
          candlestickSeries.update(newCandle);
        } else {
          initialData[initialData.length - 1] = newCandle;
          candlestickSeries.update(newCandle);
        }
      }

      setCurrentPrice(close);
    }, 1000);

    const resizeChart = () => {
      if (chartContainerRef.current && chart) {
        chart.applyOptions({
          // width: chartContainerRef.current.clientWidth,
          // height: chartContainerRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', resizeChart);
    resizeChart();

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeChart);
      chart.remove();
    };
  }, []);

  return (
    <div className="w-[99.9%] bg-[#0a0a0a] rounded-xl overflow-hidden border border-[#1a1a1a]">
      <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-2 font-vt323">
            <span className="text-white font-bold text-xl">
              ${currentPrice.toFixed(5)}
            </span>
            <span className="text-cyan-400 text-sm font-medium font-vt323">
              +0.44%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="px-2 py-1 text-xs rounded-md transition-all" style={{
            background: 'rgb(255, 255, 255)',
            color: 'rgb(0, 0, 0)',
            border: '1px solid rgba(118, 217, 216, 0.5)',
          }}>
            1H
          </button>
          <button className="px-2 py-1 text-xs rounded-md transition-all" style={{
            background: 'rgb(255, 255, 255)',
            color: 'rgb(0, 0, 0)',
            border: '1px solid rgba(118, 217, 216, 0.5)',
          }}>
            1D
          </button>
          <button className="px-2 py-1 text-xs rounded-md transition-all" style={{
            background: 'rgb(255, 255, 255)',
            color: 'rgb(0, 0, 0)',
            border: '1px solid rgba(118, 217, 216, 0.5)',
          }}>
            1W
          </button>
          <button className="px-2 py-1 text-xs rounded-md transition-all" style={{
            background: 'rgb(255, 255, 255)',
            color: 'rgb(0, 0, 0)',
            border: '1px solid rgba(118, 217, 216, 0.5)',
          }}>
            1M
          </button>
        </div>
      </div>

      <div
        ref={chartContainerRef}
        className="w-full h-[400px] bg-neutral-900"
      />
    </div>
  );
}
