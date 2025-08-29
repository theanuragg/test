import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, Keypair, PublicKey, sendAndConfirmRawTransaction, Transaction } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import AWS from 'aws-sdk';

const RPC_URL = process.env.RPC_URL as string;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID as string;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY as string;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID as string;
const R2_BUCKET = process.env.R2_BUCKET as string;
const PUBLIC_R2_URL = process.env.R2_PUBLIC_URL as string;

if (!RPC_URL) {
  throw new Error('Missing required environment variables');
}

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ACCOUNT_ID || !R2_BUCKET || !PUBLIC_R2_URL) {
  // Do not throw; allow tx sending without R2 persistence
  console.warn('R2 env vars missing; pool metadata will not be persisted');
}

const PRIVATE_R2_URL = `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
const r2 = new AWS.S3({
  endpoint: PRIVATE_R2_URL,
  accessKeyId: R2_ACCESS_KEY_ID,
  secretAccessKey: R2_SECRET_ACCESS_KEY,
  region: 'auto',
  signatureVersion: 'v4',
});

type SendTransactionRequest = {
  signedTransaction: string; // base64 encoded signed transaction
  additionalSigners?: Keypair[];
  mint?: string;
  userWallet?: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('req.body', req.body);
  try {
    const { signedTransaction, additionalSigners, mint, userWallet } = req.body as SendTransactionRequest;

    if (!signedTransaction) {
      return res.status(400).json({ error: 'Missing signed transaction' });
    }

    const connection = new Connection(RPC_URL, 'confirmed');
    const transaction = Transaction.from(Buffer.from(signedTransaction, 'base64'));

    // if (!transaction.recentBlockhash) {
    //   const { blockhash } = await connection.getLatestBlockhash();
    //   transaction.recentBlockhash = blockhash;
    // }

    // // Simulate transaction
    // const simulation = await connection.simulateTransaction(transaction);
    // if (simulation.value.err) {
    //   throw new Error(`Transaction simulation failed: ${JSON.stringify(simulation.value.err)}`);
    // }

    // console.log('additionalSigners', additionalSigners);

    // if (additionalSigners) {
    //   additionalSigners.forEach((signer) => {
    //     transaction.sign(signer);
    //   });
    // }

    // Send transaction
    const raw = transaction.serialize();
    const txSignature = await sendAndConfirmRawTransaction(connection, raw, {
      commitment: 'confirmed',
    });

    // Wait for confirmation
    // await connection.confirmTransaction(signature, 'confirmed');

    // IMMEDIATE: Fetch pool data right after transaction confirmation
    let poolData: any = null;
    if (mint && userWallet) {
      try {
        console.log('🔍 Immediately fetching DBC pool data for mint:', mint);
        const dbc = new DynamicBondingCurveClient(new Connection(RPC_URL, 'confirmed'), 'confirmed');
        
        // Enhanced immediate pool resolution with multiple strategies
        let poolAddress: string | null = null;
        let poolState: any = null;
        
        for (let attempt = 0; attempt < 12 && !poolAddress; attempt++) {
          try {
            // Strategy 1: Scan all pools for matching baseMint
            const allPools = await dbc.state.getPools();
            const foundPool = allPools.find((p: any) => {
              const baseMint = (p.account?.baseMint || p.baseMint);
              return baseMint?.toString?.() === mint;
            });
            
            if (foundPool) {
              const pubkey = (foundPool.publicKey || foundPool.pubkey || foundPool.pool || foundPool.address);
              if (pubkey?.toString) {
                poolAddress = pubkey.toString();
                poolState = await dbc.state.getPool(new PublicKey(poolAddress));
                console.log('✅ Found pool immediately:', poolAddress);
                break;
              }
            }
            
            // Strategy 2: Parse the transaction for created accounts
            if (!poolAddress && attempt === 0) {
              try {
                const parsedTx = await new Connection(RPC_URL, 'confirmed').getTransaction(txSignature, {
                  encoding: 'jsonParsed',
                  maxSupportedTransactionVersion: 0
                });
                
                if (parsedTx?.meta) {
                  // Look for newly created accounts with small balances (pool accounts)
                  const accountKeys = parsedTx.transaction.message.accountKeys;
                  for (let i = 0; i < accountKeys.length; i++) {
                    const preBalance = parsedTx.meta.preBalances[i];
                    const postBalance = parsedTx.meta.postBalances[i];
                    
                    // Pool accounts: created in tx with rent-exempt balance
                    if (preBalance === 0 && postBalance > 1000000 && postBalance < 10000000) {
                      const potentialPool = typeof accountKeys[i] === 'string' ? accountKeys[i] : (accountKeys[i] as any).pubkey;
                      try {
                        const testState = await dbc.state.getPool(new PublicKey(potentialPool));
                        if (testState.baseMint.toString() === mint) {
                          poolAddress = potentialPool;
                          poolState = testState;
                          console.log('✅ Found pool via transaction parsing:', poolAddress);
                          break;
                        }
                      } catch {}
                    }
                  }
                }
              } catch (e) {
                console.log('Transaction parsing failed, continuing with polling...');
              }
            }
            
            if (!poolAddress && attempt < 11) {
              await new Promise((r) => setTimeout(r, 1000));
              console.log(`⏳ Pool search attempt ${attempt + 1}/12...`);
            }
          } catch (e) {
            console.warn('Pool search attempt failed:', e);
            if (attempt < 11) await new Promise((r) => setTimeout(r, 1000));
          }
        }

        // Prepare pool data for response
        if (poolAddress && poolState) {
          poolData = {
            poolAddress,
            tokenMint: mint,
            creator: userWallet,
            createdAt: new Date().toISOString(),
            configKey: process.env.POOL_CONFIG_KEY || null,
            signature: txSignature,
            // Additional pool state info
            quoteMint: poolState.quoteMint?.toString(),
            totalSupply: poolState.totalSupply?.toString(),
            virtualQuoteReserve: poolState.virtualQuoteReserve?.toString(),
            virtualTokenReserve: poolState.virtualTokenReserve?.toString(),
            activationTime: poolState.activationTime?.toNumber ? new Date(poolState.activationTime.toNumber() * 1000).toISOString() : null,
            migrationQuoteThreshold: poolState.migrationQuoteThreshold?.toString(),
          };
          
          console.log('✅ Pool data collected:', poolData.poolAddress);
        }
      } catch (e) {
        console.warn('Failed to fetch immediate pool data:', e);
      }
    }

    // Persist pool metadata to R2 if possible
    if (R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_ACCOUNT_ID && R2_BUCKET && PUBLIC_R2_URL && poolData) {
      try {
        const key = `pools/${poolData.poolAddress}.json`;
        await new Promise((resolve, reject) => {
          r2.putObject(
            { Bucket: R2_BUCKET, Key: key, Body: Buffer.from(JSON.stringify(poolData, null, 2)), ContentType: 'application/json' },
            (err, data) => (err ? reject(err) : resolve(data))
          );
        });
        console.log('✅ Pool metadata saved to R2:', key);
      } catch (e) {
        console.warn('Failed to persist pool metadata to R2:', e);
      }
    }

    res.status(200).json({ 
      success: true, 
      signature: txSignature,
      poolData: poolData // Include the immediate pool data in response
    });
  } catch (error) {
    console.error('Transaction error:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
}
