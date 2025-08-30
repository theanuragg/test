import { useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import Header from '../components/Header';

type ExplorePoolItem = {
  poolAddress: string;
  baseMint: string;
  tokenMint: string;
  createdAt?: string;
  name?: string;
  symbol?: string;
  imageUrl?: string;
  description?: string;
  decimals?: number;
  supply?: string;
};

export default function ExplorePoolsPage() {
  const [pools, setPools] = useState<ExplorePoolItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadFromR2() {
      try {
        const resp = await fetch('/api/pools/list');
        if (!resp.ok) return [] as ExplorePoolItem[];
        const json = await resp.json();
        const items = (json?.pools || []).map((p: any) => ({
          poolAddress: p.poolAddress || '',
          baseMint: p.tokenMint || '',
          tokenMint: p.tokenMint || '',
          createdAt: p.createdAt,
          name: p.name,
          symbol: p.symbol,
          imageUrl: p.imageUrl,
          description: p.description,
          decimals: p.decimals,
          supply: p.supply,
        })) as ExplorePoolItem[];
        return items.filter((i) => i.baseMint);
      } catch {
        return [] as ExplorePoolItem[];
      }
    }

    async function loadPools() {
      setLoading(true);
      const fromR2 = await loadFromR2();
      if (!cancelled && fromR2.length > 0) {
        setPools(fromR2);
        setLoading(false);
        return;
      }
      // If nothing in R2, show empty state (we only show pools created via this launchpad)
      if (!cancelled) setPools([]);
      if (!cancelled) setLoading(false);
    }

    loadPools();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <Head>
        <title>Explore Pools</title>
        <meta name="description" content="Discover recent DBC pools" />
      </Head>

      <div className="min-h-screen bg-gradient-to-b text-white">
        <Header />

        <main className="container mx-auto px-4 py-10">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Explore Pools</h1>
            <Link href="/create-pool" className="bg-white/10 px-4 py-2 rounded-lg hover:bg-white/20 transition">
              Create Pool
            </Link>
          </div>

          {loading && (
            <div className="text-gray-300">Loading pools...</div>
          )}

          {!loading && error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-200 mb-6">
              {error}
            </div>
          )}

          {!loading && !error && pools.length === 0 && (
            <div className="text-gray-400">No pools found yet. Create one to get started.</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pools.map((p) => (
              <div key={p.poolAddress} className="bg-white/5 rounded-xl p-5 border border-white/10 hover:bg-white/10 transition-all duration-200">
                {/* Token Header with Logo from R2 */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-white/10 flex-shrink-0 flex items-center justify-center">
                    {p.imageUrl ? (
                      <img
                        src={p.imageUrl}
                        alt={p.name || 'Token Logo'}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          const currentSrc = target.src;
                          
                          // If it's already a placeholder, don't retry
                          if (currentSrc.includes('via.placeholder.com')) {
                            return;
                          }
                          
                          // Try different extensions
                          if (currentSrc.includes('.jpeg')) {
                            target.src = currentSrc.replace('.jpeg', '.png');
                          } else if (currentSrc.includes('.png')) {
                            target.src = currentSrc.replace('.png', '.jpg');
                          } else if (currentSrc.includes('.jpg')) {
                            // All extensions failed, show placeholder
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="text-white/50 text-xs font-mono">${(p.symbol || 'T').charAt(0)}</div>`;
                            }
                          } else {
                            // Default fallback
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="text-white/50 text-xs font-mono">${(p.symbol || 'T').charAt(0)}</div>`;
                            }
                          }
                        }}
                      />
                    ) : (
                      <div className="text-white/50 text-xs font-mono">{p.symbol ? p.symbol.charAt(0) : 'T'}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">
                      {p.name || `Token ${p.tokenMint.slice(0, 8)}`}
                    </h3>
                    <div className="text-sm text-gray-400">
                      ${p.symbol || p.tokenMint.slice(0, 6)}
                    </div>
                  </div>
                </div>

                {/* Token Description from Helius */}
                {p.description && (
                  <div className="mb-4">
                    <div className="text-xs text-gray-400 mb-1">Description</div>
                    <div className="text-sm text-gray-300 line-clamp-2">
                      {p.description}
                    </div>
                  </div>
                )}

                {/* Token Details */}
                <div className="space-y-3 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    {p.supply && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Total Supply</div>
                        <div className="text-xs text-gray-300">
                          {p.decimals ? 
                            (parseInt(p.supply) / Math.pow(10, p.decimals)).toLocaleString() : 
                            parseInt(p.supply).toLocaleString()
                          }
                        </div>
                      </div>
                    )}
                    
                    {p.decimals !== undefined && (
                      <div>
                        <div className="text-xs text-gray-400 mb-1">Decimals</div>
                        <div className="text-xs text-gray-300">{p.decimals}</div>
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-1">Pool Address</div>
                    <div className="font-mono text-xs text-gray-300 break-all">
                      {p.poolAddress.slice(0, 8)}...{p.poolAddress.slice(-8)}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-400 mb-1">Token Mint</div>
                    <div className="font-mono text-xs text-gray-300 break-all">
                      {p.tokenMint.slice(0, 8)}...{p.tokenMint.slice(-8)}
                    </div>
                  </div>

                  {p.createdAt && (
                    <div>
                      <div className="text-xs text-gray-400 mb-1">Created</div>
                      <div className="text-xs text-gray-300">
                        {new Date(p.createdAt).toLocaleDateString()} at {new Date(p.createdAt).toLocaleTimeString()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Button */}
                <Link
                  href={`/token/${p.tokenMint}`}
                  className="block w-full bg-gradient-to-r from-pink-500 to-purple-500 px-4 py-2 rounded-lg text-sm text-center hover:opacity-90 transition font-medium"
                >
                  View Token Details
                </Link>
              </div>
            ))}
          </div>
        </main>
      </div>
    </>
  );
}





