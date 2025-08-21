import type { Metadata } from 'next'
import './globals.css'
import { AppProviders } from '@/components/app-providers'
import { AppLayout } from '@/components/app-layout'
import { TokenNavigation } from '@/components/token/navigation'
import React from 'react'

export const metadata: Metadata = {
  title: 'Solana Token & LP Pool Management - Devnet',
  description: 'Create and manage SPL tokens and liquidity pools on Solana using Meteora DLMM/DBC Dammv2',
}

const links: { label: string; path: string }[] = [
  { label: 'Home', path: '/' },
  { label: 'Account', path: '/account' },
  { label: 'Token', path: '/token' },
  { label: 'LP Pool', path: '/lp-pool' },
]

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`antialiased`}>
        <AppProviders>
          <TokenNavigation />
          <AppLayout links={links}>{children}</AppLayout>
        </AppProviders>
      </body>
    </html>
  )
}

// Patch BigInt so we can log it using JSON.stringify without any errors
declare global {
  interface BigInt {
    toJSON(): string
  }
}

BigInt.prototype.toJSON = function () {
  return this.toString()
}
