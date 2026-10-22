"use client";

import { memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrandColumnFrame, WIZARD_EASE } from "@/components/wizard-shell";
import { BRAND_NAME } from "@/lib/branding";
import type { WorkspacePreviewSnapshot } from "../lib/preview-snapshot";
import { previewSnapshotsEqual } from "../lib/preview-snapshot";
import { WorkspacePreviewMock } from "./workspace-preview-mock";

type OrgSetupBrandColumnProps = {
  snapshot: WorkspacePreviewSnapshot;
};

function OrgSetupBrandColumnInner({ snapshot }: OrgSetupBrandColumnProps) {
  const reduceMotion = useReducedMotion();
  const company = snapshot.companyName.trim();

  return (
    <BrandColumnFrame atmosphere="default">
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: WIZARD_EASE }}
        className="mb-3 min-w-0 max-w-lg shrink-0 space-y-1.5 lg:mb-4"
      >
        <p className="text-xs font-medium text-brand-deep">Organization preview</p>
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
            transition={{ duration: 0.22, ease: WIZARD_EASE }}
            className="font-display text-[1.35rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground text-balance lg:text-[1.55rem] 2xl:text-[1.85rem]"
          >
            {company ? (
              <>
                Building <span className="brand-sweep">{company}</span>
              </>
            ) : (
              <>
                Your company, on{" "}
                <span className="brand-sweep">{BRAND_NAME}</span>
              </>
            )}
          </motion.h2>
        </AnimatePresence>
        <p className="max-w-sm text-label leading-relaxed text-muted-foreground">
          Your available modules are ready by default. Invite teammates when you are ready.
        </p>
      </motion.div>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 items-stretch pb-1">
        <motion.div
          initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: WIZARD_EASE }}
          className="flex h-full min-h-0 w-full min-w-0"
        >
          <WorkspacePreviewMock
            snapshot={snapshot}
            className="h-full w-full max-w-none lg:max-w-[560px] xl:max-w-[640px] 2xl:max-w-[720px]"
          />
        </motion.div>
      </div>
    </BrandColumnFrame>
  );
}

export const OrgSetupBrandColumn = memo(
  OrgSetupBrandColumnInner,
  (prev, next) => previewSnapshotsEqual(prev.snapshot, next.snapshot),
);
