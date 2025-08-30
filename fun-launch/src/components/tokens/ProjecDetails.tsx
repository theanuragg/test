'use client';
import React from 'react';
import Image from 'next/image';
import { Share2,Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProjectDetailsCardProps {
  name?: string;
  symbol?: string;
  logo?: string;
  timeAgo?: string;
  bondedPercentage?: number;
  copyLink?: string;
  isFavorited?: boolean;
  onShare?: () => void;
  onFavorite?: () => void;
}

export function ProjectDetailsCard({
  name = 'Larp Technologies',
  symbol = 'LARP',
  logo = '/only-founder.png',
  timeAgo = '3h ago',
  bondedPercentage = 100.0,
  copyLink = '5gso...pump',
  onShare,
}: ProjectDetailsCardProps) {
  return (
    <div className="w-full flex items-center justify-between">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative size-30 rounded-2xl overflow-hidden border-2 border-[#00ffff]/20 flex-shrink-0">
            {logo?.startsWith('http') ? (
              <img
                src={logo}
                alt={`${name} Logo`}
                className="object-cover w-full h-full"
              />
            ) : (
              <Image
                src={logo}
                alt={`${name} Logo`}
                fill
                className="object-cover"
              />
            )}
          </div>

          <div className="space-y-2">
            <div className="gap-3">
              <h1 className="font-semibold ">{name}</h1>
              <span className="text-sm text-muted-foreground">{symbol}</span>
            </div>

            <div className="flex items-center gap-4 text-xs">
              <span className="text-[#00ffff] font-medium">EXydvg</span>

              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{timeAgo}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span>/</span>
                <span className="text-[#00ffff] font-medium">
                  {bondedPercentage}% bonded
                </span>
              </div>
            </div>
            <div className="py-1 text-muted-foreground text-sm">
              <span className="font-mono">{copyLink}</span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button
          onClick={onShare}
         className="rounded-xl py-5 px-5 text-xl text-black border-[#91ffff3d] border-[.05px] cursor-pointer font-funnel-display"
              style={{
                background:
                  'radial-gradient(161.28% 68.75% at 50% 68.75%,#fff0,#ffffff80),#0ff',
                boxShadow:
                  '0px 0px 20px var(--tw-shadow-color,#91ffff3d),inset 0px -1px 0px var(--tw-shadow-color,#a1ffffcc),inset 0px 1px 4px var(--tw-shadow-color,#6fffff)',
              }}
        >
          <Share2 className="w-4 h-4" />
          Share
        </Button>
      </div>
    </div>
  );
}

export function ProjecDetails() {
  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
  };

  const handleFavorite = () => {
    console.log('Toggled favorite');
  };

  return (
    <div className="p-6">
      <ProjectDetailsCard onShare={handleShare} onFavorite={handleFavorite} />
    </div>
  );
}
