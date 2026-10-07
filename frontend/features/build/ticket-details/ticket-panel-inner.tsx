"use client";

import { useCallback, useMemo } from "react";
import { notFound, usePathname } from "next/navigation";
import {
  parseTicketKey,
  ticketKeyMatchesProject,
} from "@/components/shared/format-ticket-key";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { TicketDetailPane } from "@/features/build/ticket-details/ticket-detail-pane";
import {
  isTicketDetailPath,
  resolveTicketBackHref,
} from "@/features/build/ticket-details/build-ticket-detail-url";
import { useTicketByKey } from "@/hooks/api/build/ticket-queries";

interface TicketPanelInnerProps {
  projectId: number;
  ticketKey: string;
  returnTo: string | null;
}

export function TicketPanelInner({
  projectId,
  ticketKey,
  returnTo,
}: TicketPanelInnerProps) {
  const pathname = usePathname();
  const isCurrentTicketRoute = useMemo(
    () => isTicketDetailPath(pathname, projectId, ticketKey),
    [pathname, projectId, ticketKey],
  );
  const parsed = useMemo(() => parseTicketKey(ticketKey), [ticketKey]);
  const lookup = useTicketByKey(
    projectId,
    isCurrentTicketRoute ? (parsed?.ticketNumber ?? null) : null,
  );
  const resolvedProjectKey = lookup.data?.project?.key ?? null;
  const routeKeyMismatch =
    Boolean(parsed?.projectKey) &&
    resolvedProjectKey != null &&
    !ticketKeyMatchesProject(parsed, resolvedProjectKey);
  const originHref = useMemo(
    () => resolveTicketBackHref(projectId, returnTo),
    [projectId, returnTo],
  );
  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading: lookup.isLoading,
    isError: lookup.isError || !parsed,
    error: lookup.error,
  });
  const { refetch } = lookup;
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (!isCurrentTicketRoute) return null;
  if (routeKeyMismatch) return notFound();

  return (
    <PageState resolution={pageState} loading={null} onRetry={parsed ? handleRetry : undefined}>
      {lookup.data ? (
        <TicketDetailPane
          ticketId={lookup.data.id}
          projectId={projectId}
          originHref={originHref}
        />
      ) : null}
    </PageState>
  );
}
