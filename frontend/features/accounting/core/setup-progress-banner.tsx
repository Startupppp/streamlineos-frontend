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
    <div className="rounded-lg border border-status-warning-rule bg-status-warning-surface px-4 py-3 flex items-start gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-status-warning-ink mb-2">Complete your accounting setup</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 mb-3">
          {steps.map((step) => {
            const href = STEP_LINKS[step.key];
            return (
              <span key={step.key} className="flex items-center gap-1 text-xs text-status-warning-ink">
                {step.done ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-status-success-ink shrink-0" />
                ) : (
                  <Circle className="h-3.5 w-3.5 text-status-warning-ink shrink-0" />
                )}
                {href && !step.done ? (
                  <Link
                    href={href}
                    className={cn("hover:underline", step.done ? "line-through text-status-warning-ink" : "")}
                  >
                    {step.label}
                  </Link>
                ) : (
                  <span className={cn(step.done ? "line-through text-status-warning-ink" : "")}>{step.label}</span>
                )}
              </span>
            );
          })}
        </div>
        <Link
          href="/accounting/setup"
          className="inline-flex items-center rounded-md bg-status-warning-fill px-2.5 py-1 text-dense font-semibold text-white hover:bg-status-warning-fill-hover transition-colors"
        >
          Complete setup →
        </Link>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0 text-status-warning-ink hover:bg-status-warning-surface"
        onClick={handleDismiss}
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
