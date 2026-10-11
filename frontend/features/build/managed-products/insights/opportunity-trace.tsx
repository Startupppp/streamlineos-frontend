"use client";

import Link from "next/link";
import {
  CheckCircle2,
  FileText,
  GitBranch,
  GitMerge,
  Package,
  Star,
  TrendingUp,
  XCircle,
} from "lucide-react";
import type { DiscoveryGetTraceResponse } from "@/contracts/build-contracts.generated";
import { formatShortDate } from "@/lib/date-utils";
import { formatStoredRiceScore } from "./rice-formula";

interface OpportunityTraceProps {
  managedProductId: number;
  trace: DiscoveryGetTraceResponse;
}

function EvidenceSourceLink({
  managedProductId,
  item,
}: {
  managedProductId: number;
  item: DiscoveryGetTraceResponse["evidence"][number];
}) {
  if (item.sourceKind === "feedbucket_submission") {
    return (
      <Link
        href={`/build/managed-products/${managedProductId}/feedback?submission=${item.sourceId}`}
        className="text-sm font-medium text-status-info-ink-strong hover:underline"
        data-testid={`trace-evidence-link-${item.sourceId}`}
      >
        Submission #{item.sourceId}
      </Link>
    );
  }
  return (
    <span className="text-sm text-foreground">
      {item.sourceKind.replaceAll("_", " ")} #{item.sourceId}
    </span>
  );
}

function TraceStep({
  icon,
  label,
  content,
  testId,
}: {
  icon: React.ReactNode;
  label: string;
  content: React.ReactNode;
  testId?: string;
}) {
  return (
    <div className="flex gap-3" data-testid={testId}>
      <div className="flex flex-col items-center">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground">
          {icon}
        </div>
        <div className="mt-1 flex-1 w-px bg-border" aria-hidden />
      </div>
      <div className="pb-4 flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground mb-1">
          {label}
        </p>
        {content}
      </div>
    </div>
  );
}

export function OpportunityTrace({
  managedProductId,
  trace,
}: OpportunityTraceProps) {
  return (
    <div className="space-y-0 py-2" data-testid="opportunity-trace">
      <TraceStep
        testId="trace-step-evidence"
        icon={<FileText className="size-3.5" aria-hidden />}
        label="Evidence"
        content={
          <div className="space-y-1">
            <p className="text-sm text-foreground">
              <span className="font-mono tabular-nums font-semibold">
                {trace.evidence.length}
              </span>{" "}
              piece{trace.evidence.length !== 1 ? "s" : ""} of evidence
            </p>
            {trace.evidence.length > 0 ? (
              <ul className="space-y-1">
                {trace.evidence.map((item) => (
                  <li key={item.id}>
                    <EvidenceSourceLink managedProductId={managedProductId} item={item} />
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        }
      />

      <TraceStep
        testId="trace-step-opportunity"
        icon={<TrendingUp className="size-3.5" aria-hidden />}
        label="Opportunity"
        content={
          <p className="text-sm font-medium text-foreground">
            {trace.opportunity.title}
          </p>
        }
      />

      <TraceStep
        testId="trace-step-score"
        icon={<Star className="size-3.5" aria-hidden />}
        label="Score"
        content={
          trace.scores.latest ? (
            <p className="text-sm text-foreground font-mono tabular-nums">
              {formatStoredRiceScore(trace.scores.latest.effectiveScore)}
              {trace.scores.latest.isOverride && (
                <span className="ml-2 text-xs text-status-warning-ink-strong">
                  (override)
                </span>
              )}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No score recorded</p>
          )
        }
      />

      <TraceStep
        testId="trace-step-decision"
        icon={
          trace.decision ? (
            trace.opportunity.state === "declined" ? (
              <XCircle
                className="size-3.5 text-status-danger-ink"
                aria-hidden
              />
            ) : (
              <CheckCircle2
                className="size-3.5 text-status-success-ink"
                aria-hidden
              />
            )
          ) : (
            <GitBranch className="size-3.5" aria-hidden />
          )
        }
        label="Decision"
        content={
          trace.decision ? (
            <div className="text-sm text-foreground space-y-0.5">
              <p>
                <span className="capitalize font-medium">
                  {trace.opportunity.state}
                </span>
                {trace.decision.decidedAt && (
                  <span className="text-muted-foreground">
                    {" "}
                    on {formatShortDate(trace.decision.decidedAt)}
                  </span>
                )}
              </p>
              {trace.decision.note && (
                <p className="text-muted-foreground text-xs">
                  {trace.decision.note}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No decision yet</p>
          )
        }
      />

      {trace.roadmapItem && (
        <TraceStep
          testId="trace-step-roadmap"
          icon={<GitBranch className="size-3.5" aria-hidden />}
          label="Roadmap item"
          content={
            <Link
              href={`/build/managed-products/${managedProductId}/roadmap`}
              className="text-sm font-medium text-status-info-ink-strong hover:underline"
              data-testid="trace-roadmap-link"
            >
              {trace.roadmapItem.title}
            </Link>
          }
        />
      )}

      {trace.delivery.project && (
        <TraceStep
          testId="trace-step-delivery"
          icon={<CheckCircle2 className="size-3.5" aria-hidden />}
          label="Delivery"
          content={
            <div className="text-sm text-foreground space-y-0.5">
              <Link
                href={`/build/${trace.delivery.project.id}`}
                className="font-medium text-status-info-ink-strong hover:underline"
                data-testid="trace-project-link"
              >
                {trace.delivery.project.name}
              </Link>
              {trace.delivery.tickets && (
                <p className="text-muted-foreground text-xs font-mono tabular-nums">
                  {trace.delivery.tickets.done}/{trace.delivery.tickets.total}{" "}
                  tickets done
                  {trace.delivery.tickets.percent !== null && (
                    <span> ({trace.delivery.tickets.percent}%)</span>
                  )}
                </p>
              )}
            </div>
          }
        />
      )}

      {trace.release && (
        <TraceStep
          testId="trace-step-release"
          icon={<Package className="size-3.5" aria-hidden />}
          label="Release"
          content={
            <p className="text-sm font-medium text-foreground">
              {trace.release.name}{" "}
              <span className="text-muted-foreground font-normal">
                {trace.release.version}
              </span>
            </p>
          }
        />
      )}

      {trace.outcomeReviews.length > 0 && (
        <TraceStep
          testId="trace-step-outcome-reviews"
          icon={<Star className="size-3.5" aria-hidden />}
          label="Outcome reviews"
          content={
            <ul className="space-y-1">
              {trace.outcomeReviews.map((r) => (
                <li key={r.id} className="text-sm text-foreground">
                  <span className="font-medium">{r.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground capitalize">
                    {r.state}
                  </span>
                  {r.result && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      — {r.result.replace(/_/g, " ")}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          }
        />
      )}

      {trace.dependencies.length > 0 && (
        <TraceStep
          testId="trace-step-dependencies"
          icon={<GitMerge className="size-3.5" aria-hidden />}
          label="Dependencies"
          content={
            <ul className="space-y-1">
              {trace.dependencies.map((d) => (
                <li key={d.dependsOnId} className="text-sm text-foreground">
                  <span className="font-medium">{d.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground capitalize">
                    {d.status.replace(/_/g, " ")}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground capitalize">
                    {d.horizon}
                  </span>
                </li>
              ))}
            </ul>
          }
        />
      )}
    </div>
  );
}
