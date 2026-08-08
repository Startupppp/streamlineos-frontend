import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function AuditLoading() {
  return (
    <PageWrapper
      title="Access Audit Log"
      subtitle="Track role and permission changes across your organization"
      backHref="/settings/roles"
    >
      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <DataTableSkeleton rows={12} columns={5} />
      </div>
    </PageWrapper>
  );
}
