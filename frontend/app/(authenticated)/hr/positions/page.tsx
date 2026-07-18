import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PositionsPageContent } from "@/features/hr/governance/components/positions-page-content";

export default async function HrPositionsPage() {
  await requirePermission("hr:positions:view");

  return (
    <PageWrapper
      title="Position Control"
      subtitle="Manage org positions, incumbents, and reorg simulations."
 variant="display">
      <PositionsPageContent />
    </PageWrapper>
  );
}
