"use client";

import { use } from "react";
import { RisksPage } from "@/features/projects/governance/risks-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectRisksRoute({ params }: PageProps) {
  const { projectId } = use(params);
  return <RisksPage projectId={parseInt(projectId, 10)} />;
}
