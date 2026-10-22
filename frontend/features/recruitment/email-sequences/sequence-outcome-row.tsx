"use client";

import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useEmailSequenceMetrics } from "@/hooks/api/hr/recruitment/email-sequences";
import type { EnrollmentStatus } from "@/hooks/api/hr/recruitment/email-sequences-schema";

const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  ACTIVE: "In progress",
  COMPLETED: "Finished",
  UNSUBSCRIBED: "Unsubscribed",
  BOUNCED: "Bounced",
  HELD_NO_CONSENT: "Held — no consent",
  STOPPED_SUPPRESSED: "Stopped — address suppressed",
  STOPPED_APPLIED: "Stopped — they applied",
  STOPPED_REPLIED: "Stopped — they replied",
  STOPPED_CLOSED: "Stopped — candidate closed",
};

const STATUS_ORDER: EnrollmentStatus[] = [
  "ACTIVE",
  "STOPPED_APPLIED",
  "STOPPED_REPLIED",
  "COMPLETED",
  "HELD_NO_CONSENT",
  "STOPPED_SUPPRESSED",
  "STOPPED_CLOSED",
  "UNSUBSCRIBED",
  "BOUNCED",
];

interface Props {
  sequenceId: number;
  enrollments: ReadonlyArray<{ id: number; status: EnrollmentStatus }>;
}

function Figure({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-mono tabular-nums text-foreground">{value}</p>
    </div>
  );
}

export function SequenceOutcomeRow({ sequenceId, enrollments }: Props) {
  const [open, setOpen] = useState(false);

  const { data, isLoading, isError } = useEmailSequenceMetrics(sequenceId, open);

  const handleToggle = useCallback(() => setOpen((wasOpen) => !wasOpen), []);

  const breakdown = useMemo(() => {
    const counts = new Map<EnrollmentStatus, number>();
    for (const enrollment of enrollments) {
      counts.set(enrollment.status, (counts.get(enrollment.status) ?? 0) + 1);
    }
    return STATUS_ORDER.filter((status) => (counts.get(status) ?? 0) > 0).map((status) => ({
      status,
      total: counts.get(status) ?? 0,
    }));
  }, [enrollments]);

  if (enrollments.length === 0) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {breakdown.map(({ status, total }) => (
          <span key={status}>
            <span className="font-mono tabular-nums text-foreground">{total}</span>{" "}
            {STATUS_LABEL[status]}
          </span>
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={handleToggle} className="h-7 px-2">
        {open ? "Hide results" : "Show results"}
      </Button>

      {open && (
        <div className="rounded-md border bg-muted/40 px-3 py-2">
          {isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : isError || !data ? (
            <p className="text-xs text-muted-foreground">
              Send and reply counts could not be loaded. The enrollment breakdown above is
              unaffected.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Figure label="Enrolled" value={data.enrolled} />
              <Figure label="Steps sent" value={data.sent} />
              <Figure label="Replied" value={data.replied} />
              <Figure label="Applied" value={data.converted} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
