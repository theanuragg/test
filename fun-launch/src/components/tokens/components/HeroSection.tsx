'use client';

import Image from 'next/image';
import Link from 'next/link';
import { CheckCircle2, Share2, Linkedin, Send, BookOpen } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { type Project } from '@/lib/projects';

export default function HeroSection({ project }: { project: Project }) {
  const [showNotification, setShowNotification] = useState(false);

  const handleShare = async () => {
    try {
      const url = window.location.href;
      await navigator.clipboard.writeText(url);
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    } catch {
      setShowNotification(true);
      setTimeout(() => setShowNotification(false), 3000);
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4">
      {/* Notification */}
      <AnimatePresence>
        {showNotification && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[280px] sm:min-w-[320px] max-w-[90vw]"
          >
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Link copied to clipboard!</span>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="relative h-48 w-full overflow-hidden rounded-2xl">
        {project.coverUrl && (
          <Image
            src={project.coverUrl}
            alt="cover"
            fill
            className="object-cover saturate-150 contrast-110 brightness-90"
            priority
          />
        )}
        <div className="relative z-0 flex h-full items-end pb-6 px-4">
          <div className="flex items-center gap-4">
            {project.logoUrl && (
              <Image
                src={project.logoUrl}
                alt={`${project.name} logo`}
                width={64}
                height={64}
                className="rounded-2xl border border-white/30 bg-white/95 backdrop-blur"
              />
            )}
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-bold text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.45)]">
                  {project.name}
                </h1>
                <div className="flex items-center gap-2 mt-2">
                  <span className="rounded-full bg-gradient-to-r from-cyan-600 to-sky-500 text-white text-xs font-semibold px-2.5 py-0.5 uppercase shadow-sm">
                    {project.status}
                  </span>
                </div>
                <span
                  title="Verified"
                  className="inline-flex items-center gap-1 rounded-full bg-white/15 text-white text-[10px] px-2 py-0.5"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Verified
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
                <div className="text-sm text-white/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.45)]">
                  The future of decentralized funding
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {project.links?.twitter && (
                    <Link
                      href={project.links.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/30 transition-colors duration-300"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                    </Link>
                  )}
                  {project.links?.discord && (
                    <Link
                      href={project.links.discord}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-white/10 hover:bg-white/30 transition-colors duration-300"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495a18.1657 18.1657 0 00-5.487 0 12.9001 12.9001 0 00-.6177-1.2495A.077.077 0 008.5622 2.853C6.9931 3.1857 5.4644 3.7655 4.079 4.3698a.0704.0704 0 00-.0321.0276C.5334 9.0458-.32 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.4946 12.4946 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.019 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1568 2.4189Z" />
                      </svg>
                    </Link>
                  )}
                  {project.links?.telegram && (
                    <Link
                      href={project.links.telegram}
                      target="_blank"
                      aria-label="Telegram"
                      className="inline-flex items-center justify-center rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-all duration-200"
                    >
                      <Send className="h-4 w-4" />
                    </Link>
                  )}
                  {project.links?.linkedin && (
                    <Link
                      href={project.links.linkedin}
                      target="_blank"
                      aria-label="LinkedIn"
                      className="inline-flex items-center justify-center rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-all duration-200"
                    >
                      <Linkedin className="h-4 w-4" />
                    </Link>
                  )}
                  {project.links?.medium && (
                    <Link
                      href={project.links.medium}
                      target="_blank"
                      aria-label="Medium"
                      className="inline-flex items-center justify-center rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-all duration-200"
                    >
                      <BookOpen className="h-4 w-4" />
                    </Link>
                  )}
                  <button
                    aria-label="Share project"
                    onClick={handleShare}
                    className="inline-flex items-center justify-center rounded-full bg-white/20 p-2 text-white hover:bg-white/30 transition-all duration-200 active:scale-95"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
