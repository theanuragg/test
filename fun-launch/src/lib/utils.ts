import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Compiler would throw an error if a switch-case is not exhaustive.
 * @see {@link https://www.typescriptlang.org/docs/handbook/unions-and-intersections.html#union-exhaustiveness-checking Unions and Intersection Types}
 */
export function assertNever(_arg: never, message = 'Unknown error occured.'): never {
  throw new Error(message);
}

export const getBaseUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return `http://localhost:3000`;
  } else {
    let url = process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL;

    if (url?.includes('vercel.app')) {
      url = `https://${process.env.NEXT_PUBLIC_VERCEL_BRANCH_URL}`;
    } else {
      url = `https://jup.ag`;
    }

    return typeof window === 'undefined' ? url : window.location.origin;
  }
};

/**
 * Serialize value to string
 */
export function serializeValue(value: unknown): string {
  // String
  if (typeof value === 'string') {
    return value;
  }
  // Boolean
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  // Number
  if (typeof value === 'number') {
    return value.toString();
  }
  // BigInt
  if (typeof value === 'bigint') {
    return value.toString();
  }
  // Date
  if (value instanceof Date) {
    return value.toISOString();
  }
  // Array, join with comma delimiter
  if (Array.isArray(value)) {
    return value.map((v) => serializeValue(v)).join(',');
  }
  throw new Error(`Cannot serialize value: ${value}`);
}

/**
 * Serialize params to a new object with all values serialized to strings.
 */
export function serializeParams(params: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(params)
      .filter(([, v]) => v !== undefined) // Remove undefined values
      .map(([k, v]) => [k, serializeValue(v)])
  );
}

/**
 * Utility Functions
 * 
 * Common helper functions used throughout the application
 */

/**
 * Shorten a Solana address for display
 */
export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/**
 * Format a number with commas
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format a currency value
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

/**
 * Format a percentage
 */
export function formatPercentage(value: number, decimals = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatLargeNumber(num: number): string {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(1) + 'B';
  }
  if (num >= 1e6) {
    return (num / 1e6).toFixed(1) + 'M';
  }
  if (num >= 1e3) {
    return (num / 1e3).toFixed(1) + 'K';
  }
  return num.toString();
}

/**
 * Convert a number to a specific decimal precision
 */
export function toFixed(num: number, decimals: number): string {
  return num.toFixed(decimals);
}

/**
 * Sleep for a specified number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Delay for a specified number of milliseconds (alias for sleep)
 */
export function delay(ms: number): Promise<void> {
  return sleep(ms);
}

/**
 * Debounce a function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle a function
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Generate a random string
 */
export function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate Solana address format
 */
export function isValidSolanaAddress(address: string): boolean {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

/**
 * Get time ago from timestamp
 */
export function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

/**
 * Format date
 */
export function formatDate(date: Date | number): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date and time
 */
export function formatDateTime(date: Date | number): string {
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
