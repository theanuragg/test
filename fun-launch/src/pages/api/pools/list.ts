import type { NextApiRequest, NextApiResponse } from 'next';
import { Connection } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { getAsset, extractTokenMetadata } from '../../../lib/helius/getAsset';

// Extract Helius API key from RPC_URL if HELIUS_API_KEY is not set
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 
  process.env.RPC_URL?.match(/api-key=([^&]+)/)?.[1] || '';

// Decode the pool config key if it's URL encoded
const PARTNER_CONFIG_KEY = decodeURIComponent(process.env.POOL_CONFIG_KEY as string || '');
const RPC_URL = process.env.RPC_URL || `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    console.log('=== POOL LIST DEBUG ===');
    console.log('HELIUS_API_KEY exists:', !!HELIUS_API_KEY);
    console.log('PARTNER_CONFIG_KEY:', PARTNER_CONFIG_KEY);
    console.log('RPC_URL:', RPC_URL);
    
    if (!HELIUS_API_KEY || !PARTNER_CONFIG_KEY) {
      console.log('Missing required env vars');
      return res.status(200).json({ pools: [], debug: { hasHelius: !!HELIUS_API_KEY, hasConfig: !!PARTNER_CONFIG_KEY } });
    }

    const pools: any[] = [];

    // Method 1: Use Helius RPC to get transaction signatures for our config key
    try {
      console.log('Fetching signatures for config key:', PARTNER_CONFIG_KEY);
      
      // Use Helius RPC endpoint to get signatures
      const rpcResponse = await fetch(RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [
            PARTNER_CONFIG_KEY,
            { limit: 50 }
          ]
        })
      });

      if (rpcResponse.ok) {
        const rpcData = await rpcResponse.json();

        console.log("RPC POOL DATA FROM Method one scanario one", rpcData);


        const signatures = rpcData.result || [];
        console.log('Found', signatures.length, 'signatures for config key');

        // Now get full transaction details for each signature
        for (const sigInfo of signatures.slice(0, 20)) {
          try {
            const txResponse = await fetch(RPC_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getTransaction',
                params: [
                  sigInfo.signature,
                  { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }
                ]
              })
            });

            if (txResponse.ok) {
              const txData = await txResponse.json();

              console.log("RPC POOL DATA FROM Method one scanario two", txData.result?.transaction);


              const tx = txData.result;
              
              if (tx && tx.meta && !tx.meta.err) {
                // Look for DBC pool creation patterns in account keys
                const accountKeys = tx.transaction.message.accountKeys || [];
                
                // Find potential pool and mint accounts
                // Pool accounts usually have rent-exempt reserves
                const poolCandidates = accountKeys.filter((acc: any) => {
                  const postBalance = tx.meta.postBalances[accountKeys.indexOf(acc)];
                  return postBalance > 0 && postBalance < 10000000; // Typical pool rent-exempt amount
                });

                // Look for newly created token mints
                const mintCandidates = accountKeys.filter((acc: any) => {
                  const preBalance = tx.meta.preBalances[accountKeys.indexOf(acc)];
                  const postBalance = tx.meta.postBalances[accountKeys.indexOf(acc)];
                  return preBalance === 0 && postBalance > 0;
                });

                // If we found pool and mint candidates, add to results
                if (poolCandidates.length > 0 && mintCandidates.length > 0) {
                  const poolAddress = typeof poolCandidates[0] === 'string' ? poolCandidates[0] : poolCandidates[0].pubkey;
                  const tokenMint = typeof mintCandidates[0] === 'string' ? mintCandidates[0] : mintCandidates[0].pubkey;
                  
                  console.log('Found pool creation tx:', sigInfo.signature, 'pool:', poolAddress, 'mint:', tokenMint);
                  
                  pools.push({
                    poolAddress,
                    tokenMint,
                    createdAt: new Date((tx.blockTime || sigInfo.blockTime) * 1000).toISOString(),
                    signature: sigInfo.signature,
                    configKey: PARTNER_CONFIG_KEY,
                  });
                }
              }
            }
          } catch (e) {
            console.warn('Error processing signature:', sigInfo.signature, e);
            continue;
          }
        }
      } else {
        console.error('Helius RPC error:', rpcResponse.status);
      }
    } catch (e) {
      console.warn('Helius RPC failed, trying direct DBC query:', e);
    }

    // Method 2: Fallback to direct DBC pool scanning if Helius didn't work
    if (pools.length === 0) {
      try {
        const connection = new Connection(RPC_URL, 'confirmed');
        const dbc = new DynamicBondingCurveClient(connection, 'confirmed');
        
        const allPools = await dbc.state.getPools();
        
        for (const pool of allPools.slice(0, 50)) {
          try {
            const poolPubkey = pool.publicKey;
            if (!poolPubkey) continue;

            const poolState = await dbc.state.getPool(poolPubkey);
            
            // Check if this pool uses our partner config
            if (poolState.config.toString() === PARTNER_CONFIG_KEY) {

              console.log("Found pool on method 2", poolState)


              const baseMint = poolState.baseMint;
              if (baseMint) {
                pools.push({
                  poolAddress: poolPubkey.toString(),
                  tokenMint: baseMint.toString(),
                  createdAt: new Date().toISOString(),
                  configKey: PARTNER_CONFIG_KEY,
                });
              }
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        console.warn('Direct DBC query also failed:', e);
      }
    }

    // Remove duplicates and sort by creation date
    const uniquePools = pools
      .filter((pool, index, self) => 
        index === self.findIndex(p => p.poolAddress === pool.poolAddress)
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Enrich pools with token metadata using Helius getAsset
    const enrichedPools = await Promise.all(
      uniquePools.map(async (pool) => {
        const enrichedPool = { ...pool };
        
        try {
          // Use Helius getAsset for reliable metadata fetching
          console.log(`🔍 Fetching asset data from Helius for token: ${pool.tokenMint}`);
          const assetData = await getAsset(pool.tokenMint);
          const tokenMetadata = extractTokenMetadata(assetData);
          
          if (tokenMetadata.name || tokenMetadata.symbol) {
            enrichedPool.name = tokenMetadata.name;
            enrichedPool.symbol = tokenMetadata.symbol;
            enrichedPool.description = tokenMetadata.description;
            enrichedPool.decimals = tokenMetadata.decimals;
            enrichedPool.supply = tokenMetadata.supply;
            
            console.log('✅ Found token metadata via Helius:', { 
              name: enrichedPool.name, 
              symbol: enrichedPool.symbol,
              mint: pool.tokenMint,
              hasImage: !!tokenMetadata.image
            });
          } else {
            console.log(`ℹ️ No metadata found for token: ${pool.tokenMint}`);
          }

          // Use actual image from Helius if available, otherwise placeholder
          if (tokenMetadata.image) {
            enrichedPool.imageUrl = tokenMetadata.image;
            console.log('🖼️ Using Helius image for', pool.tokenMint);
          } else {
            enrichedPool.imageUrl = `https://via.placeholder.com/64x64/6366f1/ffffff?text=${(enrichedPool.symbol || 'T').charAt(0)}`;
            console.log('🖼️ Using placeholder image for', pool.tokenMint, 'symbol:', enrichedPool.symbol);
          }
        } catch (e) {
          console.warn('Failed to fetch Helius metadata for', pool.tokenMint, e);
          
          // Fallback to placeholder
          enrichedPool.imageUrl = `https://via.placeholder.com/64x64/6366f1/ffffff?text=T`;
        }

        return enrichedPool;
      })
    );

    console.log(`Found ${enrichedPools.length} pools for config ${PARTNER_CONFIG_KEY}`);
    
    return res.status(200).json({ pools: enrichedPools });
  } catch (e) {
    console.error('list pools error', e);
    return res.status(200).json({ pools: [] });
  }
}


