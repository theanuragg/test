'use client';

import SectionCard from './SectionCard';
import { type Project } from '@/lib/projects';
import { motion } from 'framer-motion';
import { variants } from '@/lib/theme';

export default function TokenomicsSection({ project }: { project: Project }) {
  if (!project.tokenomics || project.tokenomics.length === 0) return null;
  return (
    <SectionCard className="p-6">
      <motion.h3
        variants={variants.slideIn}
        className="text-base font-semibold mb-4 text-[#e5e7eb]"
      >
        Tokenomics
      </motion.h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {project.tokenomics?.map((t, index) => (
          <motion.div
            key={index}
            variants={variants.fadeIn}
            className="bg-[#141920] rounded-lg p-6 border border-[#00ffff]/10"
          >
            <div className="text-2xl font-bold text-[#00ffff] mb-2">
              {t.percentage}%
            </div>
            <div className="font-medium text-[#e5e7eb]">{t.label}</div>
            {t.description && (
              <div className="text-sm text-[#9ca3af] mt-2 leading-relaxed">
                {t.description}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </SectionCard>
  );
}
