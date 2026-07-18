import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DelegationSheet } from "@/features/hr/governance/components/delegation-sheet";

export default async function HrDelegationsPage() {
  await requirePermission("hr:employees:view");

  return (
    <PageWrapper
      title="Proxy Delegations"
      subtitle="Manage temporary proxy access grants across HR approval scopes."
 variant="display">
      <DelegationSheet />
    </PageWrapper>
  );
}
