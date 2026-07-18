import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { RetentionPageContent } from "@/features/hr/governance/components/retention-page-content";

export default async function HrRetentionPage() {
  await requirePermission("hr:retention:manage");

  return (
    <PageWrapper
      title="Data Retention"
      subtitle="Configure retention policies and handle data subject requests."
 variant="display">
      <RetentionPageContent />
    </PageWrapper>
  );
}
