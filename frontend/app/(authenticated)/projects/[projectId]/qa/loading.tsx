import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";

export default function QaLoading() {
  return (
    <PageWrapper eyebrow="Quality" title="QA / Tests" subtitle="Test cases and runs">
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-24 rounded-md" />
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-7 w-44 rounded-md" />
          <Skeleton className="h-7 w-32 rounded-md" />
          <Skeleton className="h-7 w-28 rounded-md ml-auto" />
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 h-8 border-b border-border/50 px-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
