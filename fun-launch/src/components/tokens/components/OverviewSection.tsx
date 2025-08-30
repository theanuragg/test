'use client'

import { Info } from 'lucide-react'
import SectionCard from './SectionCard'
import { type Project } from '@/lib/projects'
import { motion } from 'framer-motion'
import { variants } from '@/lib/theme'

export default function OverviewSection({ project }: { project: Project }) {
  return (
    <div className="flex-1">
      <div id="terms">
        <SectionCard className="p-6">
          <motion.div variants={variants.fadeIn} className="flex items-center gap-2 mb-4">
            <Info className="h-4 w-4 text-[#00ffff]" />
            <h3 className="text-base font-semibold text-[#e5e7eb]">Project Overview</h3>
          </motion.div>
          <motion.div
            variants={variants.fadeIn}
            className="text-sm leading-[1.8] tracking-[0.01em] text-[#9ca3af] whitespace-pre-line"
          >
            {project.description}
          </motion.div>

          <motion.div variants={variants.fadeIn} className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <motion.div variants={variants.slideIn}>
              <h4 className="mb-3 text-sm font-semibold text-[#e5e7eb]">Key Highlights</h4>
              <ul className="space-y-2 text-sm text-[#9ca3af]">
                {(project.highlights ?? []).map((h, idx) => (
                  <motion.li key={h} variants={variants.fadeIn} custom={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#00ffff]" />
                    <span>{h}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
            <motion.div variants={variants.slideIn}>
              <h4 className="mb-3 text-sm font-semibold text-[#e5e7eb]">Risk Factors</h4>
              <ul className="space-y-2 text-sm text-[#9ca3af]">
                {(project.risks ?? []).map((r, idx) => (
                  <motion.li key={r} variants={variants.fadeIn} custom={idx} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-[#00ffff]/50" />
                    <span>{r}</span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          </motion.div>

          <motion.div variants={variants.fadeIn} className="mt-8">
            <motion.h4 variants={variants.slideIn} className="mb-3 text-sm font-semibold text-[#e5e7eb]">
              Terms & Conditions
            </motion.h4>
            <motion.div variants={variants.fadeIn} className="space-y-3 text-sm leading-relaxed text-[#9ca3af]">
              <motion.p variants={variants.fadeIn}>
                By contributing USDC to this project you acknowledge that you are supporting a community‑governed
                launch. Contributions are not deposits and do not grant equity, voting rights, or claims on off‑chain
                entities or their assets. Any tokens you may receive are subject to the parameters and rules defined by
                the project at launch.
              </motion.p>
              <motion.ol variants={variants.fadeIn} className="list-decimal pl-5 space-y-2">
                <motion.li variants={variants.fadeIn}>
                  You agree to be bound by the project&apos;s on‑chain program rules and any published operating terms
                  referenced on this page. Where there is a conflict, on‑chain rules prevail.
                </motion.li>
                <motion.li variants={variants.fadeIn}>
                  You acknowledge that contributions are at risk and subject to smart contract risk, market volatility,
                  and potential loss. Only contribute what you can afford to lose.
                </motion.li>
                <motion.li variants={variants.fadeIn}>
                  No ownership, equity, dividends, or creditor rights are created by contributing. This is not a loan,
                  and no promise of profit is being made by the project or the platform.
                </motion.li>
                <motion.li variants={variants.fadeIn}>
                  To the maximum extent permitted by law, neither the project team nor the platform will be liable for
                  indirect, incidental, or consequential damages arising from participation, except to the extent caused
                  by fraud or willful misconduct.
                </motion.li>
              </motion.ol>
            </motion.div>
          </motion.div>
        </SectionCard>
      </div>
    </div>
  )
}
