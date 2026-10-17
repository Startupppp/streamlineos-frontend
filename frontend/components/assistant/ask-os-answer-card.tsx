"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/lib/date-utils";
import { statusToneClasses } from "@/lib/design-tokens";
import { SemanticBadge, type BadgeTone } from "@/components/ui/semantic-badge";
import type { AskOsActionReceipt, AskOsDirectiveOf } from "./ask-os-directive-schema";

type EvidenceSource = AskOsDirectiveOf<"evidence">["sources"][number];
type PlanStep = AskOsDirectiveOf<"action-plan">["steps"][number];
type LimitReason = AskOsDirectiveOf<"capability-limit">["reason"];

const EVIDENCE_STATUS: Record<EvidenceSource["status"], { tone: BadgeTone; label: string }> = {
  ok: { tone: "success", label: "Available" },
  empty: { tone: "neutral", label: "No matches" },
  partial: { tone: "warning", label: "Partial" },
  degraded: { tone: "warning", label: "Degraded" },
  denied: { tone: "danger", label: "No access" },
  "needs-connection": { tone: "info", label: "Needs connection" },
  failed: { tone: "danger", label: "Failed" },
};

const STEP_STATUS: Record<PlanStep["status"], { tone: BadgeTone; label: string }> = {
  pending: { tone: "neutral", label: "Pending" },
  proposed: { tone: "info", label: "Awaiting confirmation" },
  completed: { tone: "success", label: "Done" },
  failed: { tone: "danger", label: "Failed" },
  declined: { tone: "neutral", label: "Declined" },
};

const LIMIT_COPY: Record<LimitReason, string> = {
  unsupported: "Not available through the assistant",
  denied: "You don't have access to this",
  "module-disabled": "This module isn't enabled",
  "needs-connection": "A connection is needed",
  "companion-blocked": "Turned off by your organization",
};

const RECEIPT_STATUS: Record<AskOsActionReceipt["status"], { tone: BadgeTone; label: string }> = {
  committed: { tone: "success", label: "Done" },
  "already-completed": { tone: "info", label: "Already completed" },
  failed: { tone: "danger", label: "Failed" },
  conflicted: { tone: "warning", label: "Changed since proposed" },
  expired: { tone: "warning", label: "Expired" },
  denied: { tone: "danger", label: "Not allowed" },
};

function AskOsLink({ href, children }: { href: string; children: ReactNode }) {
  const className = "text-dense font-medium text-primary underline-offset-2 hover:underline";
  if (href.startsWith("/"))
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function EvidenceRow({ source }: { source: EvidenceSource }) {
  const status = EVIDENCE_STATUS[source.status];
  const meta = [source.owner, source.scope, source.asOf ? `as of ${formatDateTime(source.asOf)}` : null]
    .filter(Boolean)
    .join(" · ");
  return (
    <li className="space-y-0.5 py-1.5">
      <div className="flex items-start justify-between gap-2">
        {source.href ? (
          <AskOsLink href={source.href}>{source.label}</AskOsLink>
        ) : (
          <span className="text-dense font-medium text-foreground">{source.label}</span>
        )}
        <SemanticBadge tone={status.tone} label={status.label} size="xs" className="shrink-0" />
      </div>
      {meta ? <p className="text-micro text-muted-foreground">{meta}</p> : null}
      {source.excerpt ? (
        <p className="line-clamp-3 text-dense leading-5 text-muted-foreground">{source.excerpt}</p>
      ) : null}
    </li>
  );
}

export function AskOsEvidenceCard({ directive }: { directive: AskOsDirectiveOf<"evidence"> }) {
  if (directive.sources.length === 0) return null;
  return (
    <section aria-label="Sources" className="rounded-lg border border-border px-2.5 py-1.5">
      <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">Sources</p>
      <ul className="divide-y divide-border">
        {directive.sources.map((source) => (
          <EvidenceRow key={`${source.owner}-${source.citationId ?? source.label}`} source={source} />
        ))}
      </ul>
    </section>
  );
}

export function AskOsPlanCard({ directive }: { directive: AskOsDirectiveOf<"action-plan"> }) {
  return (
    <section aria-label="Plan" className="rounded-lg border border-border px-2.5 py-2">
      <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">Plan</p>
      <ol className="space-y-1.5 pt-1">
        {directive.steps.map((step) => {
          const status = STEP_STATUS[step.status];
          return (
            <li key={step.index} className="flex items-start gap-2">
              <span className="w-4 shrink-0 pt-px text-dense tabular-nums text-muted-foreground">
                {step.index}.
              </span>
              <span className="min-w-0 flex-1 text-label leading-5 text-foreground">{step.title}</span>
              <SemanticBadge tone={status.tone} label={status.label} size="xs" className="shrink-0" />
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function AskOsLimitCard({ directive }: { directive: AskOsDirectiveOf<"capability-limit"> }) {
  const tone = statusToneClasses(directive.reason === "needs-connection" ? "info" : "warning");
  return (
    <section
      aria-label={LIMIT_COPY[directive.reason]}
      className={cn("space-y-1 rounded-lg border border-l-2 px-2.5 py-2", tone.surface, tone.rule)}
    >
      <p className={cn("text-micro font-semibold uppercase tracking-wider", tone.ink)}>
        {LIMIT_COPY[directive.reason]}
      </p>
      <p className="text-label leading-5 text-foreground">{directive.summary}</p>
      {directive.href ? <AskOsLink href={directive.href}>Open the workflow</AskOsLink> : null}
    </section>
  );
}

export function AskOsReceiptCard({ receipt }: { receipt: AskOsActionReceipt }) {
  const status = RECEIPT_STATUS[receipt.status];
  const changed = receipt.changedFields?.length ? receipt.changedFields.join(", ") : null;
  return (
    <section aria-label={`Action result: ${status.label}`} className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <p className="min-w-0 text-label leading-5 text-foreground">{receipt.summary}</p>
        <SemanticBadge tone={status.tone} label={status.label} size="xs" className="shrink-0" />
      </div>
      {changed ? <p className="text-dense text-muted-foreground">Changed: {changed}</p> : null}
      <div className="flex items-center justify-between gap-2">
        <time dateTime={receipt.at} className="text-micro text-muted-foreground">
          {formatDateTime(receipt.at)}
        </time>
        {receipt.href ? <AskOsLink href={receipt.href}>Open result</AskOsLink> : null}
      </div>
    </section>
  );
}
