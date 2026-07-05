"use client";

import { motion } from "framer-motion";
import { STEP_TITLES } from "../lib/constants";
import type { StepId } from "../lib/constants";

type MobileProgressBarProps = {
  sequence: StepId[];
  currentIndex: number;
};

export function MobileProgressBar({ sequence, currentIndex }: MobileProgressBarProps) {
  const total = sequence.length;
  const pct = Math.round(((currentIndex + 1) / total) * 100);

  return (
    <div className="lg:hidden -mx-4 sm:-mx-8 px-4 sm:px-8 pb-3 mb-3 border-b border-border">
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[13px] font-semibold text-foreground">{STEP_TITLES[sequence[currentIndex]]}</p>
        <p className="text-[11px] tabular-nums text-muted-foreground">
          {currentIndex + 1} / {total}
        </p>
      </div>
      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
        <motion.div
          className="h-full gradient-wizard rounded-full"
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}
