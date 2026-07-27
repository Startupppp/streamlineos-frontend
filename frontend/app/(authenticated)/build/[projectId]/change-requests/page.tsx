"use client";

import { use } from "react";
import { ChangeRequestsPage } from "@/features/build/change-requests/change-requests-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ChangeRequestsRoute({ params }: PageProps) {
  const { projectId: projectIdStr } = use(params);
  return <ChangeRequestsPage projectId={parseInt(projectIdStr, 10)} />;
}
