/**
 * Helius Data Display Component
 * 
 * Demonstrates Helius indexing services with comprehensive data display
 */

import React, { useState } from 'react';
import { useHeliusTokenData, useHeliusTransactionHistory, useHeliusWebhooks } from '@/hooks/useHeliusIndexing';
import { formatNumber, formatDate, shortenAddress } from '@/lib/utils';

interface HeliusDataDisplayProps {
  mintAddress?: string;
  walletAddress?: string;
}

export function HeliusDataDisplay({ mintAddress, walletAddress }: HeliusDataDisplayProps) {
  const [activeTab, setActiveTab] = useState<'token' | 'transactions' | 'webhooks'>('token');
  const [inputAddress, setInputAddress] = useState(mintAddress || '');
  const [inputWallet, setInputWallet] = useState(walletAddress || '');

  // Helius hooks
  const { data: tokenData, loading: tokenLoading, error: tokenError, refetch: refetchToken } = useHeliusTokenData(
    inputAddress || null,
    { autoFetch: false }
  );

  const { data: txHistory, loading: txLoading, error: txError, refetch: refetchTx } = useHeliusTransactionHistory(
    inputWallet || null,
    { autoFetch: false }
  );

  const { webhooks, loading: webhookLoading, createWebhook, deleteWebhook } = useHeliusWebhooks();

  const handleTokenSearch = () => {
    if (inputAddress) {
      refetchToken();
    }
  };

  const handleTransactionSearch = () => {
    if (inputWallet) {
      refetchTx();
    }
  };

  const handleCreateWebhook = async () => {
    const webhookUrl = prompt('Enter webhook URL:');
    if (!webhookUrl) return;

    const webhookName = prompt('Enter webhook name (optional):');
    
    await createWebhook({
      webhookUrl,
      webhookName: webhookName || 'Custom Webhook',
      transactionTypes: ['transfer', 'swap'],
    });
  };

  return (
    <div className="bg-white/5 rounded-xl p-6 backdrop-blur-sm border border-white/10">
      <h2 className="text-2xl font-bold text-white mb-6">Helius Indexing Services</h2>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 bg-white/10 rounded-lg p-1">
        <button
          onClick={() => setActiveTab('token')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
            activeTab === 'token'
              ? 'bg-white/20 text-white'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Token Data
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
            activeTab === 'transactions'
              ? 'bg-white/20 text-white'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Transaction History
        </button>
        <button
          onClick={() => setActiveTab('webhooks')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition ${
            activeTab === 'webhooks'
              ? 'bg-white/20 text-white'
              : 'text-gray-300 hover:text-white'
          }`}
        >
          Webhooks
        </button>
      </div>

      {/* Token Data Tab */}
      {activeTab === 'token' && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter token mint address..."
              value={inputAddress}
              onChange={(e) => setInputAddress(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
            />
            <button
              onClick={handleTokenSearch}
              disabled={tokenLoading || !inputAddress}
              className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg text-white font-medium disabled:opacity-50"
            >
              {tokenLoading ? 'Loading...' : 'Search'}
            </button>
          </div>

          {tokenError && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
              {tokenError}
            </div>
          )}

          {tokenData && (
            <div className="space-y-4">
              {/* Token Metadata */}
              {tokenData.metadata && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Token Metadata</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white ml-2">{tokenData.metadata.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Symbol:</span>
                      <span className="text-white ml-2">{tokenData.metadata.symbol}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Decimals:</span>
                      <span className="text-white ml-2">{tokenData.metadata.decimals}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Description:</span>
                      <span className="text-white ml-2">{tokenData.metadata.description}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Transactions */}
              {tokenData.transactions && tokenData.transactions.length > 0 && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Recent Transactions</h3>
                  <div className="space-y-2">
                    {tokenData.transactions.slice(0, 5).map((tx, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-300">{shortenAddress(tx.signature)}</span>
                        <span className="text-gray-400">{formatDate(tx.blockTime * 1000)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Token Balances */}
              {tokenData.balances && tokenData.balances.length > 0 && (
                <div className="bg-white/5 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Token Balances</h3>
                  <div className="space-y-2">
                    {tokenData.balances.map((balance, index) => (
                      <div key={index} className="flex justify-between items-center text-sm">
                        <span className="text-gray-300">{shortenAddress(balance.mint)}</span>
                        <span className="text-white">{formatNumber(parseFloat(balance.rawTokenAmount.tokenAmount))}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Transaction History Tab */}
      {activeTab === 'transactions' && (
        <div className="space-y-4">
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Enter wallet address..."
              value={inputWallet}
              onChange={(e) => setInputWallet(e.target.value)}
              className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400"
            />
            <button
              onClick={handleTransactionSearch}
              disabled={txLoading || !inputWallet}
              className="px-6 py-2 bg-gradient-to-r from-pink-500 to-purple-500 rounded-lg text-white font-medium disabled:opacity-50"
            >
              {txLoading ? 'Loading...' : 'Search'}
            </button>
          </div>

          {txError && (
            <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
              {txError}
            </div>
          )}

          {txHistory && (
            <div className="bg-white/5 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-white mb-3">
                Transaction History ({txHistory.total} transactions)
              </h3>
              <div className="space-y-3">
                {txHistory.transactions.slice(0, 10).map((tx, index) => (
                  <div key={index} className="border-b border-white/10 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm text-gray-300 font-mono">{shortenAddress(tx.signature)}</span>
                      <span className="text-xs text-gray-400">{formatDate(tx.blockTime * 1000)}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      Fee: {tx.meta.fee} lamports | Slot: {tx.slot}
                    </div>
                    {tx.events && (
                      <div className="mt-2">
                        {tx.events.swap && (
                          <span className="inline-block px-2 py-1 bg-green-500/20 text-green-300 text-xs rounded mr-2">
                            Swap
                          </span>
                        )}
                        {tx.events.transfer && (
                          <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded mr-2">
                            Transfer
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Webhooks Tab */}
      {activeTab === 'webhooks' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-white">Active Webhooks</h3>
            <button
              onClick={handleCreateWebhook}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg text-white font-medium"
            >
              Create Webhook
            </button>
          </div>

          {webhookLoading ? (
            <div className="text-center py-8 text-gray-400">Loading webhooks...</div>
          ) : webhooks.length === 0 ? (
            <div className="text-center py-8 text-gray-400">No webhooks configured</div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{webhook.webhookURL}</h4>
                      <p className="text-sm text-gray-400 mt-1">
                        ID: {webhook.webhookID}
                      </p>
                      {webhook.transactionTypes && (
                        <div className="mt-2">
                          {webhook.transactionTypes.map((type: string, typeIndex: number) => (
                            <span
                              key={typeIndex}
                              className="inline-block px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded mr-2"
                            >
                              {type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => deleteWebhook(webhook.webhookID)}
                      className="px-3 py-1 bg-red-500/20 text-red-300 text-sm rounded hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
