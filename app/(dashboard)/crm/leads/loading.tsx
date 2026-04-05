import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function Loading() {
  return (
    <PageWrapper title="Leads" subtitle="Manage your sales leads and pipeline.">
      <div className="space-y-4">
        {/* Stats bar */}
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
        {/* Kanban / Table */}
        <Skeleton className="h-96 rounded-xl" />
      </div>
    </PageWrapper>
  );
}
