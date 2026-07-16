import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table";

export default function ChannelsLoading() {
  return (
    <PageWrapper
      title="Channels"
      subtitle="Manage sales and fulfilment channels"
      actions={<Skeleton className="h-9 w-32" />}
    >
      <DataTableSkeleton rows={8} className="flex-1 min-h-0" />
    </PageWrapper>
  );
}
