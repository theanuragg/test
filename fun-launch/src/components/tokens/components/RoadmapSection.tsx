'use client';

import SectionCard from './SectionCard';
import { type Project } from '@/lib/projects';
import { motion } from 'framer-motion';
import { variants } from '@/lib/theme';

export default function RoadmapSection({ project }: { project: Project }) {
  if (!project.roadmap || project.roadmap.length === 0) return null;
  return (
    <SectionCard className="p-6">
      <motion.h3
        variants={variants.slideIn}
        className="text-base font-semibold mb-4 text-[#e5e7eb]"
      >
        Roadmap
      </motion.h3>
      <div className="space-y-4">
        {project.roadmap?.map((r, index) => (
          <motion.div
            key={index}
            variants={variants.fadeIn}
            className="flex items-start gap-4 p-4 bg-[#141920] rounded-lg border border-[#00ffff]/10"
          >
            <div className="w-3 h-3 rounded-full bg-[#00ffff] mt-2 flex-shrink-0"></div>
            <div className="flex-1">
              <div className="text-sm font-medium text-[#00ffff]">
                {r.title}
              </div>
              <div className="text-sm text-[#9ca3af] mt-1">{r.description}</div>
              {r.date && (
                <div className="text-xs text-[#9ca3af] mt-2">{r.date}</div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </SectionCard>
  );
}
