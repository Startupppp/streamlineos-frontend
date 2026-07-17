import { PageWrapper } from "@/components/ui/page-wrapper";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PmPageShell,
  PmPanel,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function TimelineLoading() {
  return (
    <PageWrapper
      title="Timeline"
      noInternalScroll
      contentClassName="!p-0"
    >
      <PmPageShell className={cn(PAGE_CHROME_X, "min-h-0 pt-0")}>
        <div className={cn(PM_TOOLBAR, "mb-2")}>
          <div className="h-10 w-full animate-pulse rounded-md bg-muted/40" />
        </div>
        <PmPanel className="flex min-h-0 flex-1 flex-col p-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-1.5">
              <Skeleton className="h-4 w-28 shrink-0 rounded-md sm:w-40" />
              <Skeleton
                className="h-7 rounded-md"
                style={{
                  width: `${30 + ((i * 13) % 50)}%`,
                  marginLeft: `${(i * 7) % 30}%`,
                }}
              />
            </div>
          ))}
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
