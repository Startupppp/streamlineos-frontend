"use client";

import { memo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrandColumnFrame, WIZARD_EASE } from "@/components/wizard-shell";
import { BRAND_NAME } from "@/lib/branding";
import { STEP_GUIDE, type StepId } from "../lib/constants";
import type { EmployeePreviewSnapshot } from "../lib/preview-snapshot";
import { previewSnapshotsEqual } from "../lib/preview-snapshot";
import { ProfilePreview } from "./profile-preview";

type BrandColumnProps = {
  stepId: StepId;
  snapshot: EmployeePreviewSnapshot;
};

function BrandColumnInner({ stepId, snapshot }: BrandColumnProps) {
  const reduceMotion = useReducedMotion();
  const guide = STEP_GUIDE[stepId];
  const firstName = snapshot.displayName.trim().split(/\s+/)[0] ?? "";

  return (
    <BrandColumnFrame atmosphere="default">
      <motion.div
        initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: WIZARD_EASE }}
        className="mb-3 min-w-0 max-w-lg shrink-0 space-y-1.5 lg:mb-4"
      >
        <p className="text-xs font-medium text-brand-deep">
          Your profile in {BRAND_NAME}
        </p>
        <h2 className="font-display text-[1.35rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-foreground text-balance lg:text-[1.55rem] 2xl:text-[1.85rem]">
          {firstName ? (
            <>
              How <span className="brand-sweep">{firstName}</span> will appear
            </>
          ) : (
            <>
              How you will appear on{" "}
              <span className="brand-sweep">{BRAND_NAME}</span>
            </>
          )}
        </h2>
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={stepId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18, ease: WIZARD_EASE }}
            className="max-w-sm text-label leading-relaxed text-muted-foreground"
          >
            {guide.why}
          </motion.p>
        </AnimatePresence>
      </motion.div>

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden pt-1 lg:gap-5">
        <ProfilePreview
          snapshot={snapshot}
          stepId={stepId}
          className="min-h-0 flex-1"
        />
        {guide.minutes > 0 ? (
          <p className="shrink-0 text-dense text-muted-foreground/80">
            About {guide.minutes} min on this step
          </p>
        ) : null}
      </div>
    </BrandColumnFrame>
  );
}

export const BrandColumn = memo(BrandColumnInner, (prev, next) => {
  return (
    prev.stepId === next.stepId &&
    previewSnapshotsEqual(prev.snapshot, next.snapshot)
  );
});
