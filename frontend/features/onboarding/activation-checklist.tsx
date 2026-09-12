"use client";

import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { useActivation, type ActivationStep } from "@/hooks/api/onboarding/activation";

/**
 * What is left before this workspace is worth logging into.
 *
 * Phase 3, ticket 14. "Activated" is defined on the server as *the workspace
 * holds the tenant's own data* **and** *somebody has done something with it* —
 * data alone is an import nobody looked at, activity alone is somebody clicking
 * around a demo. This surface is that definition made visible, and it shows
 * nothing once the definition is met: a checklist that stays on screen after
 * everything is ticked is furniture.
 */

const STEP_LABELS: Record<ActivationStep, string> = {
  "bring-your-data": "Bring your data in",
  "connect-a-channel": "Connect a channel",
  "open-a-deal": "Open a deal",
  "invite-a-colleague": "Invite a colleague",
};

const STEP_LINKS: Record<ActivationStep, string> = {
  "bring-your-data": "/crm/import",
  "connect-a-channel": "/crm/settings/ai",
  "open-a-deal": "/crm/deals",
  "invite-a-colleague": "/settings/members",
};

export function ActivationChecklist() {
  const { data, isLoading } = useActivation();

  if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

  // Nothing to say to a workspace that is already going. The surface removing
  // itself is the point -- it is a prompt, not a permanent panel.
  if (!data || data.isActivated) return null;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground">Finish setting up</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {/* The prompt says what to do and why, which is the server's to
                decide -- the same words that define the step. */}
            {data.next?.prompt ?? "A few steps left before your workspace is doing real work."}
          </p>
        </div>
        <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
          {data.percent}%
        </span>
      </div>

      <div
        className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={data.percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Workspace setup progress"
      >
        <div
          className="h-full rounded-full bg-status-info-ink transition-[width] duration-500"
          style={{ width: `${data.percent}%` }}
        />
      </div>

      <ul className="mt-4 space-y-1.5">
        {data.completed.map((step) => (
          <li key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
            <Check className="h-3.5 w-3.5 shrink-0 text-status-success-ink" aria-hidden />
            <span className="line-through">{STEP_LABELS[step]}</span>
          </li>
        ))}
        {data.remaining.map((step, index) => (
          <li key={step}>
            <Link
              href={STEP_LINKS[step]}
              className="group flex items-center gap-2 rounded-md px-1 py-1 text-xs text-foreground hover:bg-muted/60"
            >
              <span
                className={`flex h-3.5 w-3.5 shrink-0 rounded-full border ${
                  // Only the first one is emphasised. A list of four equally
                  // urgent things is a list nobody starts.
                  index === 0 ? "border-status-info-ink" : "border-border"
                }`}
                aria-hidden
              />
              <span className={index === 0 ? "font-medium" : "text-muted-foreground"}>
                {STEP_LABELS[step]}
              </span>
              <ArrowRight
                className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
