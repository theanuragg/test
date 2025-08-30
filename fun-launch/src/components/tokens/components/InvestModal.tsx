'use client';

import { DollarSign, Gift, ArrowUpRight } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
} from '@/components/ui/dialog';
import InvestBox from './InvestBox';
import { type Project } from '@/lib/projects';

export default function InvestModal({ project }: { project: Project }) {
  // Determine button type based on project status
  const isSaleEnded = project.status === 'ended';
  const hasInvested = isSaleEnded; // Mock: assume user invested if sale ended
  const claimableTokens = isSaleEnded ? 1250 : 0; // Only show claimable tokens after sale ends
  const canWithdraw = isSaleEnded && project.committed < project.minRaise; // Can withdraw if sale failed to meet target

  let buttonText = 'Invest';
  let buttonIcon = <DollarSign className="h-4 w-4" />;
  let buttonColor = 'bg-cyan-600';
  let isDisabled = false;

  if (isSaleEnded && hasInvested) {
    if (claimableTokens > 0 && project.committed >= project.minRaise) {
      buttonText = `Claim ${claimableTokens.toLocaleString()} Tokens`;
      buttonIcon = <Gift className="h-4 w-4" />;
      buttonColor = 'bg-gradient-to-r from-green-500 to-emerald-500';
    } else if (canWithdraw) {
      buttonText = 'Get Refund (Sale Failed)';
      buttonIcon = <ArrowUpRight className="h-4 w-4" />;
      buttonColor = 'bg-white border border-zinc-200 text-zinc-700';
    } else {
      buttonText = 'Sale Ended';
      buttonColor = 'bg-gray-400';
      isDisabled = true;
    }
  }

  return (
    <Dialog>
      <div className="fixed inset-x-0 bottom-2 z-50 p-4 pt-0 pb-[calc(env(safe-area-inset-bottom,0px))] lg:hidden">
        <DialogTrigger asChild>
          <button
            disabled={isDisabled}
            className={`w-full h-12 rounded-md text-base font-semibold shadow-[0_8px_30px_rgba(8,145,178,0.35)] active:scale-[0.99] flex items-center justify-center gap-2 leading-none ${
              buttonColor === 'bg-white border border-zinc-200 text-zinc-700'
                ? 'bg-white border border-zinc-200 text-zinc-700'
                : buttonColor ===
                    'bg-gradient-to-r from-green-500 to-emerald-500'
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white'
                  : buttonColor === 'bg-gray-400'
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-cyan-600 text-white'
            }`}
          >
            {buttonIcon}
            {buttonText}
          </button>
        </DialogTrigger>
      </div>

      <DialogContent className="border-0 bg-transparent p-0 shadow-none sm:max-w-lg">
        <DialogTitle className="sr-only">Invest</DialogTitle>
        <InvestBox project={project} />
      </DialogContent>
    </Dialog>
  );
}
