import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpiryReportLoading() {
  return (
    <PageWrapper eyebrow="Inventory · Reports" title="Expiry Report">
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-28 ml-auto" />
      </div>
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="space-y-0">
          <div className="h-8 bg-muted/80" />
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 border-t border-border flex items-center px-2 gap-4">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-32 flex-1" />
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-4 w-16 rounded" />
            </div>
          ))}
        </div>
      </div>
    </PageWrapper>
  );
}
