"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { FeedbucketSubmissionDetail } from "@/features/feedbucket";

interface PageProps {
  params: Promise<{ submissionId: string }>;
}

export default function FeedbucketSubmissionPage({ params }: PageProps) {
  const { submissionId } = use(params);
  const id = Number(submissionId);

  return (
    <DashboardGate permission="feedbucket:submissions:view">
      <PageWrapper
        title="Submission"
        eyebrow="Feedback"
        backHref="/feedbucket"
      >
        <FeedbucketSubmissionDetail submissionId={id} />
      </PageWrapper>
    </DashboardGate>
  );
}
