import type { Metadata } from 'next'
import React from 'react'

export const metadata: Metadata = {
  title: 'Project Details - OnlyFounders',
  description: 'Explore project details, team information, roadmap, and investment opportunities. Get comprehensive insights before investing.',
  keywords: 'project details, team, roadmap, tokenomics, investment, OnlyFounders',
  openGraph: {
    title: 'Project Details - OnlyFounders',
    description: 'Explore project details, team information, roadmap, and investment opportunities. Get comprehensive insights before investing.',
    type: 'website',
  },
}

export default function ProjectSlugLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>
}
