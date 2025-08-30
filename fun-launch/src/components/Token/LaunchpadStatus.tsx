import React from 'react';

interface LaunchpadStatusProps {
  progress: number;
  phase: string;
  description: string;
  tokensSold: number;
  tokensRemaining: number;
  graduationCountdown: string | null;
  isGraduated: boolean;
  currentPrice: number;
  marketCap: number;
}

export default function LaunchpadStatus({
  progress,
  phase,
  description,
  tokensSold,
  tokensRemaining,
  graduationCountdown,
  isGraduated,
  currentPrice,
  marketCap,
}: LaunchpadStatusProps) {
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toLocaleString();
  };

  const getPhaseColor = () => {
    switch (phase.toLowerCase()) {
      case 'launching':
        return 'text-blue-400';
      case 'graduating':
        return 'text-yellow-400';
      case 'graduated':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getPhaseBgColor = () => {
    switch (phase.toLowerCase()) {
      case 'launching':
        return 'bg-blue-500/10 border-blue-500/30';
      case 'graduating':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'graduated':
        return 'bg-green-500/10 border-green-500/30';
      default:
        return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <div className={`rounded-xl p-6 backdrop-blur-sm border ${getPhaseBgColor()}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-white">🚀 Launchpad Status</h3>
          <p className={`text-sm font-semibold ${getPhaseColor()}`}>
            {phase.toUpperCase()}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">
            {progress.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-400">Progress</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-gray-300 text-sm mb-6">{description}</p>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>0%</span>
          <span>75%</span>
          <span>95%</span>
          <span>100%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>Launching</span>
          <span>Graduating</span>
          <span>Graduated</span>
        </div>
      </div>

      {/* Token Statistics */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-black/20 rounded-lg p-3">
          <div className="text-sm text-gray-400">Tokens Sold</div>
          <div className="text-lg font-bold text-white">
            {formatNumber(tokensSold)}
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <div className="text-sm text-gray-400">Tokens Remaining</div>
          <div className="text-lg font-bold text-white">
            {formatNumber(tokensRemaining)}
          </div>
        </div>
      </div>

      {/* Price Information */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-black/20 rounded-lg p-3">
          <div className="text-sm text-gray-400">Current Price</div>
          <div className="text-lg font-bold text-white">
            ${currentPrice.toFixed(8)}
          </div>
        </div>
        <div className="bg-black/20 rounded-lg p-3">
          <div className="text-sm text-gray-400">Market Cap</div>
          <div className="text-lg font-bold text-white">
            {isGraduated ? `$${formatNumber(marketCap)}` : 'Hidden'}
          </div>
        </div>
      </div>

      {/* Graduation Countdown */}
      {graduationCountdown && (
        <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 rounded-lg p-4 text-center">
          <div className="text-yellow-400 font-bold text-lg">
            ⏰ {graduationCountdown}
          </div>
          <div className="text-yellow-300 text-sm mt-1">
            Token will graduate to full trading soon!
          </div>
        </div>
      )}

      {/* Graduated Status */}
      {isGraduated && (
        <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4 text-center">
          <div className="text-green-400 font-bold text-lg">
            ✅ Token Graduated!
          </div>
          <div className="text-green-300 text-sm mt-1">
            Now trading on Meteora DEX with full market cap visibility
          </div>
        </div>
      )}

      {/* Launching Benefits */}
      {!isGraduated && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="text-blue-400 font-semibold mb-2">
            🎯 Early Bird Benefits
          </div>
          <ul className="text-blue-300 text-sm space-y-1">
            <li>• Best prices during launch phase</li>
            <li>• No slippage on early purchases</li>
            <li>• Automatic graduation to full trading</li>
            <li>• Market cap revealed after graduation</li>
          </ul>
        </div>
      )}
    </div>
  );
}
