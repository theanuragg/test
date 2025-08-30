import { NextApiRequest, NextApiResponse } from 'next';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { 
  TOKEN_PROGRAM_ID, 
  getOrCreateAssociatedTokenAccount, 
  mintTo,
  createMint,
  getMint
} from '@solana/spl-token';

const RPC_URL = 'https://api.devnet.solana.com';

interface UsdcFaucetRequest {
  userWallet: string;
  amount?: number; // Amount in USDC (default 10000)
}

interface UsdcFaucetResponse {
  success: boolean;
  signature?: string;
  message?: string;
  error?: string;
  usdcMint?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<UsdcFaucetResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { userWallet, amount = 10000 } = req.body as UsdcFaucetRequest;

    if (!userWallet) {
      return res.status(400).json({
        success: false,
        error: 'Missing userWallet parameter'
      });
    }

    console.log('🪙 Creating devnet USDC for wallet:', userWallet);
    console.log('💰 Amount:', amount, 'USDC');

    const connection = new Connection(RPC_URL, 'confirmed');
    const userPublicKey = new PublicKey(userWallet);

    // Create a new USDC mint for testing
    console.log('🔄 Creating new USDC mint...');
    const mintKeypair = Keypair.generate();
    
    const createMintTx = await createMint(
      connection,
      userPublicKey as any, // payer
      userPublicKey, // mint authority
      userPublicKey, // freeze authority
      6 // decimals (USDC standard)
    );

    console.log('✅ Created new USDC mint:', mintKeypair.publicKey.toString());

    // Get or create USDC token account for user
    console.log('🔄 Getting or creating USDC token account...');
    const usdcTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      userPublicKey as any, // payer
      mintKeypair.publicKey,
      userPublicKey
    );

    console.log('✅ USDC token account:', usdcTokenAccount.address.toString());

    // Mint USDC tokens to user
    const mintAmount = amount * Math.pow(10, 6); // Convert to lamports (6 decimals)
    console.log('🔄 Minting', amount, 'USDC...');
    
    const mintTx = await mintTo(
      connection,
      userPublicKey as any, // payer
      mintKeypair.publicKey,
      usdcTokenAccount.address,
      userPublicKey as any, // authority
      mintAmount
    );

    console.log('✅ USDC minted successfully! Transaction:', mintTx);

    // Verify the balance
    const balance = await connection.getTokenAccountBalance(usdcTokenAccount.address);
    console.log('📊 New USDC balance:', balance.value.amount, 'lamports');

    res.status(200).json({
      success: true,
      signature: mintTx,
      usdcMint: mintKeypair.publicKey.toString(),
      message: `Successfully created ${amount} USDC. Mint: ${mintKeypair.publicKey.toString()}`,
    });

  } catch (error) {
    console.error('USDC faucet error:', error);
    
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
}
