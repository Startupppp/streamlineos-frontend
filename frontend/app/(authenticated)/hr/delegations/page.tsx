import { Suspense } from "react";
import { HydrationBoundary } from "@tanstack/react-query";
import { requirePermission } from "@/lib/rbac/require-permission";
import { prefetchHrDelegations } from "@/lib/prefetch/hr-people";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DelegationSheet } from "@/features/hr/governance/components/delegation-sheet";
import HrDelegationsLoading from "./loading";

async function DelegationsHydrated() {
  const state = await prefetchHrDelegations();
  return (
    <HydrationBoundary state={state}>
      <PageWrapper
        title="Proxy Delegations"
        subtitle="Manage temporary proxy access grants across HR approval scopes."
      >
        <DelegationSheet />
      </PageWrapper>
    </HydrationBoundary>
  );
}

export default async function HrDelegationsPage() {
  await requirePermission("hr:workflows:manage");
  return (
    <Suspense fallback={<HrDelegationsLoading />}>
      <DelegationsHydrated />
    </Suspense>
  );
}
