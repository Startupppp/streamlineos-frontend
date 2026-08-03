"use client";

import { use } from "react";
import { RunExecutionPage } from "@/features/build/qa/runs/run-execution-page";

interface PageProps {
  params: Promise<{ projectId: string; runId: string }>;
}

export default function RunExecutionRoute({ params }: PageProps) {
  const { projectId: projectIdStr, runId: runIdStr } = use(params);
  return (
    <RunExecutionPage
      projectId={parseInt(projectIdStr, 10)}
      runId={parseInt(runIdStr, 10)}
    />
  );
}
