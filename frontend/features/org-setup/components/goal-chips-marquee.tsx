"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { MockGoalChip } from "../lib/preview-mock-content";
import { chipVariants, previewLayoutTransition } from "../lib/preview-motion";

const CHIP_CLASS =
  "shrink-0 whitespace-nowrap rounded-md border border-brand-core/20 bg-gradient-to-r from-brand-core/10 to-brand-cyan/8 px-1.5 py-0.5 text-[10px] font-medium text-brand-deep";

type GoalChipsMarqueeProps = {
  chips: readonly MockGoalChip[];
};

function chipLoopKey(chips: readonly MockGoalChip[]): string {
  return chips.map((chip) => chip.id).join("|");
}

function marqueeDurationSec(chipCount: number): number {
  return Math.max(14, Math.min(36, chipCount * 5));
}

function GoalChipSpan({ label }: { label: string }) {
  return <span className={CHIP_CLASS}>{label}</span>;
}

export function GoalChipsMarquee({ chips }: GoalChipsMarqueeProps) {
  const reduceMotion = useReducedMotion();
  const layoutTransition = previewLayoutTransition(reduceMotion);
  const chipMotion = chipVariants(reduceMotion);
  const shouldMarquee = !reduceMotion && chips.length >= 2;
  const loopKey = chipLoopKey(chips);

  if (!shouldMarquee) {
    return (
      <motion.div
        layout={!reduceMotion}
        className="flex min-w-0 flex-nowrap gap-1 overflow-x-auto scrollbar-hide"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {chips.map((chip) => (
            <motion.span
              key={chip.id}
              layout={!reduceMotion}
              layoutId={
                reduceMotion ? undefined : `preview-goal-${chip.id}`
              }
              variants={chipMotion}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={layoutTransition}
              className={CHIP_CLASS}
            >
              {chip.label}
            </motion.span>
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <div className="min-w-0 overflow-hidden">
      <div
        key={loopKey}
        className="preview-goal-marquee-track"
        style={{ animationDuration: `${marqueeDurationSec(chips.length)}s` }}
      >
        <div className="flex shrink-0 gap-1 pr-1">
          {chips.map((chip) => (
            <GoalChipSpan key={chip.id} label={chip.label} />
          ))}
        </div>
        <div className="flex shrink-0 gap-1 pr-1" aria-hidden>
          {chips.map((chip) => (
            <GoalChipSpan key={`dup-${chip.id}`} label={chip.label} />
          ))}
        </div>
      </div>
    </div>
  );
}
