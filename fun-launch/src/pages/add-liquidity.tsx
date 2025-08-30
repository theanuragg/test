import React, { useState } from 'react';
import Head from 'next/head';
import { useWallet } from '@jup-ag/wallet-adapter';

export default function AddLiquidityPage() {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [solBalance, setSolBalance] = useState<number | null>(null);

  const tokenMint = 'EXi2J5JsBLBYuFvhfEZxATThNJaFQa1sAJa3Ra4Lrs9q';
  const targetMarketCap = 5000; // $5000
  const devnetUsdcMint = 'Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr'; // Devnet USDC

  // Check balances
  const checkBalances = async () => {
    if (!publicKey) return;

    try {
      const connection = new (await import('@solana/web3.js')).Connection(
        'https://api.devnet.solana.com',
        'confirmed'
      );
      
      // Check SOL balance
      const solBalance = await connection.getBalance(publicKey);
      setSolBalance(solBalance / Math.pow(10, 9)); // Convert lamports to SOL
      
      // Check USDC balance
      const { getAssociatedTokenAddress } = await import('@solana/spl-token');
      
      const usdcTokenAccount = await getAssociatedTokenAddress(
        new (await import('@solana/web3.js')).PublicKey(devnetUsdcMint),
        publicKey
      );

      try {
        const balance = await connection.getTokenAccountBalance(usdcTokenAccount);
        setUsdcBalance(parseFloat(balance.value.amount) / Math.pow(10, balance.value.decimals));
      } catch {
        setUsdcBalance(0); // Token account doesn't exist
      }
    } catch (err) {
      console.error('Error checking balances:', err);
      setSolBalance(0);
      setUsdcBalance(0);
    }
  };

  // Get devnet SOL from faucet
  const getDevnetSol = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      setMessage('🔄 Getting devnet SOL...');
      
      const response = await fetch('/api/devnet/sol-faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userWallet: publicKey.toString(),
          amount: 2, // Get 2 SOL
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setMessage(`✅ SOL received! ${data.message}`);
        console.log('SOL faucet response:', data);
        
        // Check balance again after a short delay
        setTimeout(checkBalances, 3000);
        
      } else {
        throw new Error(data.error || 'Failed to get SOL');
      }

    } catch (err) {
      console.error('Get SOL error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get devnet SOL');
    } finally {
      setLoading(false);
    }
  };

  // Get devnet USDC from faucet
  const getDevnetUsdc = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      setMessage('🔄 Getting devnet USDC...');
      
      // For now, just provide instructions since creating USDC is complex
      setMessage('📋 Please get devnet USDC from a public faucet:');
      setError('');
      
      // Show instructions
      setTimeout(() => {
        setMessage(`
          📋 Devnet USDC Instructions:
          
          1. Visit: https://solfaucet.com/
          2. Connect your wallet
          3. Select "Devnet"
          4. Request USDC tokens
          5. Wait for confirmation
          6. Refresh this page
          
          Or use: https://faucet.solana.com/
        `);
      }, 1000);

    } catch (err) {
      console.error('Get USDC error:', err);
      setError(err instanceof Error ? err.message : 'Failed to get devnet USDC');
    } finally {
      setLoading(false);
    }
  };

  const addInitialLiquidity = async () => {
    if (!publicKey) {
      setError('Please connect your wallet first');
      return;
    }

    if (!usdcBalance || usdcBalance < targetMarketCap) {
      setError(`You need at least ${targetMarketCap} USDC. Current balance: ${usdcBalance || 0} USDC`);
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      console.log('💰 Adding initial liquidity for market cap:', targetMarketCap);
      
      // Step 1: Create the liquidity addition transaction
      const response = await fetch('/api/dbc/add-initial-liquidity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tokenMint,
          userWallet: publicKey.toString(),
          targetMarketCap,
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Failed to create liquidity transaction');
      }

      setMessage(`✅ Transaction created! ${data.message}`);

      // Step 2: Sign and send the transaction
      const transaction = data.signature;
      if (transaction) {
        setMessage('🔄 Signing and sending transaction...');
        
        // Parse the transaction
        const { Transaction } = await import('@solana/web3.js');
        const tx = Transaction.from(Buffer.from(transaction, 'base64'));
        
        // Sign the transaction
        const signedTx = await signTransaction(tx);
        
        // Send the transaction
        const connection = new (await import('@solana/web3.js')).Connection(
          'https://api.devnet.solana.com',
          'confirmed'
        );
        
        const signature = await connection.sendRawTransaction(signedTx.serialize());
        
        setMessage(`🎉 Success! Transaction sent: ${signature}`);
        console.log('Transaction signature:', signature);
        
        // Wait for confirmation
        setMessage('⏳ Waiting for confirmation...');
        await connection.confirmTransaction(signature, 'confirmed');
        
        setMessage(`✅ Liquidity added successfully! Market cap should now be $${targetMarketCap}`);
        
        // Show updated pool data
        setTimeout(async () => {
          try {
            const poolResponse = await fetch('/api/dbc/pool-by-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tokenMint }),
            });
            
            const poolData = await poolResponse.json();
            if (poolData.success) {
              setMessage(`📊 Updated Pool Data: Market Cap: $${poolData.poolData.marketCap.toFixed(2)}, Price: $${poolData.poolData.currentPrice.toFixed(6)}`);
            }
          } catch (e) {
            console.warn('Failed to fetch updated pool data:', e);
          }
        }, 5000);
      }

    } catch (err) {
      console.error('Add liquidity error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Check balance when wallet connects
  React.useEffect(() => {
    if (publicKey) {
      checkBalances();
    }
  }, [publicKey]);

  return (
    <>
      <Head>
        <title>Add Initial Liquidity - Fun Launch</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-b text-white p-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">💰 Add Initial Liquidity</h1>
            <p className="text-gray-400">Add devnet USDC liquidity to achieve target market cap</p>
          </div>

          {/* Token Info */}
          <div className="bg-white/10 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Token Information</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Token Mint:</span>
                <span className="font-mono text-xs">{tokenMint}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Target Market Cap:</span>
                <span className="text-green-400 font-semibold">${targetMarketCap.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Required USDC:</span>
                <span className="text-yellow-400 font-semibold">${targetMarketCap.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Network:</span>
                <span className="text-blue-400 font-semibold">Devnet</span>
              </div>
            </div>
          </div>

          {/* Wallet Status */}
          <div className="bg-white/10 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Wallet Status</h2>
            {publicKey ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Connected:</span>
                  <span className="text-green-400">✅ Yes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Address:</span>
                  <span className="font-mono text-xs">{publicKey.toString().slice(0, 8)}...{publicKey.toString().slice(-8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">SOL Balance:</span>
                  <span className={`font-semibold ${solBalance && solBalance >= 0.1 ? 'text-green-400' : 'text-red-400'}`}>
                    {solBalance !== null ? `${solBalance.toFixed(4)} SOL` : 'Loading...'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">USDC Balance:</span>
                  <span className={`font-semibold ${usdcBalance && usdcBalance >= targetMarketCap ? 'text-green-400' : 'text-red-400'}`}>
                    {usdcBalance !== null ? `${usdcBalance.toFixed(2)} USDC` : 'Loading...'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-red-400">❌ Wallet not connected</div>
            )}
          </div>

          {/* Get Devnet Tokens Buttons */}
          {publicKey && (
            <div className="space-y-4 mb-6">
              {/* Get SOL */}
              {(!solBalance || solBalance < 0.1) && (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 text-purple-200">🪙 Get Devnet SOL</h3>
                  <p className="text-purple-300 text-sm mb-4">
                    You need SOL for transaction fees. Click below to get free devnet SOL.
                  </p>
                  <button
                    onClick={getDevnetSol}
                    disabled={loading}
                    className="bg-purple-500 hover:bg-purple-600 px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50"
                  >
                    {loading ? 'Getting SOL...' : 'Get Devnet SOL'}
                  </button>
                </div>
              )}

              {/* Get USDC */}
              {(!usdcBalance || usdcBalance < targetMarketCap) && (
                <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                  <h3 className="text-lg font-semibold mb-2 text-blue-200">🪙 Get Devnet USDC</h3>
                  <p className="text-blue-300 text-sm mb-4">
                    You need devnet USDC to add liquidity. Click below to get free devnet USDC.
                  </p>
                  <button
                    onClick={getDevnetUsdc}
                    disabled={loading}
                    className="bg-blue-500 hover:bg-blue-600 px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50"
                  >
                    {loading ? 'Getting USDC...' : 'Get Devnet USDC'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Action Button */}
          <div className="text-center">
            <button
              onClick={addInitialLiquidity}
              disabled={!publicKey || loading || !usdcBalance || usdcBalance < targetMarketCap || !solBalance || solBalance < 0.1}
              className={`px-8 py-4 rounded-lg font-semibold text-lg transition ${
                !publicKey || loading || !usdcBalance || usdcBalance < targetMarketCap || !solBalance || solBalance < 0.1
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-gradient-to-r from-green-500 to-blue-500 hover:opacity-90'
              }`}
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                  Adding Liquidity...
                </div>
              ) : (
                `Add $${targetMarketCap.toLocaleString()} USDC Liquidity`
              )}
            </button>
          </div>

          {/* Status Messages */}
          {message && (
            <div className="mt-6 bg-green-500/20 border border-green-500/50 rounded-lg p-4">
              <p className="text-green-200">{message}</p>
            </div>
          )}

          {error && (
            <div className="mt-6 bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-200">{error}</p>
            </div>
          )}

          {/* Instructions */}
          <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-blue-200">📋 Instructions</h3>
            <ol className="text-sm text-blue-300 space-y-1">
              <li>1. Connect your wallet (make sure it's on devnet)</li>
              <li>2. Click "Get Devnet SOL" to get SOL for transaction fees</li>
              <li>3. Click "Get Devnet USDC" to receive free USDC</li>
              <li>4. Wait for balances to update</li>
              <li>5. Click "Add $5,000 USDC Liquidity"</li>
              <li>6. Sign the transaction in your wallet</li>
              <li>7. Wait for confirmation</li>
            </ol>
          </div>

          {/* Devnet Info */}
          <div className="mt-6 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-2 text-yellow-200">⚠️ Devnet Information</h3>
            <ul className="text-sm text-yellow-300 space-y-1">
              <li>• This is Solana Devnet - all tokens are free</li>
              <li>• Get SOL from: https://faucet.solana.com/</li>
              <li>• Get USDC from: https://solfaucet.com/</li>
              <li>• No real money is involved</li>
            </ul>
          </div>

          {/* Navigation */}
          <div className="mt-8 text-center">
            <a
              href={`/token/${tokenMint}`}
              className="text-blue-400 hover:text-blue-300 transition"
            >
              ← Back to Token Page
            </a>
          </div>

        </div>
      </div>
    </>
  );
}
