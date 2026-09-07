import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PmPageShell, PM_PANEL } from "@/components/pm-chrome/pm-chrome";

export default function PortfolioDetailLoading() {
  return (
    <PageWrapper title="Portfolio" backHref="/build/portfolios">
      <PmPageShell>
        <div className={cn(PM_PANEL, "space-y-3 p-4")}>
          <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className={cn(PM_PANEL, "space-y-2 p-2")}>
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
