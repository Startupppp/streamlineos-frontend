import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpiryLoading() {
  return (
    <PageWrapper
      title="Expiry Management"
      subtitle="Monitor stock approaching or past expiry dates."
      filters={
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-28" />
        </div>
      }
    >
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/80 px-2 py-1.5 flex gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-2 py-1 h-8 flex gap-4 items-center">
            {Array.from({ length: 12 }).map((__, j) => (
              <Skeleton key={j} className="h-3 w-16" />
            ))}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
