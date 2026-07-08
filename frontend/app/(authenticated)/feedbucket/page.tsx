"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { FeedbucketInboxTable } from "@/features/feedbucket";

export default function FeedbucketInboxPage() {
  return (
    <DashboardGate permission="feedbucket:submissions:view">
      <PageWrapper
        title="Feedbucket"
        eyebrow="Feedback"
        subtitle="Visual feedback submitted via your embedded widgets."
      >
        <FeedbucketInboxTable />
      </PageWrapper>
    </DashboardGate>
  );
}
