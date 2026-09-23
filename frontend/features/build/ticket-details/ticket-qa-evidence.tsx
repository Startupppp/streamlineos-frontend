"use client";

import { memo } from "react";
import { Bug as BugIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCanState } from "@/hooks/api/access";
import { useBug } from "@/hooks/api/build/bugs";
import {
  bugSeverityStyle,
  bugStatusLabel,
  bugStatusStyle,
} from "@/features/build/shared/bug-qa-vocabulary";

interface TicketQaEvidenceProps {
  projectId: number;
  ticketId: number;
  ticketType?: string | null;
}

interface QaEvidenceFieldProps {
  label: string;
  value: string | null | undefined;
}

const QaEvidenceField = memo(function QaEvidenceField({
  label,
  value,
}: QaEvidenceFieldProps) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-micro font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <p className="whitespace-pre-wrap text-xs text-foreground">{value}</p>
    </div>
  );
});

export const TicketQaEvidence = memo(function TicketQaEvidence({
  projectId,
  ticketId,
  ticketType,
}: TicketQaEvidenceProps) {
  const isBug = ticketType === "BUG";
  const access = useCanState("build:bugs:view");
  const { data: bug, isLoading } = useBug(projectId, ticketId, {
    enabled: isBug,
  });

  if (!isBug) return null;
  if (access === "denied") return null;

  if (access === "loading" || isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-2/3" />
      </div>
    );
  }

  if (!bug) return null;

  const hasNarrative =
    !!bug.stepsToReproduce ||
    !!bug.expectedResult ||
    !!bug.actualResult ||
    !!bug.environment ||
    !!bug.browserDevice;

  if (!bug.severity && !bug.qaState && !hasNarrative) {
    return (
      <div className="flex items-center gap-2 py-1 text-xs text-muted-foreground">
        <BugIcon className="h-3.5 w-3.5" />
        <span>No QA evidence recorded.</span>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-3" aria-label="QA evidence">
      <div className="flex items-center gap-2">
        <BugIcon className="h-3.5 w-3.5 text-muted-foreground" />
        <h3 className="text-xs font-medium text-foreground">QA evidence</h3>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {bug.severity ? (
          <Badge
            variant="outline"
            className={cn("text-micro capitalize", bugSeverityStyle(bug.severity))}
          >
            {bug.severity}
          </Badge>
        ) : null}
        {bug.qaState ? (
          <Badge
            variant="outline"
            className={cn("text-micro", bugStatusStyle(bug.qaState))}
          >
            {bugStatusLabel(bug.qaState)}
          </Badge>
        ) : null}
        {bug.reopenCount ? (
          <Badge variant="outline" className="text-micro text-muted-foreground">
            Reopened {bug.reopenCount}x
          </Badge>
        ) : null}
      </div>

      {hasNarrative ? (
        <div className="flex flex-col gap-3 rounded-md border border-border bg-muted/40 p-3">
          <QaEvidenceField
            label="Steps to reproduce"
            value={bug.stepsToReproduce}
          />
          <QaEvidenceField label="Expected result" value={bug.expectedResult} />
          <QaEvidenceField label="Actual result" value={bug.actualResult} />
          <QaEvidenceField label="Environment" value={bug.environment} />
          <QaEvidenceField label="Browser / device" value={bug.browserDevice} />
        </div>
      ) : null}
    </section>
  );
});
