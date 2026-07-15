import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PmPageShell, PM_PANEL } from "@/features/projects/shared/pm-chrome";

export default function PortfolioDetailLoading() {
  return (
    <PageWrapper title="Portfolio" backHref="/projects/portfolios">
      <PmPageShell>
        <div className={cn(PM_PANEL, "space-y-3 p-4")}>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <div className={cn(PM_PANEL, "space-y-2 p-2")}>
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border/40 py-2.5 last:border-0">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
