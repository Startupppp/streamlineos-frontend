"use client";

import { use } from "react";
import { ReportsTabs } from "@/features/build/reports/reports-tabs";

export default function ProjectReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);

  return <ReportsTabs projectId={projectId} />;
}
