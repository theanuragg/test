import type { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || 
  process.env.RPC_URL?.match(/api-key=([^&]+)/)?.[1] || '';

const RPC_URL = process.env.RPC_URL || `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
const POOL_CONFIG_KEY = decodeURIComponent(process.env.POOL_CONFIG_KEY as string || '');

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, tokenMint } = req.body;

  try {
    const connection = new Connection(RPC_URL, 'confirmed');

    if (action === 'simulate_create') {
      // Simulate what happens during token creation
      const testData = {
        tokenName: 'TestCoin',
        tokenSymbol: 'TEST',
        tokenMint: 'SIMULATED_MINT_ADDRESS',
        uri: 'https://example.com/metadata.json'
      };

      // Show what DBC createPool would receive
      const dbcParams = {
        config: POOL_CONFIG_KEY,
        baseMint: testData.tokenMint,
        name: testData.tokenName,
        symbol: testData.tokenSymbol,
        uri: testData.uri,
        payer: 'USER_WALLET',
        poolCreator: 'USER_WALLET',
      };

      return res.status(200).json({
        action: 'simulate_create',
        message: 'This is what would be passed to DBC createPool',
        dbcParams,
        expectedMetadata: {
          name: testData.tokenName,
          symbol: testData.tokenSymbol,
          uri: testData.uri
        }
      });
    }

    if (action === 'check_metadata' && tokenMint) {
      // Check metadata for an existing token mint
      const results: any = {
        tokenMint,
        timestamp: new Date().toISOString(),
        checks: {}
      };

      // 1. Check if metadata account exists
      try {
        const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
        const [metadataAccount] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('metadata'),
            TOKEN_METADATA_PROGRAM_ID.toBuffer(),
            new PublicKey(tokenMint).toBuffer(),
          ],
          TOKEN_METADATA_PROGRAM_ID
        );

        const accountInfo = await connection.getAccountInfo(metadataAccount);
        results.checks.metadataAccount = {
          address: metadataAccount.toString(),
          exists: !!accountInfo,
          dataLength: accountInfo?.data?.length || 0
        };

        // 2. Try to extract readable text from metadata
        if (accountInfo && accountInfo.data.length > 0) {
          const data = accountInfo.data;
          const textData = data.toString('utf8').replace(/[\x00-\x1F\x7F-\xFF]/g, ' ').trim();
          const words = textData.split(/\s+/).filter(word => 
            word.length > 1 && 
            word.length < 30 && 
            /^[A-Za-z0-9]+$/.test(word)
          );
          
          results.checks.rawParsing = {
            possibleWords: words.slice(0, 10),
            dataPreview: textData.slice(0, 200)
          };
        }
      } catch (e) {
        results.checks.metadataAccount = {
          error: e instanceof Error ? e.message : 'Unknown error'
        };
      }

      // 3. Check Helius API
      try {
        const heliusResponse = await fetch(`https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mintAccounts: [tokenMint]
          })
        });

        if (heliusResponse.ok) {
          const heliusData = await heliusResponse.json();
          results.checks.helius = {
            status: 'success',
            data: heliusData[0] || null
          };
        } else {
          results.checks.helius = {
            status: 'error',
            httpStatus: heliusResponse.status
          };
        }
      } catch (e) {
        results.checks.helius = {
          status: 'error',
          error: e instanceof Error ? e.message : 'Unknown error'
        };
      }

      // 4. Check our custom parsing
      try {
        const customResponse = await fetch(`http://localhost:${process.env.PORT || 3000}/api/get-token-metadata`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tokenMints: [tokenMint]
          })
        });

        if (customResponse.ok) {
          const customData = await customResponse.json();
          results.checks.customParsing = {
            status: 'success',
            data: customData.tokens?.[0] || null
          };
        } else {
          results.checks.customParsing = {
            status: 'error',
            httpStatus: customResponse.status
          };
        }
      } catch (e) {
        results.checks.customParsing = {
          status: 'error',
          error: e instanceof Error ? e.message : 'Unknown error'
        };
      }

      return res.status(200).json(results);
    }

    return res.status(400).json({ 
      error: 'Invalid action. Use "simulate_create" or "check_metadata" with tokenMint' 
    });

  } catch (e) {
    return res.status(500).json({
      error: e instanceof Error ? e.message : 'Unknown error'
    });
  }
}
