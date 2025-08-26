import { useMemo, useState, useCallback } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { z } from 'zod';
import Header from '../components/Header';

import { useForm } from '@tanstack/react-form';
import { Button } from '@/components/ui/button';
import { Keypair, Transaction } from '@solana/web3.js';
import { useUnifiedWalletContext, useWallet } from '@jup-ag/wallet-adapter';
import { toast } from 'sonner';

// Define the schema for form validation
const poolSchema = z.object({
  tokenName: z.string().min(3, 'Token name must be at least 3 characters'),
  tokenSymbol: z.string().min(1, 'Token symbol is required'),
  tokenLogo: z.instanceof(File, { message: 'Token logo is required' }).optional(),
  website: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
  twitter: z.string().url({ message: 'Please enter a valid URL' }).optional().or(z.literal('')),
  quoteTokens: z.array(z.string()).min(1, 'At least one quote token must be selected'),
  poolType: z.enum(['DBC', 'Standard']).default('DBC'),
});

interface FormValues {
  tokenName: string;
  tokenSymbol: string;
  tokenLogo: File | undefined;
  website?: string;
  twitter?: string;
  quoteTokens: string[];
  poolType: 'DBC' | 'Standard';
}

// Quote token options
const QUOTE_TOKENS = [
  { symbol: 'USDC', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', name: 'USD Coin' },
  { symbol: 'SOL', address: 'So11111111111111111111111111111111111111112', name: 'Solana' },
];

// Separate component for image input to avoid hooks violation
function ImageInput({ field }: { field: any }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const validateFile = useCallback((file: File): boolean => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (PNG, JPG, or SVG)');
      return false;
    }

    // Check file size (2MB = 2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      setError('File size must be less than 2MB');
      return false;
    }

    setError(null);
    return true;
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (validateFile(file)) {
        field.handleChange(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      } else {
        // Clear the input
        e.target.value = '';
        field.handleChange(undefined);
        setPreview(null);
      }
    }
  }, [field, validateFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        field.handleChange(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }, [field, validateFile]);

  const handleRemove = useCallback(() => {
    setPreview(null);
    field.handleChange(undefined);
    const input = document.getElementById('tokenLogo') as HTMLInputElement;
    if (input) input.value = '';
  }, [field]);

  return (
    <div>
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragOver 
            ? 'border-blue-400 bg-blue-400/10' 
            : 'border-white/20'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {preview ? (
          <div className="space-y-4">
            <img 
              src={preview} 
              alt="Preview" 
              className="w-24 h-24 mx-auto rounded-lg object-cover"
            />
            <p className="text-green-400 text-sm">
              {field.state.value?.name} ({field.state.value?.size ? (field.state.value.size / 1024 / 1024).toFixed(2) : '0'}MB)
            </p>
            <button
              type="button"
              onClick={handleRemove}
              className="text-red-400 text-sm hover:text-red-300"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <span className="iconify w-6 h-6 mx-auto mb-2 text-gray-400 ph--upload-bold" />
            <p className="text-gray-400 text-xs mb-2">
              {isDragOver ? 'Drop your image here' : 'PNG, JPG or SVG (max. 2MB)'}
            </p>
            <p className="text-gray-500 text-xs mb-4">Drag & drop or click to browse</p>
            <input
              type="file"
              id="tokenLogo"
              className="hidden"
              accept="image/jpeg,image/jpg,image/png,image/svg+xml"
              onChange={handleFileChange}
            />
            <label
              htmlFor="tokenLogo"
              className="bg-white/10 px-4 py-2 rounded-lg text-sm hover:bg-white/20 transition cursor-pointer"
            >
              Browse Files
            </label>
          </>
        )}
      </div>
      {error && (
        <p className="text-red-400 text-xs mt-2">{error}</p>
      )}
    </div>
  );
}

