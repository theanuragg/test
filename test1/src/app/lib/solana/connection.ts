import { Connection, PublicKey } from '@solana/web3.js';

export async function getQuoteDecimals(connection: Connection, quoteMint: string): Promise<number> {
  try {
    const mintInfo = await connection.getParsedAccountInfo(new PublicKey(quoteMint));
    if (mintInfo.value?.data && 'parsed' in mintInfo.value.data) {
      return mintInfo.value.data.parsed.info.decimals;
    }
  } catch (error) {
    console.warn('Failed to get quote mint decimals, using default USDC decimals:', error);
  }
  
  // Default to USDC decimals (6) as fallback
  return 6;
}
