import { Connection } from '@solana/web3.js';

// Extract Helius API key from RPC_URL if HELIUS_API_KEY is not set
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 
  process.env.RPC_URL?.match(/api-key=([^&]+)/)?.[1] || '';

const RPC_URL = process.env.RPC_URL || `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export interface HeliusAssetData {
  id: string;
  content?: {
    metadata?: {
      name?: string;
      symbol?: string;
      description?: string;
    };
    links?: {
      image?: string;
      external_url?: string;
    };
  };
  authorities?: Array<{
    address: string;
    scopes: string[];
  }>;
  compression?: {
    eligible: boolean;
    compressed: boolean;
    data_hash?: string;
    creator_hash?: string;
    asset_hash?: string;
    tree?: string;
    seq?: number;
    leaf_id?: number;
  };
  grouping?: Array<{
    group_key: string;
    group_value: string;
  }>;
  royalty?: {
    royalty_model: string;
    target?: string;
    percent: number;
    basis_points: number;
    primary_sale_happened: boolean;
    locked: boolean;
  };
  creators?: Array<{
    address: string;
    share: number;
    verified: boolean;
  }>;
  ownership?: {
    frozen: boolean;
    delegated: boolean;
    delegate?: string;
    ownership_model: string;
    owner: string;
  };
  supply?: {
    print_max_supply?: number;
    print_current_supply?: number;
    edition_nonce?: number;
  };
  mutable?: boolean;
  burnt?: boolean;
  token_info?: {
    symbol?: string;
    supply: string;
    decimals: number;
    token_program: string;
    associated_token_address?: string;
  };
}

export interface HeliusAssetResponse {
  jsonrpc: string;
  result: HeliusAssetData | null;
  id: string;
}

/**
 * Get a single asset by its mint address using Helius getAsset method
 * @param mintAddress - The mint address of the token
 * @returns Asset data including metadata, or null if not found
 */
export const getAsset = async (mintAddress: string): Promise<HeliusAssetData | null> => {
  try {
    const response = await fetch(RPC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "get-asset-request",
        method: "getAsset",
        params: {
          id: mintAddress,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`Helius getAsset failed with status ${response.status} for mint: ${mintAddress}`);
      return null;
    }

    const data: HeliusAssetResponse = await response.json();
    
    if (data.result) {
      console.log(`✅ Helius getAsset found metadata for ${mintAddress}:`, {
        name: data.result.content?.metadata?.name,
        symbol: data.result.content?.metadata?.symbol,
        image: data.result.content?.links?.image
      });
    } else {
      console.log(`ℹ️ Helius getAsset found no metadata for ${mintAddress}`);
    }

    return data.result;
  } catch (error) {
    console.warn(`Helius getAsset error for mint ${mintAddress}:`, error);
    return null;
  }
};

/**
 * Get multiple assets by their mint addresses
 * @param mintAddresses - Array of mint addresses
 * @returns Array of asset data
 */
export const getAssets = async (mintAddresses: string[]): Promise<(HeliusAssetData | null)[]> => {
  // Process in batches to avoid overwhelming the API
  const batchSize = 10;
  const results: (HeliusAssetData | null)[] = [];
  
  for (let i = 0; i < mintAddresses.length; i += batchSize) {
    const batch = mintAddresses.slice(i, i + batchSize);
    const batchPromises = batch.map(mint => getAsset(mint));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
};

/**
 * Extract simplified token metadata from Helius asset data
 */
export const extractTokenMetadata = (asset: HeliusAssetData | null) => {
  if (!asset) {
    return {
      name: null,
      symbol: null,
      image: null,
      description: null
    };
  }

  return {
    name: asset.content?.metadata?.name || null,
    symbol: asset.content?.metadata?.symbol || asset.token_info?.symbol || null,
    image: asset.content?.links?.image || null,
    description: asset.content?.metadata?.description || null,
    decimals: asset.token_info?.decimals || null,
    supply: asset.token_info?.supply || null
  };
};
