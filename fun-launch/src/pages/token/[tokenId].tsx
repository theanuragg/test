/**
 * Token Detail Page
 * 
 * Comprehensive token detail page with price charts, market data, and trading interface
 */

import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useWallet } from '@jup-ag/wallet-adapter';
// import { useTokenData, usePriceHistory, useSwapQuote } from '../../hooks/useJupiterAPI'; // COMMENTED OUT - Jupiter APIs causing issues
// import { useHeliusTokenData } from '../../hooks/useHeliusIndexing'; // COMMENTED OUT - EventEmitter issues in Next.js
import { toast } from 'react-hot-toast';
// import { useDbcPoolDataByToken } from '../../hooks/useDbcPool'; // REMOVED - Not used
// import { TokenHeader } from '../../components/Token/TokenHeader'; // COMMENTED OUT - Jupiter dependencies
// import { PriceChart } from '../../components/Token/PriceChart'; // COMMENTED OUT - Jupiter dependencies
import { MetricsGrid } from '../../components/Token/MetricsGrid';
// import { TradingInterface } from '../../components/Token/TradingInterface'; // COMMENTED OUT - Jupiter dependencies
// import { TokenInfo } from '../../components/Token/TokenInfo'; // COMMENTED OUT - Jupiter dependencies  
// import { CreatorActions } from '../../components/Token/CreatorActions'; // COMMENTED OUT - Jupiter dependencies
import { BondingCurveProgress } from '../../components/Token/BondingCurveProgress';
import { MigrationStatus } from '../../components/Token/MigrationStatus';
import LaunchpadStatus from '../../components/Token/LaunchpadStatus';
import DbcSwapInterface from '../../components/Token/DbcSwapInterface';

