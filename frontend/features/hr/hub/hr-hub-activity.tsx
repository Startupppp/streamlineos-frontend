"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useMemo } from "react";
import {
  AlertCircle,
  RefreshCcw,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getErrorMessage } from "@/lib/get-error-message";
import { HrPanel, HrSectionHeader } from "@/features/hr/shared/hr-ui";
import { hubSectionData, hubSectionError } from "@/hooks/api/hr/hub";
import type { HrHubViewProps } from "@/hooks/api/hr/hub-types";
import { buildActivityRows, type ActivityRow } from "./activity/activity-rows";
import { ActivityRowItem } from "./activity/activity-row";

export function HrHubActivity({
  access,
  snapshot,
  isLoading,
  onRetry,
}: HrHubViewProps) {
  const hasAny = access.canCases || access.canProbation || access.canExit;
  const sections = snapshot?.sections;
  const opsInbox = hubSectionData(sections?.opsInbox);
  const probation = hubSectionData(sections?.probation);
  const resignations = hubSectionData(sections?.resignations);

  const rows = useMemo<ActivityRow[]>(
    () =>
      buildActivityRows({
        canCases: access.canCases,
        canProbation: access.canProbation,
        canExit: access.canExit,
        opsItems: opsInbox?.items ?? [],
        probationItems: probation?.data ?? [],
        resignationItems: resignations?.data ?? [],
      }),
    [
      access.canCases,
      access.canProbation,
      access.canExit,
      opsInbox,
      probation,
      resignations,
    ],
  );

  if (!hasAny) return null;

  const firstError: Error | null =
    (access.canCases ? hubSectionError(sections?.opsInbox) : null) ??
    (access.canProbation ? hubSectionError(sections?.probation) : null) ??
    (access.canExit ? hubSectionError(sections?.resignations) : null);

  return (
    <div className="space-y-2.5">
      <HrSectionHeader
        title="Needs attention"
        description="Active items across cases, probation, and exits"
        size="lg"
      />
      <HrPanel padded={false}>
        {isLoading ? (
          <div className="p-4 space-y-2.5">
            <Skeleton className="h-8 w-full rounded-lg" />
            <Skeleton className="h-8 w-5/6 rounded-lg" />
            <Skeleton className="h-8 w-4/5 rounded-lg" />
          </div>
        ) : firstError ? (
          <div className="p-4 flex items-center gap-2 text-xs">
            <AlertCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <span className="flex-1 text-muted-foreground truncate">
              {getErrorMessage(firstError)}
            </span>
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={onRetry}
              className="h-auto shrink-0 gap-1 p-0 text-xs text-status-info-ink"
            >
              <RefreshCcw className="h-3 w-3" />
              Retry
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <p className="p-4 text-xs text-muted-foreground">
            All clear — nothing needs attention right now.
          </p>
        ) : (
          <div className="divide-y divide-border/60">
            {rows.map((row) => (
              <ActivityRowItem key={`${row.kind}-${row.id}`} row={row} />
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 border-t border-border/60 px-3.5 py-2">
          {access.canCases && (
            <Link
              href="/hr/service-delivery"
              className="text-micro font-medium text-status-info-ink hover:underline"
            >
              Service delivery
            </Link>
          )}
          {access.canProbation && (
            <Link
              href="/hr/onboarding/probation"
              className="text-micro font-medium text-status-info-ink hover:underline"
            >
              Probation
            </Link>
          )}
          {access.canExit && (
            <Link
              href="/hr/exit"
              className="text-micro font-medium text-status-info-ink hover:underline"
            >
              Exits
            </Link>
          )}
        </div>
      </HrPanel>
    </div>
  );
}
