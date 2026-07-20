"use client";

import { memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { BRAND_NAME } from "@/lib/branding";
import type { WorkspacePreviewSnapshot } from "../lib/preview-snapshot";
import { previewSnapshotsEqual } from "../lib/preview-snapshot";
import { WorkspacePreviewMock } from "./workspace-preview-mock";

type OrgSetupBrandColumnProps = {
  snapshot: WorkspacePreviewSnapshot;
};

const EASE = [0.22, 1, 0.36, 1] as const;

function OrgSetupBrandColumnInner({ snapshot }: OrgSetupBrandColumnProps) {
  const reduceMotion = useReducedMotion();
  const company = snapshot.companyName.trim();

  return (
    <aside className="relative hidden h-full min-h-0 w-1/2 min-w-0 shrink-0 flex-col overflow-hidden border-l border-border/60 md:flex">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(30,64,175,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(30,64,175,0.07) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at 40% 35%, black 0%, transparent 72%)",
          WebkitMaskImage: "radial-gradient(ellipse at 40% 35%, black 0%, transparent 72%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 top-10 h-56 w-56 rounded-full bg-brand-bright/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-8 right-0 h-64 w-64 rounded-full bg-brand-cyan/12 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 flex h-full min-h-0 min-w-0 flex-col px-5 py-5 lg:px-7 lg:py-6 xl:px-8 xl:py-7 2xl:px-10 2xl:py-8">
        <Link
          href="/"
          className="mb-3 flex items-center gap-2.5 self-start lg:mb-4"
          aria-label={BRAND_NAME}
        >
          <AnimatedLogo size={28} className="rounded-xl" />
          <span className="font-display text-sm font-bold tracking-tight text-foreground">
            {BRAND_NAME}
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="mb-3 min-w-0 max-w-lg shrink-0 space-y-1.5 lg:mb-4"
        >
          <p className="text-xs font-medium text-brand-deep">Workspace birth</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.h2
              key={company || "default"}
              initial={{
                opacity: 0,
                y: reduceMotion ? 0 : 8,
              }}
              animate={{ opacity: 1, y: 0 }}
              exit={{
                opacity: 0,
                y: reduceMotion ? 0 : -6,
              }}
              transition={{ duration: 0.22, ease: EASE }}
              className="font-display text-[1.35rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground text-balance lg:text-[1.55rem] 2xl:text-[1.85rem]"
            >
              {company ? (
                <>
                  Building <span className="brand-sweep">{company}</span>
                </>
              ) : (
                <>
                  Your company, on <span className="brand-sweep">{BRAND_NAME}</span>
                </>
              )}
            </motion.h2>
          </AnimatePresence>
          <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            Watch your workspace take shape as you answer. Nothing here is permanent.
          </p>
        </motion.div>

        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 items-stretch pb-1">
          <WorkspacePreviewMock
            snapshot={snapshot}
            className="h-full w-full max-w-none lg:max-w-[560px] xl:max-w-[640px] 2xl:max-w-[720px]"
          />
        </div>
      </div>
    </aside>
  );
}

export const OrgSetupBrandColumn = memo(OrgSetupBrandColumnInner, (prev, next) =>
  previewSnapshotsEqual(prev.snapshot, next.snapshot),
);
