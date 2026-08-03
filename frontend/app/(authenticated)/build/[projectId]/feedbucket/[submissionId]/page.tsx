"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { FeedbucketSubmissionDetail } from "@/features/feedbucket";

interface PageProps {
  params: Promise<{ projectId: string; submissionId: string }>;
}

export default function ProjectFeedbackSubmissionRoute({ params }: PageProps) {
  const { projectId, submissionId } = use(params);
  const id = Number(submissionId);

  return (
    <DashboardGate permission="feedbucket:submissions:view">
      <PageWrapper
        title="Submission"
        backHref={`/build/${projectId}/feedbucket`}
      >
        <FeedbucketSubmissionDetail submissionId={id} />
      </PageWrapper>
    </DashboardGate>
  );
}
