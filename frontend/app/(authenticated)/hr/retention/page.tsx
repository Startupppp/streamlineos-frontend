import { Suspense } from "react";
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RetentionPageContent } from "@/features/hr/governance/components/retention-page-content";
import HrRetentionLoading from "./loading";

async function RetentionHydrated() {
  await requirePermission("hr:retention:manage");
  const state = dehydrate(new QueryClient());
  return (
    <HydrationBoundary state={state}>
      <PageWrapper
        title="Data Retention"
        subtitle="Configure retention policies and handle data subject requests."
      >
        <RetentionPageContent />
      </PageWrapper>
    </HydrationBoundary>
  );
}

export default function HrRetentionPage() {
  return (
    <Suspense fallback={<HrRetentionLoading />}>
      <RetentionHydrated />
    </Suspense>
  );
}
