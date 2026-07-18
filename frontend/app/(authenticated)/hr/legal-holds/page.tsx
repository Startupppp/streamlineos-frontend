import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LegalHoldsTable } from "@/features/hr/governance/components/legal-holds-table";

export default async function HrLegalHoldsPage() {
  await requirePermission("hr:legalhold:view");

  return (
    <PageWrapper
      title="Legal Holds"
      subtitle="Manage investigation locks and data preservation orders."
 variant="display">
      <LegalHoldsTable />
    </PageWrapper>
  );
}
