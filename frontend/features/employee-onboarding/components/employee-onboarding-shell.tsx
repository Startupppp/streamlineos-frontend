"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { WizardSplitShell } from "@/components/wizard-shell";
import {
  ONBOARDING_SEQUENCE,
  STEP_SUBTITLES,
  type StepId,
} from "../lib/constants";
import type { EmployeePreviewSnapshot } from "../lib/preview-snapshot";
import { StepRail } from "./step-rail";
import { MobileProgressBar } from "./mobile-progress-bar";
import { AdminDeferBanner } from "./admin-defer-banner";
import { MemberOnboardingNote } from "./onboarding-standing-notices";
import { BrandColumn } from "./brand-column";

type EmployeeOnboardingShellProps = {
  currentIndex: number;
  title: string;
  direction: number;
  saveState: "idle" | "saving" | "saved" | "error";
  completedSteps: ReadonlySet<string>;
  reachableSteps: ReadonlySet<string>;
  snapshot: EmployeePreviewSnapshot;
  onStepSelect?: (index: number) => void;
  children: ReactNode;
};

export function EmployeeOnboardingShell({
  currentIndex,
  title,
  direction,
  saveState,
  completedSteps,
  reachableSteps,
  snapshot,
  onStepSelect,
  children,
}: EmployeeOnboardingShellProps) {
  const reduceMotion = useReducedMotion();
  const currentStepId: StepId =
    ONBOARDING_SEQUENCE[currentIndex] ?? "personal";

  return (
    <WizardSplitShell
      direction={direction}
      stepKey={currentIndex}
      brandColumn={
        <BrandColumn stepId={currentStepId} snapshot={snapshot} />
      }
      header={
        <>
          <StepRail
            sequence={ONBOARDING_SEQUENCE}
            currentIndex={currentIndex}
            completedSteps={completedSteps}
            saveState={saveState}
            reachableSteps={reachableSteps}
            onStepSelect={onStepSelect}
          />

          <MobileProgressBar
            sequence={ONBOARDING_SEQUENCE}
            currentIndex={currentIndex}
          />

          <div className="mb-2 hidden min-w-0 space-y-0.5 md:block">
            <AnimatePresence mode="wait">
              <motion.h1
                key={title}
                initial={{ opacity: 0, y: reduceMotion ? 0 : -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: reduceMotion ? 0 : 6 }}
                transition={{ duration: 0.15 }}
                className="font-display text-xl font-extrabold tracking-[-0.02em] text-foreground text-balance sm:text-2xl"
              >
                {title}
              </motion.h1>
            </AnimatePresence>
            <p className="text-label text-muted-foreground">
              {STEP_SUBTITLES[currentStepId]}
            </p>
          </div>

          {/* HRMS-E2E-020. In the header rather than on one step, because every
              /hr URL redirects here: an administrator must be able to leave from
              wherever the wizard put them, not only from the last page of it. */}
          <AdminDeferBanner />

          {/* V-034. The other half of the same question: the banner above
              renders nothing for somebody who may not defer, which left them
              redirected here with no explanation. */}
          <MemberOnboardingNote />
        </>
      }
    >
      {children}
    </WizardSplitShell>
  );
}
