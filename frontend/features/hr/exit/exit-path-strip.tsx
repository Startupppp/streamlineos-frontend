"use client";

import Link from "next/link";
import { ArrowUpRight, ChevronRight, Lock } from "lucide-react";
import { useAccess } from "@/hooks/api/access";
import { grantsPermission } from "@/lib/rbac/permission-gate";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import {
  EXIT_PATH_STEPS,
  REASSIGN_REPORTS_COPY,
  REASSIGN_REPORTS_HREF,
  type ExitPathStep,
} from "./exit-path-steps";

interface ExitPathStripProps {
  showReassignPrompt?: boolean;
}

function StepBody({ step }: { step: ExitPathStep }) {
  return (
    <>
      <span className="flex items-center gap-1 text-label font-medium text-foreground">
        {step.label}
        {step.href && step.external ? (
          <ArrowUpRight className="h-3 w-3 shrink-0" aria-hidden="true" />
        ) : null}
        {step.unavailableNote ? (
          <Lock className="h-3 w-3 shrink-0 text-muted-foreground" aria-hidden="true" />
        ) : null}
      </span>
      <span className="text-dense leading-relaxed text-muted-foreground">
        {step.detail}
      </span>
    </>
  );
}

export function ExitPathStrip({ showReassignPrompt = false }: ExitPathStripProps) {
  const { data: access } = useAccess();
  const warning = statusToneClasses("warning");

  return (
    <section
      aria-label="Exit path"
      className="space-y-3 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <h2 className="text-label font-semibold text-foreground">Exit path</h2>
        <span className="text-dense text-muted-foreground">
          Payroll settlement stays in Payroll. This redesign does not prove it end to end.
        </span>
      </div>

      <ol className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {EXIT_PATH_STEPS.map((step, index) => {
          const permitted =
            step.permission === undefined ||
            (access !== undefined && grantsPermission(access, step.permission));
          const reachable = step.href !== null && permitted;
          const content = (
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <StepBody step={step} />
            </span>
          );
          return (
            <li key={step.key} className="min-w-0">
              {reachable ? (
                <Link
                  href={step.href as string}
                  className={cn(
                    "flex min-h-11 items-start gap-2 rounded-lg border border-border/70 p-3",
                    "transition-colors duration-200 motion-reduce:transition-none",
                    "hover:border-status-info-rule focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  )}
                >
                  <span className="shrink-0 text-dense tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  {content}
                  <ChevronRight
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    aria-hidden="true"
                  />
                </Link>
              ) : (
                <div className="flex min-h-11 items-start gap-2 rounded-lg border border-dashed border-border/70 p-3">
                  <span className="shrink-0 text-dense tabular-nums text-muted-foreground">
                    {index + 1}
                  </span>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {showReassignPrompt ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-lg border p-3",
            warning.surface,
            warning.rule,
          )}
        >
          <p className={cn("min-w-0 flex-1 text-dense", warning.ink)}>
            {REASSIGN_REPORTS_COPY}
          </p>
          <Link
            href={REASSIGN_REPORTS_HREF}
            className="min-h-11 shrink-0 self-center text-dense font-medium underline underline-offset-2"
          >
            Reassign reports
          </Link>
        </div>
      ) : null}
    </section>
  );
}
