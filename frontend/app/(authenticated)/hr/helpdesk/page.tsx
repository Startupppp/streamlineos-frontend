import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { HelpdeskTabsContent } from "@/features/hr/helpdesk/helpdesk-tabs-content";

export default async function HrHelpdeskPage() {
  const { access } = await requirePermission("hr:helpdesk:view");
  const canManage = access.isOrgOwner || "hr:helpdesk:manage" in access.scopes;
  return (
    <PageWrapper
      title="HR Helpdesk"
      subtitle="Submit and track HR support requests"
    >
      <HelpdeskTabsContent canManage={canManage} />
    </PageWrapper>
  );
}
