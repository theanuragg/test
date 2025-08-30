'use client';

import SectionCard from './SectionCard';
import Link from 'next/link';
import { Linkedin, Send } from 'lucide-react';
import { type Project } from '@/lib/projects';
import { motion } from 'framer-motion';
import { variants } from '@/lib/theme';
import Image from 'next/image';

export default function TeamSection({ project }: { project: Project }) {
  return (
    <SectionCard className="p-6">
      <motion.h3
        variants={variants.slideIn}
        className="text-base font-semibold mb-4 text-[#e5e7eb]"
      >
        Team
      </motion.h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {project.team?.map((m, index) => (
          <motion.div
            key={index}
            variants={variants.fadeIn}
            className="bg-[#141920] rounded-lg p-6 border border-[#00ffff]/10"
          >
            {m.avatar && (
              <div className="w-16 h-16 rounded-full overflow-hidden mb-4 mx-auto">
                <Image
                  src={m.avatar}
                  alt={m.name}
                  width={64}
                  height={64}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="font-medium text-[#e5e7eb]">{m.name}</div>
            <div className="text-sm text-[#9ca3af] mt-1">{m.role}</div>
            {m.bio && (
              <div className="text-sm text-[#9ca3af] mt-2 leading-relaxed">
                {m.bio}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </SectionCard>
  );
}
