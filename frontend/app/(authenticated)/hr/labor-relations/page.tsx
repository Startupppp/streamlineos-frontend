import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { LaborTabs } from "@/features/hr/governance/components/labor-tabs";

export default async function HrLaborRelationsPage() {
  await requirePermission("hr:labor:view");

  return (
    <PageWrapper
      title="Labor Relations"
      subtitle="Manage union memberships, collective agreements, and labor disputes."
    >
      <LaborTabs />
    </PageWrapper>
  );
}
