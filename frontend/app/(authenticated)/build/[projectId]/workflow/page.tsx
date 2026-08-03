"use client";

import { use } from "react";
import { WorkflowPage } from "@/features/build/workflow/workflow-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectWorkflowRoute({ params }: PageProps) {
  const { projectId } = use(params);
  return <WorkflowPage projectId={parseInt(projectId, 10)} />;
}
