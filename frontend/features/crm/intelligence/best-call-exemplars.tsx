"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { formatShortDate } from "@/lib/date-utils";
import type {
  CallExemplar,
  CallExemplarsResponse,
  ExemplarMetric,
} from "@/types/crm/call-intelligence";
import { callIntelligenceHref } from "@/components/call-intelligence/call-intelligence-href";
import { METRIC_UNKNOWN, formatBpsPercent, formatQuestionsPerTenTurns } from "./call-metric-format";

interface BestCallExemplarsProps {
  response: CallExemplarsResponse;
  onShowMore?: () => void;
}

export const EXEMPLAR_METRIC_LABEL: Record<ExemplarMetric, string> = {
  "talk-ratio": "Balanced talk ratio",
  "question-rate": "Most questions asked",
  "next-step": "Ended with a next step",
};

export function BestCallExemplars({ response, onShowMore }: BestCallExemplarsProps) {
  const { data: rows, meta } = response;
  const withheld = response.pagination.total - rows.length;

  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-sm font-semibold">Calls worth listening to</h2>
        <p className="text-sm text-muted-foreground">
          {captionFor(meta.metric, meta.talkRatioTargetBps)}
        </p>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          compact
          title="No exemplar yet"
          description={emptyReason(response)}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <ExemplarRow key={row.activityId} row={row} metric={meta.metric} />
          ))}
        </ul>
      )}

      {onShowMore && withheld > 0 ? (
        <Button variant="outline" size="sm" className="self-start" onClick={onShowMore}>
          {`Show ${withheld} more`}
        </Button>
      ) : null}

      <p className="text-sm text-muted-foreground">{footnote(response)}</p>
    </section>
  );
}

function ExemplarRow({ row, metric }: { row: CallExemplar; metric: ExemplarMetric }) {
  return (
    <li>
      <Link
        href={callIntelligenceHref(row.activityId)}
        className="flex items-center justify-between gap-3 rounded-lg border border-border/70 px-3 py-2 transition-all hover:border-primary/40 hover:shadow-md"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">
            {row.repName ?? (row.repUserId === null ? "Unattributed call" : "Former member")}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatShortDate(row.occurredAt ?? row.analysedAt)}
          </span>
        </span>
        <span className="shrink-0 font-mono text-sm tabular-nums">
          {headlineFor(row, metric)}
        </span>
      </Link>
    </li>
  );
}

function headlineFor(row: CallExemplar, metric: ExemplarMetric): string {
  if (metric === "question-rate") return formatQuestionsPerTenTurns(row.questionRateBps);
  if (metric === "talk-ratio") return formatBpsPercent(row.talkRatioBps);
  return row.repTurnCount === null ? METRIC_UNKNOWN : `${row.repTurnCount} turns`;
}

function captionFor(metric: ExemplarMetric, targetBps: number): string {
  if (metric === "talk-ratio")
    return `Closest to ${formatBpsPercent(targetBps)} of the words — neither an interview nor a demo.`;
  if (metric === "question-rate") return "Most questions asked per turn the rep took.";
  return "Ended with a specific action both sides agreed to, most recent first.";
}

function emptyReason(response: CallExemplarsResponse): string {
  const { meta } = response;
  if (meta.consentBlocked > 0 && meta.ineligible === 0 && meta.embargoed === 0)
    return `Every analysed call in this window is waiting on a recording-consent record, so none can be held up as an example.`;
  if (meta.embargoed > 0 && meta.ineligible === 0)
    return `The analysed calls in this window are still inside their rep's first ${meta.privateWindowHours} hours.`;
  if (meta.ineligible > 0)
    return `No call in this window could be measured on this metric. A call needs at least ${meta.minimumRepTurns} turns from the rep, and a transcript that labels who was speaking.`;
  return "No call in this window has been analysed yet.";
}

function footnote(response: CallExemplarsResponse): string {
  const { meta } = response;
  const parts: string[] = [];
  if (meta.ineligible > 0)
    parts.push(`${meta.ineligible} not measurable on this metric`);
  if (meta.embargoed > 0) parts.push(`${meta.embargoed} still private to their rep`);
  if (meta.consentBlocked > 0)
    parts.push(`${meta.consentBlocked} without a recording-consent record`);

  if (parts.length === 0)
    return `Every analysed call in the last ${meta.sinceDays} days was considered.`;
  return `Not considered: ${parts.join(", ")}.`;
}
