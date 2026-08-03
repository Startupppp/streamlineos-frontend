"use client";

import { use } from "react";
import { TicketDetailPage } from "@/features/build/ticket-details/ticket-detail-page";

interface PageProps {
  params: Promise<{ projectId: string; ticketKey: string }>;
}

export default function ProjectTicketDetailRoute({ params }: PageProps) {
  const { projectId, ticketKey } = use(params);
  const parsedProjectId = parseInt(projectId, 10);
  if (!Number.isFinite(parsedProjectId) || parsedProjectId <= 0) {
    return null;
  }
  return (
    <TicketDetailPage
      projectId={parsedProjectId}
      ticketKey={decodeURIComponent(ticketKey)}
    />
  );
}
