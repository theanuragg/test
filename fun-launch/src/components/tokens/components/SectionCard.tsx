'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { variants } from '@/lib/theme'

type SectionCardProps = {
  children: React.ReactNode
  className?: string
}

export default function SectionCard({ children, className = '' }: SectionCardProps) {
  return (
    <motion.div
      variants={variants.scaleIn}
      className={`rounded-2xl border border-[#00ffff]/10 bg-[#141920] shadow-[0_0_30px_rgba(0,255,255,0.05)] backdrop-blur-sm ${className}`}
    >
      {children}
    </motion.div>
  )
}
