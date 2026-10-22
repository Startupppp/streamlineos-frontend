import { Suspense } from "react";
import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DelegationSheet } from "@/features/hr/governance/components/delegation-sheet";
import HrDelegationsLoading from "./loading";

export default async function HrDelegationsPage() {
  await requirePermission("hr:workflows:manage");
  return (
    <Suspense fallback={<HrDelegationsLoading />}>
      <PageWrapper
        title="Proxy Delegations"
        subtitle="Manage temporary proxy access grants across HR approval scopes."
      >
        <DelegationSheet />
      </PageWrapper>
    </Suspense>
  );
}
