'use client'

import InvestBox from './InvestBox'
import { type Project } from '@/lib/projects'

export default function InvestSidebar({ project }: { project: Project }) {
  return (
    <div className="hidden lg:block lg:w-[360px]">
      <div className="lg:sticky lg:top-[84px]">
        <InvestBox project={project} />
      </div>
    </div>
  )
}
