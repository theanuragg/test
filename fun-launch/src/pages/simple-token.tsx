import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';

export default function SimpleTokenPage() {
  const router = useRouter();
  const [tokenData, setTokenData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get token ID from URL query parameter
  const tokenId = router.query.token as string;

  useEffect(() => {
    if (!tokenId) return;

    console.log('📝 Fetching token data for:', tokenId);
    setLoading(true);
    setError(null);

    fetch('/api/token-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mintAddress: tokenId }),
    })
    .then(async (response) => {
      const data = await response.json();
      if (data.success) {
        setTokenData(data.tokenInfo);
        console.log('✅ Token data loaded:', data.tokenInfo);
      } else {
        throw new Error(data.error || 'Failed to fetch token data');
      }
    })
    .catch((err) => {
      console.error('❌ Error:', err);
      setError(err.message);
    })
    .finally(() => {
      setLoading(false);
    });
  }, [tokenId]);

  return (
    <>
      <Head>
        <title>Simple Token View - Fun Launch</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b text-white p-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Simple Token View</h1>
            <p className="text-gray-400">Testing token metadata display without complex dependencies</p>
          </div>

          {/* Token ID */}
          <div className="bg-white/10 rounded-lg p-4 mb-6">
            <h3 className="font-semibold mb-2">Token ID:</h3>
            <p className="font-mono text-sm break-all">{tokenId || 'No token ID provided'}</p>
            <p className="text-gray-400 text-xs mt-1">
              URL: {typeof window !== 'undefined' ? window.location.href : 'N/A'}
            </p>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-blue-500/20 rounded-lg p-4 mb-6 border border-blue-500/50">
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400 mr-3"></div>
                <span>Loading token data...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-500/20 rounded-lg p-4 mb-6 border border-red-500/50">
              <h3 className="font-semibold text-red-200 mb-2">Error</h3>
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Token Data */}
          {tokenData && (
            <div className="bg-green-500/20 rounded-lg p-6 border border-green-500/50">
              <h2 className="text-2xl font-bold mb-4 text-green-200">✅ Token Information Found!</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-green-300 mb-3">Basic Info</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="font-semibold text-white">{tokenData.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Symbol:</span>
                      <span className="font-semibold text-white">{tokenData.symbol}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Decimals:</span>
                      <span className="text-white">{tokenData.decimals}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Supply:</span>
                      <span className="text-white">{tokenData.supply}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-green-300 mb-3">Metadata</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Has Metadata:</span>
                      <span className="text-white">{tokenData.hasMetadata ? '✅ Yes' : '❌ No'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Metadata Account:</span>
                      <span className="text-white font-mono text-xs">{tokenData.metadataAccount?.slice(0, 12)}...</span>
                    </div>
                    <div>
                      <span className="text-gray-400">URI:</span>
                      <p className="text-white font-mono text-xs mt-1 break-all">{tokenData.uri}</p>
                    </div>
                    {tokenData.description && (
                      <div>
                        <span className="text-gray-400">Description:</span>
                        <p className="text-white text-xs mt-1">{tokenData.description}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 text-center">
                <p className="text-green-200 font-semibold">
                  🎉 Your token "{tokenData.name}" ({tokenData.symbol}) is working perfectly!
                </p>
                <p className="text-green-300 text-sm mt-1">
                  Metadata account exists and contains correct information.
                </p>
              </div>
            </div>
          )}

          {/* Test Links */}
          <div className="mt-8 space-y-4">
            <h3 className="text-lg font-semibold">Quick Actions</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a
                href={`https://solscan.io/token/${tokenId}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg p-4 text-center transition"
              >
                <div className="text-blue-200 font-semibold">View on Solscan</div>
                <div className="text-blue-300 text-xs mt-1">Check if name displays</div>
              </a>
              
              <button
                onClick={() => router.push('/explore-pools')}
                className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 rounded-lg p-4 text-center transition"
              >
                <div className="text-purple-200 font-semibold">Explore Pools</div>
                <div className="text-purple-300 text-xs mt-1">Back to pool list</div>
              </button>
              
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 rounded-lg p-4 text-center transition"
              >
                <div className="text-gray-200 font-semibold">Reload Page</div>
                <div className="text-gray-300 text-xs mt-1">Refresh data</div>
              </button>
            </div>
          </div>

          {/* URL Guide */}
          <div className="mt-8 bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/30">
            <h3 className="font-semibold text-yellow-200 mb-2">🔗 URL Format</h3>
            <p className="text-yellow-300 text-sm">
              Visit: <code className="bg-black/30 px-2 py-1 rounded">/simple-token?token=YOUR_MINT_ADDRESS</code>
            </p>
            <p className="text-yellow-400 text-xs mt-2">
              Example: /simple-token?token=FVPczHwzoxAf9rDVVeb8iGPcAvVUda1nRNrzcQetvntu
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
