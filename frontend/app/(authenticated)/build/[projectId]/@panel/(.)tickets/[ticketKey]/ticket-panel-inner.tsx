"use client";

import { parseTicketKey } from "@/components/shared/format-ticket-key";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { TicketDetailPane } from "@/features/build/ticket-details/ticket-detail-pane";
import { resolveTicketBackHref } from "@/features/build/ticket-details/build-ticket-detail-url";
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
  const parsed = parseTicketKey(ticketKey);
  const lookup = useTicketByKey(projectId, parsed?.ticketNumber ?? null);
  const originHref = resolveTicketBackHref(projectId, returnTo);
  const pageState = usePageState({
    permission: "build:tickets:view",
    isLoading: lookup.isLoading,
    isError: lookup.isError,
    error: lookup.error,
  });

  function handleRetry() {
    void lookup.refetch();
  }

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
