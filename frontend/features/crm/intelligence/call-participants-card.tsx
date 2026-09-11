"use client";

import { useCallback } from "react";
import { Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared";
import { useActivityParticipants } from "@/hooks/api/crm/activity-timeline";
import { getErrorMessage } from "@/lib/get-error-message";

const SKELETON_ROWS = [0, 1, 2];

/**
 * Who was on the call, beside the analysis of it.
 *
 * Read under `crm:activities:view` rather than the call-analysis key the page is
 * gated on, which is why `access` is handed to the empty state: a reader can
 * hold one key and not the other, and an ungated empty branch would report
 * nobody on a call it was never allowed to look at.
 */
export function CallParticipantsCard({ activityId }: { activityId: string }) {
  const { data, isLoading, error, access, refetch } = useActivityParticipants(activityId);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const rows = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="px-4 py-3 border-b">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          On the call
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-3">
        {isLoading ? (
          <div className="flex flex-col gap-2">
            {SKELETON_ROWS.map((row) => (
              <Skeleton key={row} className="h-6 w-full" />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            compact
            title="Couldn't load the participants"
            description={getErrorMessage(error)}
            onRetry={handleRetry}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            compact
            access={access}
            title="Nobody recorded"
            description="This call has no participants logged against it."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {rows.map((participant) => (
              <li
                key={participant.activityParticipantId}
                className="flex items-center justify-between gap-2"
              >
                <span className="min-w-0 truncate text-sm">
                  {participant.userName ?? participant.address ?? "Unnamed participant"}
                </span>
                <Badge variant="outline" className="shrink-0">
                  {participant.role}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
