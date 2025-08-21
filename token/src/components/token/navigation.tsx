'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Coins, Zap, Home } from 'lucide-react'

export function TokenNavigation() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <Home className="text-blue-600" size={20} />
              <span className="font-semibold text-gray-900 dark:text-white">Solana Tools</span>
            </Link>
            
            <div className="flex items-center space-x-1">
              <Link href="/token">
                <Button
                  variant={isActive('/token') ? 'default' : 'ghost'}
                  className={`flex items-center space-x-2 ${
                    isActive('/token') 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Coins size={16} />
                  <span>Token Creation</span>
                </Button>
              </Link>
              
              <Link href="/lp-pool">
                <Button
                  variant={isActive('/lp-pool') ? 'default' : 'ghost'}
                  className={`flex items-center space-x-2 ${
                    isActive('/lp-pool') 
                      ? 'bg-green-600 text-white' 
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Zap size={16} />
                  <span>LP Pool Creation</span>
                </Button>
              </Link>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              <span className="hidden md:inline">Powered by </span>
              <span className="font-semibold text-blue-600">Meteora</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
