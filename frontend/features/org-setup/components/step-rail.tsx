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
};

export function StepRail({ sequence, currentIndex, saveState }: StepRailProps) {
  const minutesLeft = ESTIMATED_MINUTES_REMAINING[sequence[currentIndex]] ?? 0;

  return (
    <aside className="hidden lg:flex w-64 shrink-0 self-start sticky top-8 h-[calc(100dvh-5rem)] flex-col gap-6 py-2">
      <div className="flex items-center gap-2.5">
        <AnimatedLogo size={28} className="rounded-lg" />
        <span className="font-display text-sm font-bold tracking-tight text-slate-900">{BRAND_NAME}</span>
      </div>

      <ol className="space-y-1" aria-label="Setup steps">
        {sequence.map((stepId, i) => {
          const done = i < currentIndex;
          const active = i === currentIndex;
          return (
            <li key={stepId}>
              <div
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors",
                  active ? "bg-blue-50 text-blue-700" : done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px]",
                    done
                      ? "border-foreground bg-foreground text-background"
                      : active
                        ? "border-blue-500 text-blue-600"
                        : "border-border text-muted-foreground",
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <TruncatedText text={STEP_TITLES[stepId] ?? ""} />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-auto space-y-2 border-t border-border pt-4">
        {minutesLeft > 0 && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" /> About {minutesLeft} min left
          </p>
        )}
        <motion.p
          key={saveState}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
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
          ) : (
            <span className="opacity-0">placeholder</span>
          )}
        </motion.p>
      </div>
    </aside>
  );
}
