"use client";

import { use } from "react";
import { IncidentDetailPage } from "@/features/build/incidents/incident-detail-page";

interface PageProps {
  params: Promise<{ projectId: string; incidentId: string }>;
}

export default function IncidentDetailRoute({ params }: PageProps) {
  const { projectId, incidentId } = use(params);
  return (
    <IncidentDetailPage
      projectId={parseInt(projectId, 10)}
      incidentId={parseInt(incidentId, 10)}
    />
  );
}
