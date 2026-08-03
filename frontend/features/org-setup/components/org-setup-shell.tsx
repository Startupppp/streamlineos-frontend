"use client";

import { useMemo, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { WizardSplitShell } from "@/components/wizard-shell";
import { STEP_SUBTITLES } from "../lib/constants";
import type { StepId } from "../lib/constants";
import { toPreviewSnapshot } from "../lib/preview-snapshot";
import type { WizardData } from "../lib/wizard-data-schema";
import { StepRail } from "./step-rail";
import { MobileProgressBar } from "./mobile-progress-bar";
import { OrgSetupBrandColumn } from "./org-setup-brand-column";

type OrgSetupShellProps = {
  sequence: StepId[];
  currentIndex: number;
  title: string;
  direction: number;
  saveState: "idle" | "saved";
  data: WizardData;
  onStepSelect?: (index: number) => void;
  children: ReactNode;
};

export function OrgSetupShell({
  sequence,
  currentIndex,
  title,
  direction,
  saveState,
  data,
  onStepSelect,
  children,
}: OrgSetupShellProps) {
  const reduceMotion = useReducedMotion();
  const currentStepId = sequence[currentIndex] ?? "welcome";
  const isWelcome = currentStepId === "welcome";
  const previewSnapshot = useMemo(() => toPreviewSnapshot(data), [data]);

  return (
    <WizardSplitShell
      direction={direction}
      stepKey={currentIndex}
      brandColumn={
        <OrgSetupBrandColumn
          snapshot={previewSnapshot}
          stepId={currentStepId}
        />
      }
      header={
        <>
          <StepRail
            sequence={sequence}
            currentIndex={currentIndex}
            saveState={saveState}
            onStepSelect={onStepSelect}
          />

          <MobileProgressBar sequence={sequence} currentIndex={currentIndex} />

          {!isWelcome ? (
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
              <p className="text-[13px] text-muted-foreground">
                {STEP_SUBTITLES[currentStepId]}
              </p>
            </div>
          ) : null}
        </>
      }
    >
      {children}
    </WizardSplitShell>
  );
}
