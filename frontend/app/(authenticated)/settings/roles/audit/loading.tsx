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
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <DataTableSkeleton rows={12} columns={5} className="min-h-0 flex-1" />
      </div>
    </PageWrapper>
  );
}
