/**
 * Metrics Grid Component
 * 
 * Displays key token metrics in a grid layout
 */

import React from 'react';

interface Metric {
  title: string;
  value: string;
  change?: number | null;
  prefix?: string;
  suffix?: string;
}

interface MetricsGridProps {
  metrics: Metric[];
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric, index) => (
        <MetricCard key={index} {...metric} />
      ))}
    </div>
  );
}

interface MetricCardProps extends Metric {}

function MetricCard({ title, value, change, prefix, suffix }: MetricCardProps) {
  const isPositive = change && change >= 0;
  const hasChange = change !== null && change !== undefined;

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium text-gray-400">{title}</h3>
        {hasChange && (
          <div className={`flex items-center space-x-1 text-xs ${
            isPositive ? 'text-green-400' : 'text-red-400'
          }`}>
            <svg 
              className={`w-3 h-3 ${isPositive ? 'rotate-0' : 'rotate-180'}`} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path fillRule="evenodd" d="M5.293 7.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L6.707 7.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            <span>{Math.abs(change).toFixed(2)}%</span>
          </div>
        )}
      </div>
      
      <div className="text-2xl font-bold text-white">
        {prefix && <span className="text-gray-400">{prefix}</span>}
        {value}
        {suffix && <span className="text-gray-400 text-lg">{suffix}</span>}
      </div>
    </div>
  );
}
