'use client';

import { notFound, useParams } from 'next/navigation';
import Footer from '@/components/landing/footer';
import { getProjectBySlug } from '@/lib/projects';
import HeroSection from './components/HeroSection';
import InvestSidebar from './components/InvestSidebar';
import OverviewSection from './components/OverviewSection';
import TeamSection from './components/TeamSection';
import TokenomicsSection from './components/TokenomicsSection';
import RoadmapSection from './components/RoadmapSection';
import InvestModal from './components/InvestModal';
import Chart from './components/Chart';
import { ProjecDetails, ProjectDetailsCard } from './ProjecDetails';
import BuySell from './BuySell';
import RealtimeTransactions from './RealtimeTransactions';
import Top20Holders from './Top20Holders';
import { mockProjects } from '@/components/projectsComponents/ProjectLaunches/ProjectLaunches';

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

      <Footer />
    </>
  );
}