export default function TokenDetailPage() {
  const router = useRouter();
  const { tokenId } = router.query;
  const { publicKey } = useWallet();
  
  const [timeframe, setTimeframe] = useState<'4H' | '1D' | '1W' | '1M' | 'All'>('1D');
  
  // Convert tokenId to string safely
  const tokenIdString = Array.isArray(tokenId) ? tokenId[0] : tokenId;
  
  // Use our working token-info API with proper loading management
  const [heliusData, setHeliusData] = useState<any>(null);
  const [heliusLoading, setHeliusLoading] = useState(true); // Start with true
  const [heliusError, setHeliusError] = useState<string | null>(null);
  
  // Disable auto-refresh DBC data to prevent infinite loading
  const [dbcData, setDbcData] = useState<any>(null);
  const [dbcLoading, setDbcLoading] = useState(false);
  const [dbcError, setDbcError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!tokenIdString) {
      setHeliusLoading(false);
      return;
    }
    
    console.log('🚀 Fetching token metadata for:', tokenIdString);
    setHeliusLoading(true);
    setHeliusError(null);
    
    // Add small delay to prevent rapid API calls
    const timer = setTimeout(() => {
      fetch('/api/token-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mintAddress: tokenIdString }),
      })
      .then(async (response) => {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Token metadata loaded:', data.tokenInfo);
          setHeliusData({
            metadata: {
              name: data.tokenInfo?.name,
              symbol: data.tokenInfo?.symbol,
              decimals: data.tokenInfo?.decimals,
              image: data.tokenInfo?.imageUrl,
              description: data.tokenInfo?.description,
              external_url: null,
            },
            tokenInfo: data.tokenInfo // Store the full token info
          });
        } else {
          throw new Error(data.error || 'Failed to fetch token info');
        }
      })
      .catch((error) => {
        console.error('❌ Token info fetch error:', error);
        setHeliusError(error.message);
      })
      .finally(() => {
        setHeliusLoading(false);
      });
    }, 100);

    return () => clearTimeout(timer);
  }, [tokenIdString]);
  
  // Fetch real DBC pool data
  useEffect(() => {
    if (!tokenIdString) return;
    
    console.log('🔍 Fetching real DBC pool data for:', tokenIdString);
    setDbcLoading(true);
    setDbcError(null);
    
    fetch('/api/dbc/pool-by-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tokenMint: tokenIdString }),
    })
    .then(async (response) => {
      const data = await response.json();
      if (data.success) {
        console.log('✅ Real DBC pool data loaded:', data.poolData);
        setDbcData(data.poolData);
      } else {
        console.warn('⚠️ No DBC pool found for token:', tokenIdString);
        // Set fallback data if no pool found
        setDbcData({
          poolAddress: 'No pool found',
          progress: 0,
          marketCap: 0,
          currentPrice: 0,
          volume24h: 0,
          migrationStatus: 'no-pool',
          isMigrated: 0,
          migrationProgress: 0,
          accumulatedFees: 0,
        });
      }
    })
    .catch((error) => {
      console.error('❌ DBC pool fetch error:', error);
      setDbcError(error.message);
      // Set fallback data on error
      setDbcData({
        poolAddress: 'Error loading pool',
        progress: 0,
        marketCap: 0,
        currentPrice: 0,
        volume24h: 0,
        migrationStatus: 'error',
        isMigrated: 0,
        migrationProgress: 0,
        accumulatedFees: 0,
      });
    })
    .finally(() => {
      setDbcLoading(false);
    });
  }, [tokenIdString]);
  
  // Debug logging to track re-renders (limited frequency)
  const renderCount = useMemo(() => Math.random(), [tokenIdString, heliusLoading, dbcLoading]);
  console.log('🔄 Token page render:', {
    tokenId: tokenIdString,
    heliusLoading,
    dbcLoading,
    hasHeliusData: !!heliusData,
    hasDbcData: !!dbcData,
    renderTime: new Date().toLocaleTimeString(),
    renderKey: renderCount.toString().slice(-4),
  });
  
  // Debug logging
  console.log('🔍 Token Page Debug:', {
    tokenId,
    heliusData: !!heliusData,
    heliusLoading,
    heliusError,
    dbcData: !!dbcData,
    dbcLoading,
    dbcError,
    heliusMetadata: heliusData?.metadata,
    dbcPool: dbcData?.poolAddress,
  });

  // MEMOIZED token data structure to prevent infinite re-renders
  const tokenData = useMemo(() => {
    // Only create if we have at least some data
    if (!heliusData && !dbcData) return null;

    return {
      price: {
        id: tokenIdString || '',
        price: dbcData?.currentPrice || 0,
        marketCap: dbcData?.marketCap || 0,
        priceChange24h: 0,
        priceChange7d: 0,
        volume24h: dbcData?.volume24h || 0,
        mintSymbol: heliusData?.metadata?.symbol || 'TOKEN',
        vsToken: 'USDC',
        vsTokenSymbol: 'USDC',
      },
      info: {
        address: tokenIdString || '',
        name: heliusData?.metadata?.name || `Token ${tokenIdString ? tokenIdString.slice(0, 8) : 'Loading'}...`,
        symbol: heliusData?.metadata?.symbol || 'TOKEN',
        decimals: heliusData?.metadata?.decimals || 9,
        logoURI: heliusData?.metadata?.image || '/coins/unknown.svg',
        description: heliusData?.metadata?.description || 'Token on Meteora Dynamic Bonding Curve',
        chainId: 103, // Devnet
        tags: ['DBC', 'Meteora'] as string[],
        extensions: {
          website: heliusData?.metadata?.external_url,
        },
      },
      isVerified: false,
    };
  }, [tokenIdString, heliusData, dbcData]); // Only update when these change
  
  const priceHistory: any[] = []; // Using empty array for now - charts will show "No data"
  const quote: any = null; // Explicitly typed as any
  const quoteLoading = false;
  const historyLoading = false;
  const tokenLoading = heliusLoading || dbcLoading;
  const tokenError = heliusError || dbcError;

  // NOW check for tokenId after all hooks are called
  if (!tokenId) {
    return (
      <div className="min-h-screen bg-gradient-to-b text-white flex items-center justify-center">
        <div className="bg-white/5 rounded-xl p-6 max-w-md text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Token...</h2>
          <p className="text-gray-300 text-sm">Waiting for URL parameters...</p>
        </div>
      </div>
    );
  }

  // Loading state - show loading while fetching initial data
  if (heliusLoading || dbcLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b text-white flex items-center justify-center">
        <div className="bg-white/5 rounded-xl p-8 max-w-md text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold mb-2">Loading Token Data</h2>
          <div className="space-y-1 text-sm text-gray-400">
            <div>Token ID: {typeof tokenId === 'string' ? tokenId.slice(0, 12) + '...' : 'Loading'}</div>
            <div>Metadata: {heliusLoading ? '⏳ Loading...' : '✅ Ready'}</div>
            <div>Pool Data: {dbcLoading ? '⏳ Loading...' : '✅ Ready'}</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (tokenError || dbcError) {
    return (
      <div className="min-h-screen bg-gradient-to-b text-white flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 max-w-md">
          <h2 className="text-xl font-semibold text-red-200 mb-2">Error Loading Token</h2>
          <p className="text-red-300 text-sm">
            {tokenError || dbcError || 'Failed to load token data'}
          </p>
          <button
            onClick={() => router.back()}
            className="mt-4 bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg text-sm transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // No data state - only show if we have NO data at all
  if (!tokenData && !heliusData && !dbcData && !tokenLoading && !dbcLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b text-white flex items-center justify-center">
        <div className="bg-white/5 rounded-xl p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Token Not Found</h2>
          <p className="text-gray-300 text-sm mb-4">
            The token you&apos;re looking for doesn&apos;t exist or hasn&apos;t been launched yet.
          </p>
          <div className="space-y-2 text-xs text-gray-500 mb-4">
            <div>Token ID: {tokenId}</div>
            <div>Helius Data: {heliusData ? '✅' : '❌'}</div>
            <div>DBC Data: {dbcData ? '✅' : '❌'}</div>
            <div>Helius Error: {heliusError || 'None'}</div>
            <div>DBC Error: {dbcError || 'None'}</div>
          </div>
          <button
            onClick={() => router.push('/explore-pools')}
            className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 px-4 py-2 rounded-lg text-sm transition"
          >
            Explore Tokens
          </button>
        </div>
      </div>
    );
  }

  const price = tokenData?.price;
  const info = tokenData?.info;
  const isVerified = tokenData?.isVerified || false;
  const progress = dbcData?.progress || 0;
  const isMigrated = dbcData?.isMigrated || 0;
  const migrationProgress = dbcData?.migrationProgress || 0;
  const accumulatedFees = dbcData?.accumulatedFees;

  return (
    <>
      <Head>
        <title>{info?.name || 'Token'} - Fun Launch</title>
        <meta name="description" content={`${info?.name} token details, price, and trading`} />
      </Head>

      <div className="min-h-screen bg-gradient-to-b text-white">
        {/* Header */}
        <header className="border-b border-white/10 bg-white/5 backdrop-blur-sm">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="flex items-center text-gray-300 hover:text-white transition"
              >
                <span className="iconify ph--arrow-left w-5 h-5 mr-2" />
                Back
              </button>
              
              <div className="flex items-center space-x-4">
                <a
                  href="https://playbook.com"
                  className="text-gray-300 hover:text-white transition"
                >
                  Playbook
                </a>
                {publicKey ? (
                  <span className="text-sm text-gray-400">
                    {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                  </span>
                ) : (
                  <button className="bg-gradient-to-r from-pink-500 to-purple-500 hover:opacity-90 px-4 py-2 rounded-lg text-sm transition">
                    Login
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Token Header - Simplified */}
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center overflow-hidden">
                    {heliusData?.tokenInfo?.imageUrl ? (
                      <img 
                        src={heliusData.tokenInfo.imageUrl} 
                        alt={heliusData.tokenInfo.name || 'Token Logo'} 
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const parent = target.parentElement;
                          if (parent) {
                            parent.innerHTML = `<span class="text-white font-bold text-xl">${heliusData?.tokenInfo?.symbol?.charAt(0) || 'T'}</span>`;
                          }
                        }}
                      />
                    ) : (
                      <span className="text-white font-bold text-xl">
                        {heliusData?.tokenInfo?.symbol?.charAt(0) || 'T'}
                      </span>
                    )}
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-white">
                      {heliusData?.tokenInfo?.name || 'Loading Token...'}
                    </h1>
                    <p className="text-gray-400">
                      ${heliusData?.tokenInfo?.symbol || 'TOKEN'} • Meteora DBC
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">
                    ${tokenData?.price?.price?.toFixed(6) || '0.000000'}
                  </div>
                  <div className="text-gray-400 text-sm">
                    Market Cap: ${tokenData?.price?.marketCap?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
            </div>

            {/* Price Chart Placeholder */}
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Price Chart</h2>
                <div className="text-gray-400 text-sm">Jupiter APIs temporarily disabled</div>
              </div>
              <div className="h-64 bg-black/20 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-gray-400 mb-2">📊 Chart Coming Soon</div>
                  <div className="text-gray-500 text-sm">Price history will be available after Jupiter integration fix</div>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <MetricsGrid
              metrics={[
                {
                  title: 'Market Cap',
                  value: price?.marketCap ? `$${price.marketCap.toLocaleString()}` : '$0',
                  change: price?.priceChange24h,
                },
                {
                  title: 'Price',
                  value: price?.price ? `$${price.price.toFixed(6)}` : 'N/A',
                  change: price?.priceChange24h,
                },
                {
                  title: 'Creator Fees',
                  value: (dbcData?.accumulatedFees && typeof dbcData.accumulatedFees === 'number') ? `$${(dbcData.accumulatedFees / 1e6).toFixed(1)}K` : '$0',
                  change: null,
                },
                {
                  title: '24h Volume',
                  value: price?.volume24h ? `$${price.volume24h.toLocaleString()}` : '$0',
                  change: null,
                },
              ]}
            />

            {/* Launchpad Status */}
            {dbcData && (
              <LaunchpadStatus
                progress={dbcData.launchpadProgress || 0}
                phase={dbcData.launchpadPhase || 'Launching'}
                description={dbcData.launchpadDescription || 'Token is in presale phase'}
                tokensSold={dbcData.tokensSold || 0}
                tokensRemaining={dbcData.tokensRemaining || 0}
                graduationCountdown={dbcData.graduationCountdown}
                isGraduated={dbcData.isGraduated || false}
                currentPrice={dbcData.currentPrice || 0}
                marketCap={dbcData.marketCap || 0}
              />
            )}

            {/* Bonding Curve Progress & Migration Status */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <BondingCurveProgress 
                progress={progress}
                isMigrated={isMigrated}
                migrationProgress={migrationProgress}
              />
              
              <MigrationStatus
                isMigrated={isMigrated}
                migrationProgress={migrationProgress}
                accumulatedFees={accumulatedFees}
                tokenMint={tokenId as string}
              />
            </div>

            {/* DBC Swap Interface */}
            {publicKey && dbcData?.poolAddress && (
              <DbcSwapInterface
                poolAddress={dbcData.poolAddress}
                baseMint={dbcData.baseMint || tokenIdString}
                quoteMint={dbcData.quoteMint || 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'} // Devnet USDC
                tokenName={tokenData?.info?.name || 'Unknown Token'}
                tokenSymbol={tokenData?.info?.symbol || 'UNKNOWN'}
              />
            )}

            {/* Legacy Trading Interface - DISABLED */}
            {publicKey && false && (
              <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold mb-2">Legacy Trading Interface</h3>
                  <p className="text-gray-400 text-sm">
                    Legacy trading interface disabled. Use DBC Swap Interface above.
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    DBC pool address: {dbcData?.poolAddress}
                  </p>
                </div>
              </div>
            )}

            {/* Token Information */}
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              <h3 className="text-xl font-semibold mb-4">Token Information</h3>
              
              {tokenData ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-medium text-white mb-2">Basic Details</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Name:</span>
                          <span className="text-white font-medium">{tokenData.info.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Symbol:</span>
                          <span className="text-white font-medium">{tokenData.info.symbol}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Decimals:</span>
                          <span className="text-white">{tokenData.info.decimals}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Mint Address:</span>
                          <span className="text-white font-mono text-xs">{(tokenId as string).slice(0, 12)}...</span>
                        </div>
                      </div>
                    </div>
                    
                    {tokenData.info.description && (
                      <div>
                        <h4 className="text-lg font-medium text-white mb-2">Description</h4>
                        <p className="text-gray-300 text-sm">{tokenData.info.description}</p>
                      </div>
                    )}
                  </div>

                  {/* Market Data */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-lg font-medium text-white mb-2">Market Data</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Current Price:</span>
                          <span className="text-white">${tokenData.price.price.toFixed(6)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Market Cap:</span>
                          <span className="text-white">${tokenData.price.marketCap.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">24h Volume:</span>
                          <span className="text-white">${tokenData.price.volume24h.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Data Source:</span>
                          <span className="text-green-400">Helius + DBC</span>
                        </div>
                      </div>
                    </div>
                    
                    {dbcData && (
                      <div>
                        <h4 className="text-lg font-medium text-white mb-2">DBC Pool Info</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pool Progress:</span>
                            <span className="text-white">{dbcData.progress || 0}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Migration Status:</span>
                            <span className="text-white capitalize">{dbcData.migrationStatus || 'Active'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Pool Address:</span>
                            <span className="text-white font-mono text-xs">{dbcData.poolAddress?.slice(0, 12)}...</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400">Loading token information...</p>
                </div>
              )}
            </div>

            {/* Add Liquidity Button - Show if market cap is 0 */}
            {dbcData?.marketCap === 0 && publicKey && (
              <div className="bg-green-500/10 rounded-xl p-6 backdrop-blur-sm border border-green-500/20 mb-6">
                <h3 className="text-lg font-semibold mb-4 text-green-200">💰 Add Initial Liquidity</h3>
                <p className="text-green-300 text-sm mb-4">
                  Your pool needs initial USDC liquidity to achieve the target market cap of $5000.
                </p>
                <a
                  href="/add-liquidity"
                  className="inline-block bg-gradient-to-r from-green-500 to-blue-500 hover:opacity-90 px-6 py-3 rounded-lg font-semibold text-white transition"
                >
                  Add $5000 USDC Liquidity
                </a>
              </div>
            )}

            {/* Debug Information - Show what data we have */}
            <div className="bg-yellow-500/10 rounded-xl p-6 backdrop-blur-sm border border-yellow-500/20">
              <h3 className="text-lg font-semibold mb-4 text-yellow-200">🔍 Debug Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-yellow-300 mb-2">Helius Data:</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li>✅ Loading: {heliusLoading ? 'Yes' : 'No'}</li>
                    <li>❌ Error: {heliusError || 'None'}</li>
                    <li>📊 Has Data: {heliusData ? 'Yes' : 'No'}</li>
                    <li>📝 Metadata Name: {heliusData?.metadata?.name || 'N/A'}</li>
                    <li>🏷️ Metadata Symbol: {heliusData?.metadata?.symbol || 'N/A'}</li>
                    <li>🖼️ Has Image: {heliusData?.metadata?.image ? 'Yes' : 'No'}</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold text-yellow-300 mb-2">DBC Pool Data:</h4>
                  <ul className="space-y-1 text-gray-300">
                    <li>✅ Loading: {dbcLoading ? 'Yes' : 'No'}</li>
                    <li>❌ Error: {dbcError || 'None'}</li>
                    <li>🏊 Pool Address: {dbcData?.poolAddress?.slice(0, 12) || 'N/A'}...</li>
                    <li>📈 Progress: {dbcData?.progress || 0}%</li>
                    <li>💰 Market Cap: ${dbcData?.marketCap || 0}</li>
                    <li>🔄 Migration Status: {dbcData?.migrationStatus || 'N/A'}</li>
                  </ul>
                </div>
              </div>

              <div className="mt-4 p-3 bg-black/20 rounded border border-yellow-500/30">
                <h5 className="text-yellow-300 font-semibold mb-2">Token ID: {tokenId}</h5>
                <p className="text-xs text-gray-400 font-mono break-all">{tokenId}</p>
              </div>
            </div>

            {/* Creator Actions - TEMPORARILY DISABLED */}
            {publicKey && info?.extensions?.website && false && (
              <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold mb-2">Creator Actions</h3>
                  <p className="text-gray-400 text-sm">
                    Creator actions temporarily disabled while fixing Jupiter API integration.
                  </p>
                </div>
              </div>
            )}

            {/* Attribution */}
            <div className="text-center text-gray-400 text-sm">
              <p>
                Powered by{' '}
                <a
                  href="https://helius.xyz"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300 transition"
                >
                  Helius
                </a>
                {' '}enhanced indexing and{' '}
                <a
                  href="https://meteora.ag"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 transition"
                >
                  Meteora
                </a>
                {' '}Dynamic Bonding Curves
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
