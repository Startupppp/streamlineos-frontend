"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ONBOARDING_COL_PAD,
  ONBOARDING_SEQUENCE,
  STEP_SUBTITLES,
  type StepId,
} from "../lib/constants";
import { StepRail } from "./step-rail";
import { MobileProgressBar } from "./mobile-progress-bar";
import { BrandColumn } from "./brand-column";

type EmployeeOnboardingShellProps = {
  currentIndex: number;
  title: string;
  direction: number;
  saveState: "idle" | "saved";
  completedSteps: ReadonlySet<string>;
  reachableSteps: ReadonlySet<string>;
  firstName?: string;
  roleLabel?: string;
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
  firstName,
  roleLabel,
  onStepSelect,
  children,
}: EmployeeOnboardingShellProps) {
  const reduceMotion = useReducedMotion();
  const currentStepId: StepId =
    ONBOARDING_SEQUENCE[currentIndex] ?? "personal";

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden md:flex-row">
      <div className="relative flex h-full min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden md:w-1/2">
        <div
          className={cn(
            "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col",
            ONBOARDING_COL_PAD,
          )}
        >
          <div className="shrink-0">
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
              <p className="text-[13px] text-muted-foreground">
                {STEP_SUBTITLES[currentStepId]}
              </p>
            </div>
          </div>

          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentIndex}
                custom={direction}
                variants={{
                  initial: (d: number) => ({
                    opacity: 0,
                    x: reduceMotion ? 0 : d * 24,
                  }),
                  animate: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.22, ease: "easeOut" },
                  },
                  exit: (d: number) => ({
                    opacity: 0,
                    x: reduceMotion ? 0 : d * -24,
                    transition: { duration: 0.15, ease: "easeOut" },
                  }),
                }}
                initial="initial"
                animate="animate"
                exit="exit"
                className="flex h-full min-h-0 min-w-0 flex-1 flex-col"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <BrandColumn
        stepId={currentStepId}
        completedSteps={completedSteps}
        firstName={firstName}
        roleLabel={roleLabel}
      />
    </div>
  );
}
