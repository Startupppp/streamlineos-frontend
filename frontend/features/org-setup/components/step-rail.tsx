"use client";

import { memo } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { STEP_TITLES, ESTIMATED_MINUTES_REMAINING } from "../lib/constants";
import type { StepId } from "../lib/constants";

type StepRailProps = {
  sequence: StepId[];
  currentIndex: number;
  saveState: "idle" | "saving" | "saved";
  onStepSelect?: (index: number) => void;
};

function StepRailInner({ sequence, currentIndex, saveState, onStepSelect }: StepRailProps) {
  const minutesLeft = ESTIMATED_MINUTES_REMAINING[sequence[currentIndex] ?? "welcome"] ?? 0;

  return (
    <div className="mb-6 hidden min-w-0 xl:block">
      <ol className="flex min-w-0 items-center gap-1" aria-label="Setup steps">
        {sequence.map((stepId, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const clickable = done && !!onStepSelect;
          const isLast = i === sequence.length - 1;

          return (
            <li key={stepId} className="flex min-w-0 flex-1 items-center gap-1">
              {clickable ? (
                <button
                  type="button"
                  onClick={() => onStepSelect(i)}
                  className={cn(
                    "flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left press-scale transition-colors",
                    "hover:bg-muted",
                  )}
                >
                  <StepMarker done={done} active={active} index={i} />
                  <span
                    className={cn(
                      "truncate text-[12px] font-medium",
                      active ? "text-brand-deep" : "text-foreground",
                    )}
                  >
                    {STEP_TITLES[stepId]}
                  </span>
                </button>
              ) : (
                <div
                  className="flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5"
                  aria-current={active ? "step" : undefined}
                >
                  <StepMarker done={done} active={active} index={i} />
                  <span
                    className={cn(
                      "truncate text-[12px] font-medium",
                      active
                        ? "text-brand-deep"
                        : done
                          ? "text-foreground"
                          : "text-muted-foreground",
                    )}
                  >
                    {STEP_TITLES[stepId]}
                  </span>
                </div>
              )}
              {!isLast && (
                <div
                  className={cn(
                    "mx-0.5 h-px min-w-3 flex-1 transition-colors duration-300",
                    done ? "bg-foreground" : "bg-border",
                  )}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-2 flex items-center justify-between gap-3 px-2">
        <p className="text-[11px] text-muted-foreground">
          {minutesLeft > 0 ? `About ${minutesLeft} min left` : "Almost done"}
        </p>
        <motion.p
          key={saveState}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex min-h-4 items-center gap-1.5 text-[11px] text-muted-foreground"
          aria-live="polite"
        >
          {saveState === "saving" ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
              Saving…
            </>
          ) : saveState === "saved" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Saved
            </>
          ) : null}
        </motion.p>
      </div>
    </div>
  );
}

function StepMarker({
  done,
  active,
  index,
}: {
  done: boolean;
  active: boolean;
  index: number;
}) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold",
        done
          ? "border-foreground bg-foreground text-background"
          : active
            ? "border-brand-core bg-brand-core/10 text-brand-core"
            : "border-border text-muted-foreground",
      )}
    >
      {done ? <Check className="h-3 w-3" aria-hidden /> : index + 1}
    </span>
  );
}

export const StepRail = memo(StepRailInner);
