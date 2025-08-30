export interface LaunchpadConfig {
  // Launch phases
  phases: {
    launching: {
      minProgress: number; // 0%
      maxProgress: number; // 75%
      status: 'Launching';
      description: 'Token is in presale phase';
    };
    graduating: {
      minProgress: number; // 75%
      maxProgress: number; // 95%
      status: 'Graduating';
      description: 'Token is about to graduate to full trading';
    };
    graduated: {
      minProgress: number; // 95%
      maxProgress: number; // 100%
      status: 'Graduated';
      description: 'Token has graduated to full trading';
    };
  };
  
  // Bonding curve settings
  bondingCurve: {
    initialSupply: number; // 1,000,000,000 tokens
    reservedTokens: number; // 206,900,000 tokens (for team/liquidity)
    availableForSale: number; // 793,100,000 tokens
    graduationThreshold: number; // 95% of available tokens sold
  };
  
  // Display settings
  display: {
    showLaunchProgress: boolean;
    showGraduationCountdown: boolean;
    showMarketCapBeforeGraduation: boolean;
  };
}

export const DEFAULT_LAUNCHPAD_CONFIG: LaunchpadConfig = {
  phases: {
    launching: {
      minProgress: 0,
      maxProgress: 75,
      status: 'Launching',
      description: 'Token is in presale phase - early buyers get best prices!',
    },
    graduating: {
      minProgress: 75,
      maxProgress: 95,
      status: 'Graduating',
      description: 'Token is about to graduate to full trading!',
    },
    graduated: {
      minProgress: 95,
      maxProgress: 100,
      status: 'Graduated',
      description: 'Token has graduated to full trading on Meteora DEX',
    },
  },
  
  bondingCurve: {
    initialSupply: 1000000000, // 1 billion tokens
    reservedTokens: 206900000, // ~207M reserved
    availableForSale: 793100000, // ~793M available for sale
    graduationThreshold: 95, // 95% of available tokens
  },
  
  display: {
    showLaunchProgress: true,
    showGraduationCountdown: true,
    showMarketCapBeforeGraduation: false, // Hide market cap during launch
  },
};

// Calculate bonding curve progress
export function calculateBondingCurveProgress(
  currentBaseReserve: number,
  config: LaunchpadConfig = DEFAULT_LAUNCHPAD_CONFIG
): number {
  const { availableForSale, reservedTokens } = config.bondingCurve;
  
  // Formula: 100 - ((leftTokens * 100) / availableForSale)
  // leftTokens = currentBaseReserve - reservedTokens
  const leftTokens = currentBaseReserve - reservedTokens;
  const progress = 100 - ((leftTokens * 100) / availableForSale);
  
  return Math.max(0, Math.min(100, progress));
}

// Get current launch phase
export function getLaunchPhase(
  progress: number,
  config: LaunchpadConfig = DEFAULT_LAUNCHPAD_CONFIG
) {
  const { phases } = config;
  
  if (progress >= phases.graduated.minProgress) {
    return phases.graduated;
  } else if (progress >= phases.graduating.minProgress) {
    return phases.graduating;
  } else {
    return phases.launching;
  }
}

// Calculate tokens sold
export function calculateTokensSold(
  currentBaseReserve: number,
  config: LaunchpadConfig = DEFAULT_LAUNCHPAD_CONFIG
): number {
  const { availableForSale, reservedTokens } = config.bondingCurve;
  const leftTokens = Math.max(0, currentBaseReserve - reservedTokens);
  return availableForSale - leftTokens;
}

// Calculate tokens remaining
export function calculateTokensRemaining(
  currentBaseReserve: number,
  config: LaunchpadConfig = DEFAULT_LAUNCHPAD_CONFIG
): number {
  const { availableForSale } = config.bondingCurve;
  const tokensSold = calculateTokensSold(currentBaseReserve, config);
  return availableForSale - tokensSold;
}

// Format progress for display
export function formatProgress(progress: number): string {
  return `${progress.toFixed(2)}%`;
}

// Get graduation countdown (if applicable)
export function getGraduationCountdown(
  progress: number,
  config: LaunchpadConfig = DEFAULT_LAUNCHPAD_CONFIG
): string | null {
  const { graduationThreshold } = config.bondingCurve;
  
  if (progress >= graduationThreshold) {
    return 'Graduated!';
  }
  
  const remainingProgress = graduationThreshold - progress;
  if (remainingProgress <= 5) {
    return `Graduating in ${remainingProgress.toFixed(1)}%`;
  }
  
  return null;
}
