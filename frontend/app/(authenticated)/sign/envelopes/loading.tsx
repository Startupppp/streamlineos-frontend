import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function SignEnvelopesLoading() {
  return (
    <PageWrapper
      title="Envelopes"
      subtitle="Every signing request you've sent, organized by status."
      actions={<Skeleton className="h-9 w-36 rounded-md" />}
    >
      <div className="flex flex-col gap-3">
        <div className="flex gap-1 border-b border-border pb-0 shrink-0">
          {Array.from({ length: 7 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-20 rounded-t-md" />
          ))}
        </div>
        <DataTableSkeleton rows={12} columns={5} />
      </div>
    </PageWrapper>
  );
}
