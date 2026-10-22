import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LaborTabs } from "@/features/hr/governance/components/labor-tabs";
import { prefetchHrLaborRelations } from "@/lib/prefetch/hr-ops";
import LaborRelationsLoading from "./loading";

export default async function HrLaborRelationsPage() {
  await requirePermission("hr:labor:view");
  const state = await prefetchHrLaborRelations();
  return (
    <Suspense fallback={<LaborRelationsLoading />}>
      <HydrationBoundary state={state}>
        <PageWrapper
          title="Labor Relations"
          subtitle="Manage union memberships, collective agreements, and labor disputes."
        >
          <LaborTabs />
        </PageWrapper>
      </HydrationBoundary>
    </Suspense>
  );
}
