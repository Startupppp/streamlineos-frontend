"use client";

import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
    <aside className="relative hidden h-full min-h-0 w-[42%] min-w-0 shrink-0 flex-col overflow-hidden border-r border-border/60 xl:flex">
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

      <div className="relative z-10 flex h-full min-h-0 min-w-0 flex-col px-8 py-8 2xl:px-12 2xl:py-10">
        <Link
          href="/"
          className="mb-6 flex items-center gap-2.5 self-start"
          aria-label={BRAND_NAME}
        >
          <AnimatedLogo size={30} className="rounded-xl" />
          <span className="font-display text-sm font-bold tracking-tight text-foreground">
            {BRAND_NAME}
          </span>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: EASE }}
          className="mb-5 min-w-0 max-w-md space-y-2.5"
        >
          <p className="text-[12px] font-medium text-brand-deep">Workspace birth</p>
          <h2 className="font-display text-[1.65rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground text-balance 2xl:text-[2rem]">
            {company ? (
              <>
                Building <span className="brand-sweep">{company}</span>
              </>
            ) : (
              <>
                Your company, on <span className="brand-sweep">{BRAND_NAME}</span>
              </>
            )}
          </h2>
          <p className="max-w-sm text-[13px] leading-relaxed text-muted-foreground">
            Watch your workspace take shape as you answer. Nothing here is permanent.
          </p>
        </motion.div>

        <div className="relative z-10 flex min-h-0 min-w-0 flex-1 items-center">
          <WorkspacePreviewMock snapshot={snapshot} className="w-full max-w-[420px]" />
        </div>
      </div>
    </aside>
  );
}

export const OrgSetupBrandColumn = memo(OrgSetupBrandColumnInner, (prev, next) =>
  previewSnapshotsEqual(prev.snapshot, next.snapshot),
);
