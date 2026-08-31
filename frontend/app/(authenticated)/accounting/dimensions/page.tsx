import { requirePermission } from "@/lib/rbac/require-permission";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DimensionsTable } from "@/features/accounting/core/dimensions-table";

export default async function DimensionsPage() {
  const { access } = await requirePermission("accounting:dimensions:read");
  const canManage = access.isOrgOwner || "accounting:dimensions:manage" in access.scopes;
  return (
    <PageWrapper
      title="Dimensions"
      subtitle="Cost centres, projects, and departments for GL entry tagging and reporting."
    >
      <div className="flex flex-1 min-h-0 flex-col">
        <DimensionsTable canManage={canManage} />
      </div>
    </PageWrapper>
  );
}
