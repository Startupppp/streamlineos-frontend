import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function SequencesLoading() {
  return (
    <PageWrapper
      title="Sequences"
      subtitle="Automated multi-step outreach sequences for leads, deals, and contacts"
      actions={<Skeleton className="h-9 w-32 rounded-md" />}
    >
      <div className="rounded-lg border border-border overflow-hidden">
        <div className="border-b bg-muted/40 px-4 py-3 flex gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-3.5 w-16" />
          ))}
        </div>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex items-center gap-6 px-4 py-3 border-b last:border-0">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-5 w-9 rounded-full" />
            <Skeleton className="h-3.5 w-20" />
            <div className="ml-auto flex gap-1">
              <Skeleton className="h-7 w-7 rounded" />
              <Skeleton className="h-7 w-7 rounded" />
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
