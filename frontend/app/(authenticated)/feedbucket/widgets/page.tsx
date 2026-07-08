"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { DashboardGate } from "@/components/shared/dashboard-gate";
import { FeedbucketWidgetsList } from "@/features/feedbucket";

export default function FeedbucketWidgetsPage() {
  return (
    <DashboardGate permission="feedbucket:widgets:view">
      <PageWrapper
        title="Widgets"
        eyebrow="Feedbucket"
        subtitle="Manage your embedded feedback widgets and embed snippets."
      >
        <FeedbucketWidgetsList />
      </PageWrapper>
    </DashboardGate>
  );
}
