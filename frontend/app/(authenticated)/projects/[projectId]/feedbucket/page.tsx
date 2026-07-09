"use client";

import { use } from "react";
import { ProjectFeedbucketPage } from "@/features/projects/feedbucket/project-feedbucket-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectFeedbackRoute({ params }: PageProps) {
  const { projectId } = use(params);
  return <ProjectFeedbucketPage projectId={Number(projectId)} />;
}
