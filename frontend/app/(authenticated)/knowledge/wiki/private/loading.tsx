import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";

export default function MyFilesLoading() {
  return (
    <PageWrapper title="My files" subtitle="Files you own" actions={<Skeleton className="h-9 w-28 rounded-md" />}>
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <section className="space-y-1 px-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-full rounded-md" />
          <Skeleton className="h-8 w-full rounded-md" />
        </section>
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-full rounded-md sm:w-72" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="ml-auto h-9 w-20 rounded-md" />
          </div>
          <DataTableSkeleton columns={5} mobileCards fill />
        </div>
      </div>
    </PageWrapper>
  );
}
