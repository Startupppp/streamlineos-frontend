"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { SetupStep } from "@/hooks/api/accounting/core";

interface SetupProgressBannerProps {
  steps: SetupStep[];
}

const STEP_LINKS: Record<string, string> = {
  coa: "/accounting/coa",
  opening_balances: "/accounting/opening-balances",
  settings: "/accounting/settings",
};

export function SetupProgressBanner({ steps }: SetupProgressBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const allDone = steps.every((s) => s.done);

  if (dismissed || allDone) return null;

  function handleDismiss(): void {
    setDismissed(true);
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-start gap-3 dark:border-amber-500/30 dark:bg-amber-500/10">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-2">Complete your accounting setup</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          {steps.map((step) => {
            const href = STEP_LINKS[step.key];
            return (
              <span key={step.key} className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-300">
                {step.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-amber-400 dark:text-amber-500 shrink-0" />
                )}
                {href && !step.done ? (
                  <Link
                    href={href}
                    className={cn("hover:underline", step.done ? "line-through text-amber-400" : "")}
                  >
                    {step.label}
                  </Link>
                ) : (
                  <span className={cn(step.done ? "line-through text-amber-400" : "")}>{step.label}</span>
                )}
              </span>
            );
          })}
        </div>
        <Link
          href="/accounting/setup"
          className="inline-flex items-center rounded-md bg-amber-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-800 transition-colors"
        >
          Complete setup →
        </Link>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-500/10"
        onClick={handleDismiss}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
