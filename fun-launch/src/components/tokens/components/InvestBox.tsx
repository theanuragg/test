'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { DollarSign, TrendingUp, Gift, ArrowUpRight } from 'lucide-react';
import SectionCard from './SectionCard';
import { type Project } from '@/lib/projects';
import { ClaimModal, WithdrawalModal } from '@/components/deFi';
import { motion } from 'framer-motion';
import { variants } from '@/lib/theme';

export default function InvestBox({ project }: { project: Project }) {
  const min = project.minInvestmentUsd ?? 100;
  const percent = Math.min(
    100,
    Math.round((project.committed / Math.max(project.minRaise, 1)) * 100)
  );
  const [amount, setAmount] = useState<number | undefined>(undefined);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const add = (n: number) => setAmount(a => Math.max(0, (a || 0) + n));
  const isValid = useMemo(
    () => amount !== undefined && amount >= min,
    [amount, min]
  );
  const targetLabel =
    project.minRaise > 0 ? `$${project.minRaise.toLocaleString()}` : '—';

  // Real DeFi logic - replace with actual blockchain state
  const isSaleActive =
    project.status === 'live' || project.status === 'pre-sale';
  const isSaleEnded = project.status === 'ended';
  const hasInvested = project.status === 'ended'; // Mock: assume user invested if sale ended
  const claimableTokens = isSaleEnded ? 1250 : 0; // Only show claimable tokens after sale ends
  const canWithdraw = isSaleEnded && project.committed < project.minRaise; // Can withdraw if sale failed to meet target
  const totalContributed = 5000; // TODO: Get from blockchain - user's actual contribution

  return (
    <SectionCard className="p-6 pt-10">
      <motion.div
        variants={variants.fadeIn}
        className="flex items-center justify-between mb-4"
      >
        <motion.div
          variants={variants.slideIn}
          className="flex items-center gap-2"
        >
          <TrendingUp className="h-4 w-4 text-[#00ffff]" />
          <h3 className="text-lg font-semibold text-[#e5e7eb]">
            Investment Details
          </h3>
        </motion.div>
      </motion.div>

      <motion.div
        variants={variants.fadeIn}
        className="flex items-baseline justify-between"
      >
        <div className="text-base font-semibold text-[#e5e7eb]">
          ${project.committed.toLocaleString()}
        </div>
        <div className="text-xs text-[#9ca3af]">Target {targetLabel}</div>
      </motion.div>

      <motion.div
        variants={variants.scaleIn}
        className="mt-2 h-2 w-full rounded-full bg-[#141920] overflow-hidden border border-[#00ffff]/10"
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="h-full rounded-full bg-[#00ffff]"
        />
      </motion.div>

      <motion.div
        variants={variants.fadeIn}
        className="mt-2 flex items-center justify-between text-xs text-[#9ca3af]"
      >
        <span>{percent}% funded</span>
        <span>
          {project.investorsCount ? `${project.investorsCount} investors` : ''}
        </span>
      </motion.div>

      <motion.div
        variants={variants.fadeIn}
        className="mt-5 grid grid-cols-2 gap-3 text-sm"
      >
        <motion.div
          variants={variants.scaleIn}
          className="rounded-xl border border-[#00ffff]/10 bg-[#141920] p-4 backdrop-blur-sm"
        >
          <div className="text-xs text-[#9ca3af]">Token Price</div>
          <div className="mt-1 text-lg font-semibold text-[#00ffff]">
            ${project.tokenPriceUsd?.toFixed(2) ?? '—'}
          </div>
        </motion.div>
        <motion.div
          variants={variants.scaleIn}
          className="rounded-xl border border-[#00ffff]/10 bg-[#141920] p-4 backdrop-blur-sm"
        >
          <div className="text-xs text-[#9ca3af]">Time Left</div>
          <div className="mt-1 text-lg font-semibold text-[#00ffff]">
            {project.timeLeftDays ?? '—'} days
          </div>
        </motion.div>
      </motion.div>

      {/* Investment Section - Only show when sale is active */}
      {isSaleActive && (
        <motion.div variants={variants.fadeIn} className="mt-4">
          <label className="text-xs text-[#9ca3af]">Amount</label>
          <motion.div
            variants={variants.scaleIn}
            className="mt-1 flex items-center gap-3"
          >
            <div className="flex-1 flex items-center rounded-lg border border-[#00ffff]/10 bg-[#141920] px-3 py-2 backdrop-blur-sm">
              <span className="text-[#9ca3af]">$</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={amount && Number.isFinite(amount) ? amount : ''}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, '');
                  if (raw === '') {
                    setAmount(undefined);
                  } else {
                    const next = Number.parseInt(raw, 10);
                    if (!Number.isNaN(next)) {
                      setAmount(next);
                    }
                  }
                }}
                className="ml-2 w-full bg-transparent text-right text-[#e5e7eb] outline-none placeholder:text-[#9ca3af]"
                placeholder={`${min}`}
              />
              <Image
                src="/only-founder.png"
                alt="USDC"
                width={20}
                height={20}
                className="brightness-200"
              />
            </div>
          </motion.div>
          <motion.div
            variants={variants.fadeIn}
            className="mt-2 flex flex-wrap gap-2"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="rounded-full border border-[#00ffff]/10 bg-[#141920] px-3 py-1 text-xs text-[#9ca3af] hover:border-[#00ffff]/30 hover:text-[#00ffff] transition-all duration-300"
              onClick={() => add(100)}
            >
              +100
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="rounded-full border border-[#00ffff]/10 bg-[#141920] px-3 py-1 text-xs text-[#9ca3af] hover:border-[#00ffff]/30 hover:text-[#00ffff] transition-all duration-300"
              onClick={() => add(500)}
            >
              +500
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              className="rounded-full border border-[#00ffff]/10 bg-[#141920] px-3 py-1 text-xs text-[#9ca3af] hover:border-[#00ffff]/30 hover:text-[#00ffff] transition-all duration-300"
              onClick={() => add(1000)}
            >
              +1000
            </motion.button>
          </motion.div>
          <motion.div
            variants={variants.fadeIn}
            className="mt-2 text-[11px] text-[#9ca3af]"
          >
            Min ${min.toLocaleString()}{' '}
            {project.maxInvestmentUsd
              ? `• Max $${project.maxInvestmentUsd.toLocaleString()}`
              : ''}
          </motion.div>
          {amount !== undefined && amount > 0 && !isValid && (
            <motion.div
              variants={variants.fadeIn}
              className="mt-2 text-xs text-rose-400"
            >
              Minimum investment is ${min.toLocaleString()}
            </motion.div>
          )}
          {amount !== undefined && amount > 0 && amount < min && (
            <motion.div
              variants={variants.fadeIn}
              className="mt-1 text-xs text-amber-400"
            >
              Add ${(min - amount).toLocaleString()} more to meet minimum
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Action Buttons */}
      {isSaleActive ? (
        <motion.button
          variants={variants.scaleIn}
          whileHover={isValid ? { scale: 1.02 } : {}}
          disabled={!isValid}
          onClick={() => {
            if (isValid && amount !== undefined) {
              // TODO: Implement actual investment logic
              console.log('Investing:', amount, 'USDC');
              setShowSuccess(true);
              setAmount(undefined); // Reset amount after investment
              // Hide success message after 3 seconds
              setTimeout(() => setShowSuccess(false), 3000);
            }
          }}
          className={`mt-4 w-full rounded-md py-3 text-base font-semibold transition-all duration-300 inline-flex items-center justify-center gap-2 ${
            isValid
              ? 'bg-[#00ffff] text-[#0a0f12] hover:shadow-[0_0_30px_rgba(0,255,255,0.3)]'
              : 'bg-[#141920] text-[#9ca3af] cursor-not-allowed border border-[#00ffff]/10'
          }`}
        >
          <DollarSign className="h-4 w-4" />
          Invest Now
        </motion.button>
      ) : (
        <motion.div variants={variants.fadeIn} className="mt-4">
          <motion.div
            variants={variants.scaleIn}
            className="rounded-lg bg-[#141920] p-4 text-center border border-[#00ffff]/10 backdrop-blur-sm"
          >
            <p className="text-[#9ca3af] font-medium">Sale Ended</p>
          </motion.div>
        </motion.div>
      )}

      {/* Success Message */}
      {showSuccess && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mt-3 rounded-lg bg-green-500/20 border border-green-500/30 p-3 text-center"
        >
          <p className="text-sm text-green-400 font-medium">
            🎉 Investment submitted successfully!
          </p>
        </motion.div>
      )}

      {/* DeFi Actions - Only show when relevant */}
      {isSaleEnded && hasInvested && (
        <motion.div variants={variants.fadeIn} className="mt-4 space-y-2">
          {/* Claim Tokens - Only when sale succeeded */}
          {claimableTokens > 0 && project.committed >= project.minRaise && (
            <motion.button
              variants={variants.scaleIn}
              onClick={() => setShowClaimModal(true)}
              className="w-full rounded-md py-2.5 text-sm font-medium transition-all duration-300 inline-flex items-center justify-center gap-2 bg-[#00ffff] text-[#0a0f12] hover:shadow-[0_0_30px_rgba(0,255,255,0.3)]"
            >
              <Gift className="h-4 w-4" />
              Claim {claimableTokens.toLocaleString()} Tokens
            </motion.button>
          )}

          {/* Withdraw - Only when sale failed to meet target */}
          {canWithdraw && (
            <motion.button
              variants={variants.scaleIn}
              onClick={() => setShowWithdrawModal(true)}
              className="w-full rounded-md py-2.5 text-sm font-medium transition-all duration-300 inline-flex items-center justify-center gap-2 border border-[#00ffff]/10 bg-[#141920] text-[#e5e7eb] hover:border-[#00ffff]/30 hover:shadow-[0_0_30px_rgba(0,255,255,0.1)]"
            >
              <ArrowUpRight className="h-4 w-4" />
              Get Refund (Sale Failed)
            </motion.button>
          )}

          {/* Success Message - When sale succeeded */}
          {project.committed >= project.minRaise && (
            <motion.div
              variants={variants.scaleIn}
              className="rounded-lg bg-[#141920] p-3 text-center border border-[#00ffff]/10 backdrop-blur-sm"
            >
              <p className="text-sm text-[#00ffff] font-medium">
                🎉 Sale Successful! Tokens will be distributed soon.
              </p>
            </motion.div>
          )}
        </motion.div>
      )}

      <motion.p
        variants={variants.fadeIn}
        className="mt-3 text-center text-xs text-[#9ca3af]"
      >
        By contributing, you agree to the{' '}
        <motion.a
          href="#terms"
          className="text-[#00ffff] hover:text-[#00ffff]/80 transition-colors duration-300"
        >
          Terms & Conditions
        </motion.a>
      </motion.p>

      {/* DeFi Modals */}
      <ClaimModal
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        projectName={project.name}
        claimableTokens={claimableTokens}
        totalContributed={totalContributed}
        vestingSchedule={{
          immediate: 40,
          monthly: 5,
          months: 12,
        }}
        claimDeadline={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)} // 30 days from now
      />

      <WithdrawalModal
        isOpen={showWithdrawModal}
        onClose={() => setShowWithdrawModal(false)}
        projectName={project.name}
        availableForWithdrawal={totalContributed}
        withdrawalType="refund"
        minWithdrawal={100}
        withdrawalFee={0}
        processingTime="24-48 hours"
      />
    </SectionCard>
  );
}
