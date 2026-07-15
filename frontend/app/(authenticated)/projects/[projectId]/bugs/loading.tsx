import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PM_PANEL, PM_TOOLBAR } from "@/features/projects/shared/pm-chrome";
import { cn } from "@/lib/utils";

export default function BugsLoading() {
  return (
    <PageWrapper
      eyebrow="Quality"
      title="Bugs"
      subtitle="Track and triage project bugs"
      actions={<Skeleton className="h-7 w-28 rounded-md" />}
      filters={
        <div className={cn(PM_TOOLBAR, "w-full")}>
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-7 w-44 rounded-md" />
            <Skeleton className="h-7 w-32 rounded-md" />
            <Skeleton className="h-7 w-28 rounded-md" />
            <Skeleton className="h-7 w-32 rounded-md" />
          </div>
        </div>
      }
    >
      <div className={cn("space-y-2 p-2", PM_PANEL)}>
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex h-9 items-center gap-3 border-b border-border/50 px-2 last:border-0">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 max-w-[16rem] flex-1" />
            <Skeleton className="h-4 w-16 rounded-full" />
            <Skeleton className="h-4 w-20 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    </PageWrapper>
  );
}
