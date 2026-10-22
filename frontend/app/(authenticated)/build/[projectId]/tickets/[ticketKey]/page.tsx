import { notFound } from "next/navigation";
import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { enforceRouteAccess } from "@/lib/rbac/route-access/enforce-route-access";
import { TicketDetailPage } from "@/features/build/ticket-details/ticket-detail-page";
import { decodeRouteSegment } from "@/features/build/ticket-details/build-ticket-detail-url";
import { parseTicketKey } from "@/components/shared/format-ticket-key";
import { prefetchProjectTicketByKey } from "@/lib/prefetch/build";
import TicketDetailLoading from "./loading";

interface PageProps {
  params: Promise<{ projectId: string; ticketKey: string }>;
}

export default async function ProjectTicketDetailRoute({ params }: PageProps) {
  await enforceRouteAccess("/build/[projectId]/tickets/[ticketKey]");
  const { projectId, ticketKey } = await params;
  const parsedProjectId = parseInt(projectId, 10);
  if (!Number.isFinite(parsedProjectId) || parsedProjectId <= 0) {
    return null;
  }
  const decodedTicketKey = decodeRouteSegment(ticketKey);
  if (decodedTicketKey === null) notFound();
  const parsed = parseTicketKey(decodedTicketKey);
  const state = parsed
    ? await prefetchProjectTicketByKey(parsedProjectId, parsed.ticketNumber)
    : undefined;
  return (
    <Suspense fallback={<TicketDetailLoading />}>
      <HydrationBoundary state={state}>
        <TicketDetailPage
          projectId={parsedProjectId}
          ticketKey={decodedTicketKey}
        />
      </HydrationBoundary>
    </Suspense>
  );
}
