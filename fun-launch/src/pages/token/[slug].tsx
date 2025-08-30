'use client';

import { notFound, useParams } from 'next/navigation';
import Chart from '@/components/tokens/components/Chart';
import { ProjectDetailsCard } from '@/components/tokens/ProjecDetails';
import BuySell from '@/components/tokens/BuySell';
import RealtimeTransactions from '@/components/tokens/RealtimeTransactions';
import Top20Holders from '@/components/tokens/Top20Holders';


// Mock data for projects
const mockProjects = [
  {
    id: 1,
    name: 'Sample Project',
    img_url: '/coins/unknown.svg',
    createdAt: '2024-01-01',
    status: 'live'
  }
];

// Function to get project by ID
function getProjectById(id: string) {
  return mockProjects.find(project => project.id.toString() === id);
}

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;
  const project = slug ? getProjectById(slug) : undefined;

  // if (!project) {
  //   notFound();
  // }

  return (
    <>
      <main className="bg-neutral-950 flex w-full gap-4 space-y-4 relative overflow-hidden p-4">
        <div className="w-full space-y-4">
          <ProjectDetailsCard 
            name={project?.name}
            symbol={project?.name?.slice(0, 4)?.toUpperCase()}
            logo={project?.img_url}
            timeAgo={project?.createdAt}
            bondedPercentage={project?.status === 'live' ? 100 : project?.status === 'pre-sale' ? 75 : 50}
          />
          <Chart />
          <RealtimeTransactions />
        </div>
        <div className="space-y-4">
          <BuySell
          // TODO:getting from bknd...
          // tokenSymbol={project.tokenSymbol}
          // tokenBalance={project.tokenBalance}
          // solBalance={project.solBalance}
          />
          <Top20Holders />
        </div>
        {/* <HeroSection project={project} />

        <div className="mt-6 w-full">
          <div className="flex flex-col lg:flex-row gap-6">
            <OverviewSection project={project} />
            <InvestSidebar project={project} />
          </div>
          <div className="mt-6 grid grid-cols-1 gap-6">
            <TeamSection project={project} />
            <TokenomicsSection project={project} />
            <RoadmapSection project={project} />
          </div>
        </div> */}
      </main>

      {/* <InvestModal project={project} /> */}

    </>
  );
}
