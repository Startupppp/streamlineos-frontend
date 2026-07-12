import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function LotsLoading() {
  return (
    <PageWrapper
      eyebrow="Operations · Inventory"
      title="Lots"
      subtitle="Track lot numbers, expiry dates, and stock by lot."
      filters={
        <div className="flex gap-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-8 w-40" />
        </div>
      }
    >
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="border-b border-border bg-muted/80 px-2 py-1.5 flex gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-16" />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="border-b border-border/50 px-2 py-1 h-8 flex gap-4 items-center">
            {Array.from({ length: 8 }).map((__, j) => (
              <Skeleton key={j} className="h-3 w-16" />
            ))}
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
