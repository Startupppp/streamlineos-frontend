"use client";

import { cn } from "@/lib/utils";
import { AiDraftCard } from "@/components/ai/ai-draft-card";
import type { Citation } from "@/components/ai";
import { useLatestSnapshot } from "@/hooks/api/ai-summaries";
import { DiffSection } from "./diff-section";
import type { SnapshotStructured } from "./types";

interface StandardSummaryCardProps {
  entityType: string;
  entityId: string;
  summary: string;
  structured: SnapshotStructured;
  citations?: Citation[];
  confidence?: number;
  correlationId?: string;
  generatedAt?: string | Date;
  onAccept?: () => void;
  onDiscard?: () => void;
  acceptLabel?: string;
  isAcceptPending?: boolean;
  className?: string;
}

export function StandardSummaryCard({
  entityType,
  entityId,
  summary,
  structured,
  citations,
  confidence,
  generatedAt,
  onAccept,
  onDiscard,
  acceptLabel,
  isAcceptPending,
  className,
}: StandardSummaryCardProps) {
  const { data: snapshotWithDiff } = useLatestSnapshot(entityType, entityId);

  return (
    <AiDraftCard
      title="AI Summary"
      timestamp={generatedAt}
      confidence={confidence}
      citations={citations}
      onAccept={onAccept}
      onDiscard={onDiscard}
      acceptLabel={acceptLabel}
      isAcceptPending={isAcceptPending}
      className={cn(className)}
    >
      <div className="space-y-2.5">
        <p className="text-label leading-relaxed text-foreground">{summary}</p>

        {structured.highlights.length > 0 ? (
          <ul className="space-y-1">
            {structured.highlights.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        {structured.blockers.length > 0 ? (
          <ul className="space-y-1">
            {structured.blockers.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-status-warning-fill" />
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        {structured.nextActions.length > 0 ? (
          <ul className="space-y-1">
            {structured.nextActions.map((item) => (
              <li key={item} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-primary/60" />
                {item}
              </li>
            ))}
          </ul>
        ) : null}

        {snapshotWithDiff?.diff ? (
          <DiffSection diff={snapshotWithDiff.diff} />
        ) : null}
      </div>
    </AiDraftCard>
  );
}
