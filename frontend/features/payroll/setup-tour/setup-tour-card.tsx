"use client";

import Link from "next/link";
import { CheckCircle2, Circle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TourStep } from "./tour-steps";

export function SetupTourCard({ steps, onDismiss }: { steps: TourStep[]; onDismiss: () => void }) {
  const doneCount = steps.filter((step) => step.done).length;
  const current = steps.find((step) => !step.done);

  return (
    <section aria-labelledby="payroll-setup-guide" className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-2">
        <div className="flex-1">
          <h2 id="payroll-setup-guide" className="text-sm font-semibold">
            Payroll setup guide
          </h2>
          <p className="text-xs text-muted-foreground">
            {doneCount} of {steps.length} done
          </p>
        </div>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onDismiss} aria-label="Hide setup guide">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <ol className="mt-3 space-y-2">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-2">
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-status-success" aria-label="Done" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-label="Not done" />
            )}
            <div className="min-w-0 flex-1">
              <p className={cn("text-sm", step.done && "text-muted-foreground line-through")}>{step.title}</p>
              {step === current && <p className="text-xs text-muted-foreground">{step.hint}</p>}
            </div>
            {!step.done && (
              <Button size="sm" variant={step === current ? "default" : "link"} className="h-7 shrink-0" asChild>
                <Link href={step.href}>{step.cta}</Link>
              </Button>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
