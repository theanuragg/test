'use client';
import React, { useState, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';

interface Transaction {
  id: string;
  trader: string;
  action: 'buy' | 'sell';
  solAmount: number;
  tokenAmount: string;
  timeAgo: string;
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    trader: 'JD3B...624k',
    action: 'buy',
    solAmount: 0.004,
    tokenAmount: '26,541,926',
    timeAgo: '17s',
  },
  {
    id: '2',
    trader: 'JD3B...624k',
    action: 'buy',
    solAmount: 0.73,
    tokenAmount: '21,222,355',
    timeAgo: '14m 8s',
  },
  {
    id: '3',
    trader: 'JD3B...624k',
    action: 'buy',
    solAmount: 1.027,
    tokenAmount: '29,926,271',
    timeAgo: '42m 29s',
  },
  {
    id: '4',
    trader: 'HVtK...qP7K',
    action: 'sell',
    solAmount: 0.333,
    tokenAmount: '9,915',
    timeAgo: '1h 42m',
  },
  {
    id: '5',
    trader: 'HVtK...qP7K',
    action: 'sell',
    solAmount: 0.05,
    tokenAmount: '1,500',
    timeAgo: '2h 2m',
  },
  {
    id: '6',
    trader: 'JD3B...624k',
    action: 'buy',
    solAmount: 0.93,
    tokenAmount: '27,142,222',
    timeAgo: '2h 6m',
  },
  {
    id: '7',
    trader: 'JD25...FMy',
    action: 'buy',
    solAmount: 1.068,
    tokenAmount: '31,252,568',
    timeAgo: '2h 12m',
  },
  {
    id: '8',
    trader: 'JD3B...624k',
    action: 'sell',
    solAmount: 5.186,
    tokenAmount: '154,285,714',
    timeAgo: '2h 31m',
  },
  {
    id: '9',
    trader: 'JD25...FMy',
    action: 'buy',
    solAmount: 0.754,
    tokenAmount: '22,970,444',
    timeAgo: '3h 10m',
  },
  {
    id: '10',
    trader: 'HVtK...qP7K',
    action: 'sell',
    solAmount: 0.049,
    tokenAmount: '1,465',
    timeAgo: '3h 42m',
  },
  {
    id: '11',
    trader: 'JD25...FMy',
    action: 'buy',
    solAmount: 0.889,
    tokenAmount: '26,772,635',
    timeAgo: '3h 53m',
  },
  {
    id: '12',
    trader: 'JD3B...624k',
    action: 'buy',
    solAmount: 0.359,
    tokenAmount: '27,268,055',
    timeAgo: '4h 6m',
  },
  {
    id: '13',
    trader: 'JD25...FMy',
    action: 'buy',
    solAmount: 0.752,
    tokenAmount: '21,802,843',
    timeAgo: '4h 34m',
  },
  {
    id: '14',
    trader: 'JD25...FMy',
    action: 'buy',
    solAmount: 0.83,
    tokenAmount: '24,225,21',
    timeAgo: '4h 36m',
  },
  {
    id: '15',
    trader: 'BxJg...754b',
    action: 'sell',
    solAmount: 0.014,
    tokenAmount: '447,169',
    timeAgo: '5h 45m',
  },
];

export function RealtimeTransactions() {
  const [transactions, setTransactions] = useState(mockTransactions);

  useEffect(() => {
    const interval = setInterval(() => {
      const newTransaction: Transaction = {
        id: Date.now().toString(),
        trader: `${Math.random().toString(36).substr(2, 4)}...${Math.random().toString(36).substr(2, 4)}`,
        action: Math.random() > 0.5 ? 'buy' : 'sell',
        solAmount: Math.random() * 2,
        tokenAmount: (Math.random() * 50000000).toLocaleString(),
        timeAgo: 'now',
      };

      setTransactions(prev => [newTransaction, ...prev.slice(0, 14)]);
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const formatNumber = (num: number) => {
    if (num < 0.001) return num.toFixed(6);
    if (num < 1) return num.toFixed(3);
    return num.toFixed(2);
  };

  return (
    <div className="bg-card-foreground border border-[#00ffff]/40 rounded-2xl backdrop-blur-sm overflow-hidden">
      <div className="p-4">
        <div className="grid grid-cols-5 gap-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <span>trader</span>
          <span>action</span>
          <span>SOL</span>
          <span>KUMA</span>
          <span>date</span>
        </div>
      </div>

      <div className="max-h-997 overflow-y-auto">
        {transactions.map(tx => (
          <div
            key={tx.id}
            className="grid grid-cols-5 gap-4 items-center p-4 hover:bg-muted/30 border-b border-border/30 transition-colors duration-300"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-red-600 flex items-center justify-center text-xs text-white font-medium">
                {tx.trader.slice(0, 2)}
              </div>
              <span className="text-sm font-mono">
                {tx.trader}
              </span>
            </div>

            <div>
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${
                  tx.action === 'buy'
                    ? 'bg-[#00ffff]/10 text-[#00ffff]'
                    : 'bg-red-500/10 text-red-400'
                }`}
              >
                {tx.action}
              </span>
            </div>

            <div>
              <span className="text-sm">
                {formatNumber(tx.solAmount)}
              </span>
            </div>

            <div>
              <span className="text-sm">{tx.tokenAmount}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {tx.timeAgo}
              </span>
              <button className="p-1 hover:bg-muted rounded transition-colors duration-300">
                <ExternalLink className="w-3 h-3 text-muted-foreground" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-border bg-muted/20">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">mcap </span>
              <span className="text-green-400">+9.31%</span>
            </div>
            <div>
              <span className="text-muted-foreground">24h vol </span>
              <span className="text-red-400">-4.78%</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <span className="text-muted-foreground">$7,0458M</span>
            </div>
            <div>
              <span className="text-muted-foreground">$12,494.21</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RealtimeTransactions;
