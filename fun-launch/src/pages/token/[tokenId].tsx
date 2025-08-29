/**
 * Token Detail Page
 * 
 * Comprehensive token detail page with price charts, market data, and trading interface
 */

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useWallet } from '@jup-ag/wallet-adapter';
import { useTokenData, usePriceHistory, useSwapQuote } from '../../hooks/useJupiterAPI';
import { useDbcPoolDataByToken } from '../../hooks/useDbcPool';
import { TokenHeader } from '../../components/Token/TokenHeader';
import { PriceChart } from '../../components/Token/PriceChart';
import { MetricsGrid } from '../../components/Token/MetricsGrid';
import { TradingInterface } from '../../components/Token/TradingInterface';
import { TokenInfo } from '../../components/Token/TokenInfo';
import { CreatorActions } from '../../components/Token/CreatorActions';
import { BondingCurveProgress } from '../../components/Token/BondingCurveProgress';
import { MigrationStatus } from '../../components/Token/MigrationStatus';

export default function TokenDetailPage() {
  const router = useRouter();
  const { tokenId } = router.query;
  const { publicKey } = useWallet();
  
  const [timeframe, setTimeframe] = useState<'4H' | '1D' | '1W' | '1M' | 'All'>('1D');
  
  // Fetch token data
  const { data: tokenData, loading: tokenLoading, error: tokenError } = useTokenData(tokenId as string);
  const { data: dbcData, loading: dbcLoading, error: dbcError } = useDbcPoolDataByToken(tokenId as string);
  const { history: priceHistory, loading: historyLoading } = usePriceHistory(tokenId as string, 7);
  const { quote, loading: quoteLoading, getQuote } = useSwapQuote();

  // Loading state
  if (tokenLoading || dbcLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
        <span className="ml-3 text-gray-300">Loading token data...</span>
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

  // No data state
  if (!tokenData || !dbcData) {
    return (
      <div className="min-h-screen bg-gradient-to-b text-white flex items-center justify-center">
        <div className="bg-white/5 rounded-xl p-6 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Token Not Found</h2>
          <p className="text-gray-300 text-sm mb-4">
            The token you&apos;re looking for doesn&apos;t exist or hasn&apos;t been launched yet.
          </p>
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

  const { price, info, isVerified } = tokenData;
  const { progress, isMigrated, migrationProgress, accumulatedFees } = dbcData;

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
            
            {/* Token Header */}
            <TokenHeader 
              token={info}
              price={price}
              isVerified={isVerified}
              onMenuClick={() => {/* Handle menu */}}
            />

            {/* Price Chart */}
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              <PriceChart
                data={priceHistory}
                loading={historyLoading}
                timeframe={timeframe}
                onTimeframeChange={setTimeframe}
                priceChange={price?.priceChange24h}
              />
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
                  value: accumulatedFees ? `$${(accumulatedFees / 1e6).toFixed(1)}K` : '$0',
                  change: null,
                },
                {
                  title: '24h Volume',
                  value: price?.volume24h ? `$${price.volume24h.toLocaleString()}` : '$0',
                  change: null,
                },
              ]}
            />

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

            {/* Trading Interface */}
            {publicKey && (
              <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
                <TradingInterface
                  tokenMint={tokenId as string}
                  tokenInfo={info}
                  price={price}
                  quote={quote}
                  loading={quoteLoading}
                  onGetQuote={(p: any) => getQuote({ ...p, poolAddress: dbcData?.poolAddress })}
                />
              </div>
            )}

            {/* Token Information */}
            <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
              <TokenInfo 
                token={info}
                price={price}
                dbcData={dbcData}
              />
            </div>

            {/* Creator Actions */}
            {publicKey && info?.extensions?.website && (
              <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
                <CreatorActions
                  tokenMint={tokenId as string}
                  tokenInfo={info}
                  dbcData={dbcData}
                />
              </div>
            )}

            {/* Jupiter Attribution */}
            <div className="text-center text-gray-400 text-sm">
              <p>
                Powered by{' '}
                <a
                  href="https://jup.ag"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 transition"
                >
                  Jupiter
                </a>
                {' '}APIs and{' '}
                <a
                  href="https://meteora.ag"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-green-400 hover:text-green-300 transition"
                >
                  Meteora
                </a>
                {' '}DBC
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
