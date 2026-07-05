"use client";

import { use } from "react";
import { ClientVisibilityPage } from "@/features/projects/client-portal/client-visibility-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ClientPortalRoute({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  return <ClientVisibilityPage projectId={parseInt(projectIdStr, 10)} />;
}
