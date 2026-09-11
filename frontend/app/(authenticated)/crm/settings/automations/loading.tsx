import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function AutomationsLoading() {
  return (
    <PageWrapper
      title="Workflow Automation"
      subtitle="Automate repetitive CRM tasks with triggers and actions"
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <DataTableSkeleton rows={12} columns={6} />
    </PageWrapper>
  );
}
