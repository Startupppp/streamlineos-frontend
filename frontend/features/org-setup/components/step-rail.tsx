"use client";

import { Check, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedLogo } from "@/features/landing/components/animated-logo";
import { BRAND_NAME } from "@/lib/branding";
import { STEP_TITLES, ESTIMATED_MINUTES_REMAINING } from "../lib/constants";
import type { StepId } from "../lib/constants";
import { TruncatedText } from "@/components/ui/truncated-text";

type StepRailProps = {
  sequence: StepId[];
  currentIndex: number;
  saveState: "idle" | "saving" | "saved";
  onStepSelect?: (index: number) => void;
};

export function StepRail({ sequence, currentIndex, saveState, onStepSelect }: StepRailProps) {
  const minutesLeft = ESTIMATED_MINUTES_REMAINING[sequence[currentIndex]] ?? 0;

  return (
    <aside className="hidden lg:flex w-64 shrink-0 self-start sticky top-8 h-[calc(100dvh-5rem)] flex-col gap-6 py-2">
      <div className="flex items-center gap-2.5">
        <AnimatedLogo size={28} className="rounded-lg" />
        <span className="font-display text-sm font-bold tracking-tight text-foreground">{BRAND_NAME}</span>
      </div>

      <ol className="space-y-1" aria-label="Setup steps">
        {sequence.map((stepId, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          const clickable = done && !!onStepSelect;
          const rowClasses = cn(
            "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
            active
              ? "bg-brand-core/10 text-brand-deep dark:bg-brand-core/15 dark:text-brand-bright"
              : done
                ? "text-foreground"
                : "text-muted-foreground",
            clickable && "press-scale hover:bg-muted text-left",
          );
          const marker = (
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px]",
                done
                  ? "border-foreground bg-foreground text-background"
                  : active
                    ? "border-brand-core text-brand-core"
                    : "border-border text-muted-foreground",
              )}
            >
              {done ? <Check className="h-3 w-3" /> : i + 1}
            </span>
          );

          return (
            <li key={stepId}>
              {clickable ? (
                <button type="button" onClick={() => onStepSelect(i)} className={rowClasses}>
                  {marker}
                  <TruncatedText text={STEP_TITLES[stepId] ?? ""} />
                </button>
              ) : (
                <div className={rowClasses} aria-current={active ? "step" : undefined}>
                  {marker}
                  <TruncatedText text={STEP_TITLES[stepId] ?? ""} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-auto space-y-2 border-t border-border pt-4">
        {minutesLeft > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden /> About {minutesLeft} min left
          </p>
        )}
        <motion.p
          key={saveState}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 text-xs text-muted-foreground min-h-4"
          aria-live="polite"
        >
          {saveState === "saving" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" /> Saving…
            </>
          ) : saveState === "saved" ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Saved just now
            </>
          ) : null}
        </motion.p>
      </div>
    </aside>
  );
}
