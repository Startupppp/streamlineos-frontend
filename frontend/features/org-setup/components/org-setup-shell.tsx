"use client";

import type { ReactNode } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STEP_SUBTITLES } from "../lib/constants";
import type { StepId } from "../lib/constants";
import type { WizardData } from "../lib/types";
import { StepRail } from "./step-rail";
import { WorkspacePreviewPanel } from "./workspace-preview-panel";
import { MobileProgressBar } from "./mobile-progress-bar";
import { PreviewAccordion } from "./preview-accordion";

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

// Replaces the old single centered card: desktop gets a 3-column composition (step rail /
// main panel / workspace preview), mobile gets a top progress bar + collapsed preview
// accordion + sticky bottom action bar (rendered by each step's own NavButtons).
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
  const currentStepId = sequence[currentIndex];
  const isFirstOrLast = currentIndex === 0 || currentIndex === sequence.length - 1;

  return (
    <div className="w-full max-w-5xl mx-auto flex gap-8 pb-32 lg:pb-2">
      <StepRail
        sequence={sequence}
        currentIndex={currentIndex}
        saveState={saveState}
        onStepSelect={onStepSelect}
      />

      <div className="flex-1 min-w-0 max-w-xl mx-auto lg:mx-0 space-y-4">
        <MobileProgressBar sequence={sequence} currentIndex={currentIndex} />

        <div className="hidden lg:block space-y-1">
          <AnimatePresence mode="wait">
            <motion.h1
              key={title}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.15 }}
              className="text-2xl font-semibold tracking-tight text-foreground"
            >
              {title}
            </motion.h1>
          </AnimatePresence>
          <p className="text-[13px] text-muted-foreground">{STEP_SUBTITLES[currentStepId]}</p>
        </div>

        <PreviewAccordion data={data} />

        <div
          className={cn(
            "bg-card rounded-xl border border-border shadow-soft min-h-0",
            "lg:overflow-y-auto lg:scrollbar-hide lg:max-h-[calc(100dvh-11rem)]",
            isFirstOrLast ? "p-4 sm:p-5" : "p-3.5 sm:p-4",
          )}
        >
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={{
                initial: (d: number) => ({ opacity: 0, x: reduceMotion ? 0 : d * 24 }),
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

      <aside className="hidden lg:block w-72 shrink-0 self-start sticky top-8">
        <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto scrollbar-hide rounded-xl border border-border bg-card p-4">
          <WorkspacePreviewPanel data={data} />
        </div>
      </aside>
    </div>
  );
}
