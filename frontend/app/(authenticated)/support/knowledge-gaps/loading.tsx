import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function KnowledgeGapsLoading() {
  return (
    <PageWrapper
      title="Knowledge Gaps"
      subtitle="Repeated unresolved questions that need KB articles"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
    >
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-xl shadow-sm p-4 space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-4 flex-1 max-w-[70%]" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-36" />
            </div>
            <div className="flex gap-2 pt-1 border-t border-border">
              <Skeleton className="h-7 w-28 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