export default function CreatePool() {
  const { publicKey, signTransaction } = useWallet();
  const address = useMemo(() => publicKey?.toBase58(), [publicKey]);

  const [isLoading, setIsLoading] = useState(false);
  const [poolCreated, setPoolCreated] = useState(false);

  const form = useForm({
    defaultValues: {
      tokenName: '',
      tokenSymbol: '',
      tokenLogo: undefined,
      website: '',
      twitter: '',
      quoteTokens: ['EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'], // Default to USDC
      poolType: 'DBC',
    } as FormValues,
    onSubmit: async ({ value }) => {
      try {
        setIsLoading(true);
        const { tokenLogo } = value;
        if (!tokenLogo) {
          toast.error('Token logo is required');
          return;
        }

        // Additional file validation before upload
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/svg+xml'];
        if (!allowedTypes.includes(tokenLogo.type)) {
          toast.error('Please select a valid image file (PNG, JPG, or SVG)');
          return;
        }

        const maxSize = 2 * 1024 * 1024; // 2MB
        if (tokenLogo.size > maxSize) {
          toast.error('File size must be less than 2MB');
          return;
        }

        if (!signTransaction) {
          toast.error('Wallet not connected');
          return;
        }

        const reader = new FileReader();

        // Convert file to base64
        const base64File = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(tokenLogo);
        });

        const keyPair = Keypair.generate();

        // Step 1: Upload to R2 and get transaction
        const uploadResponse = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokenLogo: base64File,
            mint: keyPair.publicKey.toBase58(),
            tokenName: value.tokenName,
            tokenSymbol: value.tokenSymbol,
            userWallet: address,
            quoteTokens: value.quoteTokens,
            poolType: value.poolType,
          }),
        });

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error);
        }

        const { poolTx } = await uploadResponse.json();
        const transaction = Transaction.from(Buffer.from(poolTx, 'base64'));

        // Step 2: Sign with keypair first
        transaction.sign(keyPair);

        // Step 3: Then sign with user's wallet
        const signedTransaction = await signTransaction(transaction);

        // Step 4: Send signed transaction
        const sendResponse = await fetch('/api/send-transaction', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            signedTransaction: signedTransaction.serialize().toString('base64'),
          }),
        });

        if (!sendResponse.ok) {
          const error = await sendResponse.json();
          throw new Error(error.error);
        }

        const { success } = await sendResponse.json();
        if (success) {
          toast.success('Pool created successfully');
          setPoolCreated(true);
        }
      } catch (error) {
        console.error('Error creating pool:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to create pool');
      } finally {
        setIsLoading(false);
      }
    },
    validators: {
      onSubmit: ({ value }) => {
        const result = poolSchema.safeParse(value);
        if (!result.success) {
          return result.error.formErrors.fieldErrors;
        }
        return undefined;
      },
    },
  });

  return (
    <>
      <Head>
        <title>Create Pool - Virtual Curve</title>
        <meta
          name="description"
          content="Create a new token pool on Virtual Curve with customizable price curves."
        />
      </Head>

      <div className="min-h-screen bg-gradient-to-b text-white">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
            <div>
              <h1 className="text-4xl font-bold mb-2">Create DBC Pool</h1>
              <p className="text-gray-300">Launch your token with Dynamic Bonding Curve and multiple quote tokens</p>
            </div>
            <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30 rounded-xl p-4 mt-4 md:mt-0">
              <div className="flex items-center space-x-2">
                <span className="iconify ph--database-bold w-5 h-5 text-blue-400" />
                <span className="text-blue-300 font-medium">DBC Protocol</span>
              </div>
              <p className="text-xs text-blue-200 mt-1">Dynamic Bonding Curve</p>
            </div>
          </div>

          {poolCreated && !isLoading ? (
            <PoolCreationSuccess />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                form.handleSubmit();
              }}
              className="space-y-8"
            >
              {/* Token Details Section */}
              <div className="bg-white/5 rounded-xl p-8 backdrop-blur-sm border border-white/10">
                <h2 className="text-2xl font-bold mb-4">Token Details</h2>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                  <div className="flex items-start space-x-3">
                    <span className="iconify ph--info-bold w-5 h-5 text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-200">
                      <p className="font-medium mb-1">DBC Pool Benefits:</p>
                      <ul className="space-y-1 text-blue-100">
                        <li>• Automated market making with dynamic pricing</li>
                        <li>• Multiple quote token support (USDC, SOL)</li>
                        <li>• Reduced impermanent loss for liquidity providers</li>
                        <li>• Real-time price discovery</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <div className="mb-4">
                      <label
                        htmlFor="tokenName"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Token Name*
                      </label>
                      {form.Field({
                        name: 'tokenName',
                        children: (field) => (
                          <input
                            id="tokenName"
                            name={field.name}
                            type="text"
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white"
                            placeholder="e.g. Virtual Coin"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            required
                            minLength={3}
                          />
                        ),
                      })}
                    </div>

                    <div className="mb-4">
                      <label
                        htmlFor="tokenSymbol"
                        className="block text-sm font-medium text-gray-300 mb-1"
                      >
                        Token Symbol*
                      </label>
                      {form.Field({
                        name: 'tokenSymbol',
                        children: (field) => (
                          <input
                            id="tokenSymbol"
                            name={field.name}
                            type="text"
                            className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white"
                            placeholder="e.g. VRTL"
                            value={field.state.value}
                            onChange={(e) => field.handleChange(e.target.value)}
                            required
                            maxLength={10}
                          />
                        ),
                      })}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="tokenLogo"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Token Logo*
                    </label>
                    {form.Field({
                      name: 'tokenLogo',
                      children: (field) => <ImageInput field={field} />,
                    })}
                  </div>
                </div>
              </div>

              {/* Pool Configuration Section */}
              <div className="bg-white/5 rounded-xl p-8 backdrop-blur-sm border border-white/10">
                <h2 className="text-2xl font-bold mb-6">Pool Configuration</h2>
                <p className="text-gray-400 mb-6">
                  Configure your pool type and select quote tokens for trading. DBC pools use dynamic bonding curves for automated market making.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Pool Type
                    </label>
                    {form.Field({
                      name: 'poolType',
                      children: (field) => (
                        <select
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value as 'DBC' | 'Standard')}
                        >
                          <option value="DBC">Dynamic Bonding Curve (DBC)</option>
                          <option value="Standard">Standard Pool</option>
                        </select>
                      ),
                    })}
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Quote Tokens*
                    </label>
                    {form.Field({
                      name: 'quoteTokens',
                      children: (field) => (
                        <div className="space-y-3">
                          {QUOTE_TOKENS.map((token) => (
                            <label key={token.symbol} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg border border-white/10 hover:bg-white/5 transition-colors">
                              <input
                                type="checkbox"
                                checked={field.state.value.includes(token.address)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    field.handleChange([...field.state.value, token.address]);
                                  } else {
                                    field.handleChange(field.state.value.filter(addr => addr !== token.address));
                                  }
                                }}
                                className="rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-white">
                                  {token.symbol}
                                </span>
                                <p className="text-xs text-gray-400">
                                  {token.name}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      ),
                    })}
                    {form.Field({
                      name: 'quoteTokens',
                      children: (field) => 
                        field.state.value.length === 0 ? (
                          <p className="text-red-400 text-xs mt-2">Please select at least one quote token</p>
                        ) : null
                    })}
                  </div>
                </div>
              </div>

              {/* Social Links Section */}
              <div className="bg-white/5 rounded-xl p-8 backdrop-blur-sm border border-white/10">
                <h2 className="text-2xl font-bold mb-6">Social Links (Optional)</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="mb-4">
                    <label
                      htmlFor="website"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Website
                    </label>
                    {form.Field({
                      name: 'website',
                      children: (field) => (
                        <input
                          id="website"
                          name={field.name}
                          type="url"
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white"
                          placeholder="https://yourwebsite.com"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      ),
                    })}
                  </div>

                  <div className="mb-4">
                    <label
                      htmlFor="twitter"
                      className="block text-sm font-medium text-gray-300 mb-1"
                    >
                      Twitter
                    </label>
                    {form.Field({
                      name: 'twitter',
                      children: (field) => (
                        <input
                          id="twitter"
                          name={field.name}
                          type="url"
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white"
                          placeholder="https://twitter.com/yourusername"
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                        />
                      ),
                    })}
                  </div>
                </div>
              </div>

              {form.state.errors && form.state.errors.length > 0 && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 space-y-2">
                  {form.state.errors.map((error, index) =>
                    Object.entries(error || {}).map(([, value]) => (
                      <div key={index} className="flex items-start gap-2">
                        <p className="text-red-200">
                          {Array.isArray(value)
                            ? value.map((v: any) => v.message || v).join(', ')
                            : typeof value === 'string'
                              ? value
                              : String(value)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              <div className="flex justify-end">
                <SubmitButton isSubmitting={isLoading} />
              </div>
            </form>
          )}
        </main>
      </div>
    </>
  );
}

const SubmitButton = ({ isSubmitting }: { isSubmitting: boolean }) => {
  const { publicKey } = useWallet();
  const { setShowModal } = useUnifiedWalletContext();

  if (!publicKey) {
    return (
      <Button type="button" onClick={() => setShowModal(true)}>
        <span>Connect Wallet</span>
      </Button>
    );
  }

  return (
    <Button className="flex items-center gap-2" type="submit" disabled={isSubmitting}>
      {isSubmitting ? (
        <>
          <span className="iconify ph--spinner w-5 h-5 animate-spin" />
          <span>Creating Pool...</span>
        </>
      ) : (
        <>
          <span className="iconify ph--rocket-bold w-5 h-5" />
          <span>Launch Pool</span>
        </>
      )}
    </Button>
  );
};

const PoolCreationSuccess = () => {
  return (
    <>
      <div className="bg-white/5 rounded-xl p-8 backdrop-blur-sm border border-white/10 text-center">
        <div className="bg-green-500/20 p-4 rounded-full inline-flex mb-6">
          <span className="iconify ph--check-bold w-12 h-12 text-green-500" />
        </div>
        <h2 className="text-3xl font-bold mb-4">DBC Pool Created Successfully!</h2>
        <p className="text-gray-300 mb-4 max-w-lg mx-auto">
          Your DBC token pool has been created and is now live on the Virtual Curve platform with USDC and SOL quote tokens.
        </p>
        <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 mb-8 max-w-md mx-auto">
          <h3 className="text-lg font-semibold text-blue-300 mb-2">Pool Details</h3>
          <div className="text-sm text-blue-200 space-y-1">
            <p>• Dynamic Bonding Curve (DBC) Pool</p>
            <p>• Quote Tokens: USDC, SOL</p>
            <p>• Automated Market Making Enabled</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/explore-pools"
            className="bg-white/10 px-6 py-3 rounded-xl font-medium hover:bg-white/20 transition"
          >
            Explore Pools
          </Link>
          <button
            onClick={() => {
              window.location.reload();
            }}
            className="cursor-pointer bg-gradient-to-r from-pink-500 to-purple-500 px-6 py-3 rounded-xl font-medium hover:opacity-90 transition"
          >
            Create Another Pool
          </button>
        </div>
      </div>
    </>
  );
};
