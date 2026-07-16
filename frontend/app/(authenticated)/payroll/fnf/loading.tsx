import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export function FnfPageSkeleton() {
  return (
    <PageWrapper title="Full & Final Settlement" subtitle="Review and approve exit settlements.">
      <DataTableSkeleton rows={12} columns={5} />
    </PageWrapper>
  );
}

export default function Loading() {
  return <FnfPageSkeleton />;
}
