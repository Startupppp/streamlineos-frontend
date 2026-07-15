import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ReplenishmentRulesLoading() {
  return (
    <PageWrapper title="Replenishment Rules" backHref="/inventory/replenishment">
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="h-10 bg-muted/30 border-b border-border" />
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-12 border-t border-border flex items-center px-4 gap-4">
            <div className="flex-1 space-y-1">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-10" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-5 w-14 rounded-full" />
            <div className="flex gap-1">
              <Skeleton className="h-7 w-7 rounded-md" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
