import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function KnowledgeBaseLoading() {
  return (
    <PageWrapper
      title="Docs"
      subtitle="Files, documents and decisions for your team"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <Skeleton className="h-9 w-full max-w-md rounded-md" />
        <section className="min-w-0 space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-3 overflow-hidden">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="w-56 shrink-0 space-y-2 rounded-xl border border-border bg-card p-3 sm:w-64">
                <Skeleton className="h-5 w-5 rounded-md" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            ))}
          </div>
        </section>
        <section className="flex min-h-0 flex-1 flex-col gap-3">
          <Skeleton className="h-4 w-28" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-full rounded-md sm:w-72" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="ml-auto h-9 w-20 rounded-md" />
          </div>
          <DataTableSkeleton columns={5} mobileCards fill />
        </section>
      </div>
    </PageWrapper>
  );
}
