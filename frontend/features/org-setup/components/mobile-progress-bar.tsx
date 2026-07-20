"use client";

import { STEP_TITLES } from "../lib/constants";
import type { StepId } from "../lib/constants";

type MobileProgressBarProps = {
  sequence: StepId[];
  currentIndex: number;
};

export function MobileProgressBar({ sequence, currentIndex }: MobileProgressBarProps) {
  const total = sequence.length;
  const pct = Math.round(((currentIndex + 1) / total) * 100);
  const stepId = sequence[currentIndex];

  return (
    <div className="mb-4 min-w-0 border-b border-border/70 pb-3 xl:hidden">
      <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3">
        <p className="min-w-0 truncate text-[13px] font-semibold text-foreground">
          {stepId ? STEP_TITLES[stepId] : "Setup"}
        </p>
        <p className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {currentIndex + 1} / {total}
        </p>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full gradient-wizard transition-[width] duration-[400ms] ease-out motion-reduce:transition-none"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
