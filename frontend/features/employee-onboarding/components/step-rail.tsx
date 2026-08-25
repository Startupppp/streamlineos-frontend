"use client";

import { Fragment, memo } from "react";
import { Check } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ESTIMATED_MINUTES_REMAINING,
  STEP_TITLES,
  type StepId,
} from "../lib/constants";

type StepRailProps = {
  sequence: readonly StepId[];
  currentIndex: number;
  completedSteps: ReadonlySet<string>;
  saveState: "idle" | "saving" | "saved" | "error";
  reachableSteps: ReadonlySet<string>;
  onStepSelect?: (index: number) => void;
};

function StepRailInner({
  sequence,
  currentIndex,
  completedSteps,
  saveState,
  reachableSteps,
  onStepSelect,
}: StepRailProps) {
  const currentId = sequence[currentIndex] ?? "personal";
  const minutesLeft = ESTIMATED_MINUTES_REMAINING[currentId] ?? 0;

  return (
    <div className="mb-2 hidden w-full min-w-0 md:block">
      <ol className="flex w-full min-w-0 items-center" aria-label="Onboarding steps">
        {sequence.map((stepId, i) => {
          const done = completedSteps.has(stepId) && i !== currentIndex;
          const active = i === currentIndex;
          const clickable =
            reachableSteps.has(stepId) && !active && Boolean(onStepSelect);
          const isLast = i === sequence.length - 1;
          const connectorDone = done || i < currentIndex;

          return (
            <Fragment key={stepId}>
              <li className="flex shrink-0 items-center">
                {clickable ? (
                  <button
                    type="button"
                    onClick={() => onStepSelect?.(i)}
                    className={cn(
                      "flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1 text-left press-scale transition-colors",
                      "hover:bg-muted",
                    )}
                  >
                    <StepMarker done={done} active={active} index={i} />
                    <span
                      className={cn(
                        "whitespace-nowrap text-xs font-medium",
                        active ? "text-brand-deep" : "text-foreground",
                      )}
                    >
                      {STEP_TITLES[stepId]}
                    </span>
                  </button>
                ) : (
                  <div
                    className="flex shrink-0 items-center gap-1.5 rounded-lg px-1.5 py-1"
                    aria-current={active ? "step" : undefined}
                  >
                    <StepMarker done={done} active={active} index={i} />
                    <span
                      className={cn(
                        "whitespace-nowrap text-xs font-medium",
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
              </li>
              {!isLast ? (
                <li className="flex min-w-2 flex-1 items-center" aria-hidden>
                  <div
                    className={cn(
                      "mx-0.5 h-px w-full transition-colors duration-300",
                      connectorDone ? "bg-foreground" : "bg-border",
                    )}
                  />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>

      <div className="mt-1 flex items-center justify-between gap-3">
        <p className="text-dense text-muted-foreground">
          {minutesLeft > 0 ? `About ${minutesLeft} min left` : "Almost done"}
        </p>
        <motion.p
          key={saveState}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex min-h-4 items-center gap-1.5 text-dense text-muted-foreground"
          aria-live="polite"
        >
          {saveState === "saving" ? (
            <>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-muted-foreground" />
              Saving…
            </>
          ) : saveState === "saved" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Saved
            </>
          ) : saveState === "error" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
              Not saved
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
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-micro font-semibold",
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
