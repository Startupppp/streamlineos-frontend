import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function RolesAuditLoading() {
  return (
    <PageWrapper
      title="Access Audit Log"
      subtitle="Track role and permission changes across your organization"
      backHref="/settings/roles"
      noInternalScroll
      contentClassName="flex min-h-0 flex-1 flex-col"
    >
      <DataTableSkeleton fill columns={5} />
    </PageWrapper>
  );
}
