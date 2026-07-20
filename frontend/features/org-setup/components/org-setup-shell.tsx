"use client";

import { useMemo, type ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { STEP_SUBTITLES } from "../lib/constants";
import type { StepId } from "../lib/constants";
import type { WizardData } from "../lib/types";
import { StepRail } from "./step-rail";
import { MobileProgressBar } from "./mobile-progress-bar";
import { OrgSetupBrandColumn } from "./org-setup-brand-column";

type OrgSetupShellProps = {
  sequence: StepId[];
  currentIndex: number;
  title: string;
  direction: number;
  saveState: "idle" | "saving" | "saved";
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
  const previewSnapshot = useMemo(
    () => ({
      companyName: data.companyName,
      industry: data.industry,
      teamSize: data.teamSize,
      goals: data.goals,
      modules: data.modules,
      installedApps: data.installedApps,
      inviteesCount: data.invitees.length,
    }),
    [
      data.companyName,
      data.industry,
      data.teamSize,
      data.goals,
      data.modules,
      data.installedApps,
      data.invitees.length,
    ],
  );

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 overflow-hidden md:flex-row">
      <div className="relative flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-y-auto overscroll-contain scrollbar-hide md:w-1/2">
        <div className="mx-auto flex w-full min-w-0 max-w-lg flex-1 flex-col px-4 py-4 sm:px-8 sm:py-5 md:max-w-none md:px-8 md:py-6 lg:px-10 lg:py-8 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-8">
          <StepRail
            sequence={sequence}
            currentIndex={currentIndex}
            saveState={saveState}
            onStepSelect={onStepSelect}
          />

          <MobileProgressBar sequence={sequence} currentIndex={currentIndex} />

          {!isWelcome && (
            <div className="mb-3.5 min-w-0 space-y-1 sm:mb-4">
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
          )}

          <div className="min-h-0 min-w-0 flex-1">
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
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <OrgSetupBrandColumn snapshot={previewSnapshot} />
    </div>
  );
}
