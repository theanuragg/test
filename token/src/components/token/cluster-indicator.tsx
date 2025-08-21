'use client'

import { useCluster } from '@/components/cluster/cluster-data-access'
import { Badge } from '@/components/ui/badge'

export function ClusterIndicator() {
  const { cluster } = useCluster()
  
  const getClusterColor = () => {
    switch (cluster.network) {
      case 'devnet':
        return 'bg-blue-500 hover:bg-blue-600'
      case 'testnet':
        return 'bg-yellow-500 hover:bg-yellow-600'
      case 'mainnet-beta':
        return 'bg-green-500 hover:bg-green-600'
      default:
        return 'bg-gray-500 hover:bg-gray-600'
    }
  }

  const getClusterIcon = () => {
    switch (cluster.network) {
      case 'devnet':
        return '🧪'
      case 'testnet':
        return '🔬'
      case 'mainnet-beta':
        return '🚀'
      default:
        return '⚙️'
    }
  }

  return (
    <div className="mt-4 flex justify-center">
      <Badge className={`${getClusterColor()} text-white px-3 py-1 text-sm font-medium`}>
        <span className="mr-2">{getClusterIcon()}</span>
        {cluster.name.toUpperCase()}
        {cluster.network === 'devnet' && (
          <span className="ml-2 text-xs opacity-90">(Test Environment)</span>
        )}
      </Badge>
    </div>
  )
}
