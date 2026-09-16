"use client";

import { use } from "react";
import { RequireModule } from "@/components/auth/require-module";
import { ProjectFeedbucketPage } from "@/features/build/feedbucket/project-feedbucket-page";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default function ProjectFeedbackRoute({ params }: PageProps) {
  const { projectId } = use(params);
  return (
    <RequireModule module="feedbucket">
      <ProjectFeedbucketPage projectId={Number(projectId)} />
    </RequireModule>
  );
}
