"use client";

import { useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import {
  useComplianceEvents,
  useMarkEventDone,
  type ComplianceEvent,
  type ComplianceEventsParams,
} from "@/hooks/api/hr/global";
import { TruncatedText } from "@/components/ui/truncated-text";

function EventStatusBadge({ status }: { status: ComplianceEvent["status"] }) {
  if (status === "done") return <Badge className="bg-status-success-surface text-status-success-ink border-status-success-rule">Done</Badge>;
  if (status === "overdue") return <Badge className="bg-status-danger-surface text-status-danger-ink border-status-danger-rule">Overdue</Badge>;
  return <Badge className="bg-status-warning-surface text-status-warning-ink border-status-warning-rule">Pending</Badge>;
}

function EventStatusIcon({ status }: { status: ComplianceEvent["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-status-success-ink" />;
  if (status === "overdue") return <AlertCircle className="h-4 w-4 text-status-danger-ink" />;
  return <Clock className="h-4 w-4 text-status-warning-ink" />;
}

export function ComplianceEventsTab() {
  const [statusFilter, setStatusFilter] = useState<ComplianceEventsParams["status"]>(undefined);
  const { data, isLoading } = useComplianceEvents(statusFilter ? { status: statusFilter } : undefined);
  const markDone = useMarkEventDone();

  const handleMarkDone = useCallback((eventId: number) => {
    markDone.mutate({ eventId });
  }, [markDone]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  }

  const events = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["pending", "overdue", "done"] as const).map((s) => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(statusFilter === s ? undefined : s)}
            className="capitalize text-xs h-7"
          >
            {s}
          </Button>
        ))}
      </div>

      {events.length === 0 ? (
        <EmptyState
          illustration={<CheckCircle2 className="h-10 w-10 text-status-success-ink" aria-hidden />}
          title="No compliance events found."
          description="Generate events or adjust filters to see upcoming compliance deadlines."
          compact
        />
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <EventStatusIcon status={event.status} />
              <div className="flex-1 min-w-0">
                <TruncatedText text={event.requirementName ?? `Requirement #${event.requirementId}`} className="text-sm font-medium" />
                <p className="text-xs text-muted-foreground">
                  Due: {format(parseISO(event.dueDate), "d MMM yyyy")}
                  {event.category && ` · ${event.category.replace(/_/g, " ")}`}
                </p>
              </div>
              <EventStatusBadge status={event.status} />
              {event.status !== "done" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs"
                  disabled={markDone.isPending}
                  onClick={() => handleMarkDone(event.id)}
                >
                  Mark done
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
