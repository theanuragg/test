/**
 * Market Cap Formatting Utilities
 * 
 * Safe formatting functions for market cap and financial data
 */

/**
 * Safely format market cap value with NaN protection
 */
export function formatMarketCap(marketCap: number | undefined | null): string {
  // Check for valid number
  if (!marketCap || isNaN(marketCap) || marketCap <= 0) {
    return '$0';
  }

  // Format with proper localization
  try {
    return `$${marketCap.toLocaleString()}`;
  } catch (error) {
    console.warn('Error formatting market cap:', error);
    return '$0';
  }
}

/**
 * Calculate market cap from price and supply
 */
export function calculateMarketCap(
  price: number | undefined | null, 
  totalSupply: number = 1000000000 // Default 1B tokens
): number {
  if (!price || isNaN(price) || price <= 0) {
    return 0;
  }

  if (!totalSupply || isNaN(totalSupply) || totalSupply <= 0) {
    return 0;
  }

  const marketCap = price * totalSupply;
  
  // Validate result
  if (isNaN(marketCap) || marketCap <= 0) {
    return 0;
  }

  return marketCap;
}

/**
 * Format price with proper decimal places
 */
export function formatPrice(price: number | undefined | null, decimals: number = 6): string {
  if (!price || isNaN(price) || price <= 0) {
    return '$0.000000';
  }

  try {
    return `$${price.toFixed(decimals)}`;
  } catch (error) {
    console.warn('Error formatting price:', error);
    return '$0.000000';
  }
}

/**
 * Format percentage change with proper sign
 */
export function formatPercentageChange(change: number | undefined | null): string {
  if (!change || isNaN(change)) {
    return '0.00%';
  }

  try {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
  } catch (error) {
    console.warn('Error formatting percentage change:', error);
    return '0.00%';
  }
}

/**
 * Format volume with proper formatting
 */
export function formatVolume(volume: number | undefined | null): string {
  if (!volume || isNaN(volume) || volume <= 0) {
    return '$0';
  }

  try {
    return `$${volume.toLocaleString()}`;
  } catch (error) {
    console.warn('Error formatting volume:', error);
    return '$0';
  }
}

/**
 * Safely get market cap from price data or bonding curve data
 */
export function getSafeMarketCap(
  priceData?: { marketCap?: number } | null,
  bondingCurveData?: { currentPrice?: number } | null,
  totalSupply: number = 1000000000
): number {
  // Try price data first
  if (priceData?.marketCap && !isNaN(priceData.marketCap) && priceData.marketCap > 0) {
    return priceData.marketCap;
  }

  // Fallback to calculating from bonding curve
  if (bondingCurveData?.currentPrice) {
    return calculateMarketCap(bondingCurveData.currentPrice, totalSupply);
  }

  return 0;
}
