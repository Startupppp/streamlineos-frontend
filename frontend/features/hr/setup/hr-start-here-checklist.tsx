"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Check, Circle, CircleDot, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  hrSetupProgress,
  hrStartHereSteps,
  type HrSetupSignals,
  type HrSetupStep,
} from "./hr-start-here";

function StepIcon({ status }: { status: HrSetupStep["status"] }) {
  if (status === "done")
    return <Check className="h-4 w-4 text-status-success-ink" aria-hidden="true" />;
  if (status === "next")
    return <CircleDot className="h-4 w-4 text-primary" aria-hidden="true" />;
  return <Circle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />;
}

// Dismissal is a per-viewer convenience, so browser storage is enough: a
// cleared browser shows the checklist again, which is harmless.
const dismissListeners = new Set<() => void>();

function dismissedKey(orgId: string): string {
  return `hr_start_here_dismissed_${orgId}`;
}

function readDismissed(orgId: string | undefined): boolean {
  if (!orgId) return false;
  try {
    return localStorage.getItem(dismissedKey(orgId)) === "true";
  } catch {
    return false;
  }
}

function subscribeDismissed(callback: () => void): () => void {
  dismissListeners.add(callback);
  return () => {
    dismissListeners.delete(callback);
  };
}

function persistDismissed(orgId: string | undefined): void {
  if (!orgId) return;
  try {
    localStorage.setItem(dismissedKey(orgId), "true");
  } catch {
    return;
  }
  dismissListeners.forEach((listener) => listener());
}

export function HrStartHereChecklist({ signals }: { signals: HrSetupSignals | null }) {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? undefined;
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    () => readDismissed(orgId),
    () => false,
  );

  if (!signals || dismissed) return null;
  const steps = hrStartHereSteps(signals);
  const progress = hrSetupProgress(steps);

  if (progress.complete) return null;

  return (
    <Card className="border-dashed">
      <CardContent className="space-y-4 p-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-foreground">Start here</h2>
            {orgId ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground"
                onClick={() => persistDismissed(orgId)}
                aria-label="Dismiss setup checklist"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : null}
          </div>
          <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
            {progress.known > 0
              ? `${progress.done} of ${progress.known} done. Work through these in order — each one unblocks the next.`
              : "Work through these in order — each one unblocks the next."}
          </p>
        </div>
        <ol className="space-y-3">
          {steps.map((step) => (
            <li key={step.id} className="flex items-start gap-3">
              <span className="mt-0.5 shrink-0">
                <StepIcon status={step.status} />
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p
                  className={
                    step.status === "done"
                      ? "text-sm font-medium text-muted-foreground line-through"
                      : "text-sm font-medium text-foreground"
                  }
                >
                  {step.title}
                </p>
                {step.status === "done" ? null : (
                  <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                )}
              </div>
              {step.status === "done" ? null : (
                <Button variant="outline" size="sm" className="h-8 shrink-0" asChild>
                  <Link href={step.href}>{step.actionLabel}</Link>
                </Button>
              )}
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
