import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { PmPageShell, PM_PANEL } from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";

export default function RoadmapLoading() {
  return (
    <PageWrapper
      title="Roadmap"
      subtitle="Plan publicly, collect feedback and ship a changelog"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <div className="flex gap-0.5">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-20 rounded-md" />
            <Skeleton className="h-9 w-16 rounded-md" />
          </div>
          <Skeleton className="h-9 w-64 rounded-md" />
        </div>
      }
      actions={<Skeleton className="h-9 w-24 rounded-md" />}
    >
      <PmPageShell>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={cn(PM_PANEL, "min-h-[140px] space-y-2 p-2")}>
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-16 w-full rounded-lg" />
              <Skeleton className="h-16 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </PmPageShell>
    </PageWrapper>
  );
}
