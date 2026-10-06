"use client";

import { useCallback, useMemo } from "react";
import { usePathname } from "next/navigation";
import { parseTicketKey, ticketKeyMatchesProject } from "@/components/shared/format-ticket-key";
import { useProject } from "@/hooks/api/build/projects";
import { notFound } from "next/navigation";
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
  const { data: projectData, isLoading: projectLoading } = useProject(projectId);
  const routeKeyMismatch =
    !projectLoading && !ticketKeyMatchesProject(parsed, projectData?.key);
  const lookup = useTicketByKey(
    projectId,
    isCurrentTicketRoute && !routeKeyMismatch
      ? (parsed?.ticketNumber ?? null)
      : null,
  );
  const originHref = useMemo(
    () => resolveTicketBackHref(projectId, returnTo),
    [projectId, returnTo],
  );
  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading: lookup.isLoading,
    isError: lookup.isError || !parsed || routeKeyMismatch,
    error: lookup.error,
  });
  const { refetch } = lookup;
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  if (!isCurrentTicketRoute) return null;
  if (routeKeyMismatch) return notFound();

  return (
    <PageState resolution={pageState} loading={null} onRetry={handleRetry}>
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
