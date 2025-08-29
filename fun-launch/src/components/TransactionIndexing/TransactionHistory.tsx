/**
 * Transaction History Component
 * 
 * Displays indexed transaction data with buy/sell actions, amounts, and Solscan links
 */

import React, { useState } from 'react';
import { 
  usePoolTransactions, 
  useTransactionStats, 
  useRefreshTransactions,
  useExportTransactions,
  IndexingFilters 
} from '@/hooks/useTransactionIndexing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Download, RefreshCw, Filter } from 'lucide-react';

interface TransactionHistoryProps {
  poolAddress?: string; // Optional for Meteora-wide view
  className?: string;
  showMeteoraPrograms?: boolean; // Show program type filter
}

export function TransactionHistory({ poolAddress, className, showMeteoraPrograms = false }: TransactionHistoryProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [filters, setFilters] = useState<IndexingFilters>({});
  const [showFilters, setShowFilters] = useState(false);

  // Fetch data
  const { 
    transactions, 
    total, 
    hasMore, 
    isLoading, 
    error 
  } = usePoolTransactions(poolAddress, page, pageSize, filters);

  const { data: stats, isLoading: statsLoading } = useTransactionStats(poolAddress, filters);
  const { refreshAll } = useRefreshTransactions();
  const { exportToCSV, isExporting } = useExportTransactions();

  // Filter handlers
  const handleFilterChange = (key: keyof IndexingFilters, value: string | undefined) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined
    }));
    setPage(1); // Reset to first page when filters change
  };

  const clearFilters = () => {
    setFilters({});
    setPage(1);
  };

  // Pagination handlers
  const nextPage = () => {
    if (hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const prevPage = () => {
    if (page > 1) {
      setPage(prev => prev - 1);
    }
  };

  // Export handler
  const handleExport = async () => {
    try {
      if (poolAddress) {
        await exportToCSV(poolAddress, filters);
      } else {
        // For Meteora-wide export, we need to handle this differently
        console.log('Export for Meteora-wide transactions not yet implemented');
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Refresh handler
  const handleRefresh = () => {
    if (poolAddress) {
      refreshAll(poolAddress);
    } else {
      // Refresh Meteora-wide queries
      // This would need to be implemented in the refresh hook
    }
  };

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <p>Error loading transactions: {error.message}</p>
            <Button onClick={handleRefresh} className="mt-2">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={className}>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Total Volume</div>
              <div className="text-2xl font-bold">{stats.totalVolumeFormatted}</div>
              <div className="text-xs text-gray-400">
                {stats.totalTransactions} transactions
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Buy Volume</div>
              <div className="text-2xl font-bold text-green-600">{stats.buyVolumeFormatted}</div>
              <div className="text-xs text-gray-400">
                {stats.buyCount} buys
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Sell Volume</div>
              <div className="text-2xl font-bold text-red-600">{stats.sellVolumeFormatted}</div>
              <div className="text-xs text-gray-400">
                {stats.sellCount} sells
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="text-sm text-gray-500">Unique Users</div>
              <div className="text-2xl font-bold">{stats.uniqueUsers}</div>
              <div className="text-xs text-gray-400">
                Avg: {stats.averageTransactionSizeFormatted}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {poolAddress ? 'Pool Transaction History' : 'Meteora Transaction History'}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>

        {showFilters && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium">Action</label>
                <Select
                  value={filters.action || ''}
                  onValueChange={(value) => handleFilterChange('action', value || undefined)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All actions</SelectItem>
                    <SelectItem value="buy">Buy only</SelectItem>
                    <SelectItem value="sell">Sell only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {showMeteoraPrograms && (
                <div>
                  <label className="text-sm font-medium">Program Type</label>
                  <Select
                    value={filters.programType || ''}
                    onValueChange={(value) => handleFilterChange('programType', value || undefined)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All programs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All programs</SelectItem>
                      <SelectItem value="DBC">DBC only</SelectItem>
                      <SelectItem value="DAMM_V2">DAMM v2 only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div>
                <label className="text-sm font-medium">Min Amount (USDC)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minAmount || ''}
                  onChange={(e) => handleFilterChange('minAmount', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">Max Amount (USDC)</label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={filters.maxAmount || ''}
                  onChange={(e) => handleFilterChange('maxAmount', e.target.value ? Number(e.target.value) : undefined)}
                />
              </div>

              <div>
                <label className="text-sm font-medium">User Wallet</label>
                <Input
                  placeholder="Wallet address"
                  value={filters.userWallet || ''}
                  onChange={(e) => handleFilterChange('userWallet', e.target.value || undefined)}
                />
              </div>
            </div>

            <div className="flex justify-end mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Action</th>
                  {showMeteoraPrograms && (
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Program</th>
                  )}
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount In</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Amount Out</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Price</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Transaction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      <RefreshCw className="w-6 h-6 mx-auto animate-spin mb-2" />
                      Loading transactions...
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.signature} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {new Date(tx.date).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <Badge 
                          variant={tx.action === 'buy' ? 'default' : 'secondary'}
                          className={tx.action === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        >
                          {tx.action.toUpperCase()}
                        </Badge>
                      </td>
                      {showMeteoraPrograms && (
                        <td className="px-4 py-3">
                          <Badge 
                            variant="outline"
                            className={tx.programType === 'DBC' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}
                          >
                            {tx.programType}
                          </Badge>
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {tx.amountIn.formatted}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                        {tx.amountOut.formatted}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {tx.priceFormatted}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <span className="font-mono">{tx.userWalletShort}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                          >
                            <a 
                              href={tx.solscanUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {total > 0 && (
            <div className="px-4 py-3 border-t bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total} transactions
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={prevPage}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {page}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={nextPage}
                  disabled={!hasMore}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
