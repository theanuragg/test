import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const RPC_URL = 'https://api.devnet.solana.com';

interface SolFaucetRequest {
  userWallet: string;
  amount?: number; // Amount in SOL (default 2)
}

interface SolFaucetResponse {
  success: boolean;
  signature?: string;
  message?: string;
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SolFaucetResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { userWallet, amount = 2 } = req.body as SolFaucetRequest;

    if (!userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing userWallet parameter'
      });
    }

    console.log('🪙 Getting devnet SOL for wallet:', userWallet);
    console.log('💰 Amount:', amount, 'SOL');

    const connection = new Connection(RPC_URL, 'confirmed');
    const userPublicKey = new PublicKey(userWallet);

    // Request SOL from Solana devnet faucet
    const lamports = amount * LAMPORTS_PER_SOL;
    
    console.log('🔄 Requesting SOL from faucet...');
    const signature = await connection.requestAirdrop(userPublicKey, lamports);
    
    console.log('✅ SOL airdrop requested. Signature:', signature);
    
    // Wait for confirmation
    console.log('⏳ Waiting for confirmation...');
    await connection.confirmTransaction(signature, 'confirmed');
    
    // Check new balance
    const balance = await connection.getBalance(userPublicKey);
    console.log('📊 New SOL balance:', balance / LAMPORTS_PER_SOL, 'SOL');

    res.status(200).json({
      success: true,
      signature,
      message: `Successfully received ${amount} SOL. New balance: ${(balance / LAMPORTS_PER_SOL).toFixed(4)} SOL`,
    });

  } catch (error) {
    console.error('SOL faucet error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
