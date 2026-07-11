"use client";

import React, { useState, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";
import {
  useComplianceEvents,
  useMarkEventDone,
  type ComplianceEvent,
} from "@/hooks/api/hr/global";

function EventStatusBadge({ status }: { status: ComplianceEvent["status"] }) {
  if (status === "done") return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">Done</Badge>;
  if (status === "overdue") return <Badge className="bg-red-50 text-red-700 border-red-200">Overdue</Badge>;
  return <Badge className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>;
}

function EventStatusIcon({ status }: { status: ComplianceEvent["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "overdue") return <AlertCircle className="h-4 w-4 text-red-500" />;
  return <Clock className="h-4 w-4 text-amber-500" />;
}

export function ComplianceEventsTab() {
  const [statusFilter, setStatusFilter] = useState<string | undefined>(undefined);
  const { data, isLoading } = useComplianceEvents(statusFilter ? { status: statusFilter } : undefined);
  const markDone = useMarkEventDone();

  const handleMarkDone = useCallback((eventId: number) => {
    markDone.mutate({ eventId });
  }, [markDone]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
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
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mb-3 text-emerald-400" />
          <p className="text-sm">No compliance events found.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-center gap-3 rounded-lg border border-border bg-card p-3"
            >
              <EventStatusIcon status={event.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.requirementName ?? `Requirement #${event.requirementId}`}</p>
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
                  className="h-7 text-xs"
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
