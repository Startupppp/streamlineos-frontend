"use client";

import { use } from "react";
import { PortalDashboardPage } from "@/features/projects/client-portal/portal-dashboard-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function PortalProjectRoute({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  return <PortalDashboardPage projectId={parseInt(projectIdStr, 10)} />;
}
