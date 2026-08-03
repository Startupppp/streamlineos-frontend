"use client";

import { use } from "react";
import { IncidentsPage } from "@/features/build/incidents/incidents-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function IncidentsRoute({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  return <IncidentsPage projectId={parseInt(projectIdStr, 10)} />;
}
