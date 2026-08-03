"use client";

import { use } from "react";
import { ProjectApprovalsPage } from "@/features/build/approvals/project-approvals-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectApprovalsRoute({ params }: PageProps) {
  const { projectId } = use(params);
  return <ProjectApprovalsPage projectId={parseInt(projectId, 10)} />;
}
