import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  PmPageShell,
  PmPanel,
  PM_TOOLBAR,
} from "@/features/projects/shared/pm-chrome";

export default function ProjectsLoading() {
  return (
    <PageWrapper
      title="All Projects"
      subtitle="Browse and manage every project in your workspace"
      actions={<Skeleton className="h-4 w-28 rounded-md" />}
    >
      <PmPageShell>
        <div className={PM_TOOLBAR}>
          <div className="flex w-full min-w-0 flex-wrap items-center gap-1.5 sm:gap-2">
            <Skeleton className="h-4 w-full max-w-[240px] rounded-md" />{" "}
            <Skeleton className="h-8 w-[132px] rounded-md" />{" "}
            <div className="ml-auto flex items-center gap-0.5">
              <Skeleton className="h-7 w-7 rounded-md" />{" "}
              <Skeleton className="h-7 w-7 rounded-md" />{" "}
            </div>
          </div>
        </div>

        <PmPanel className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center gap-4 border-b border-border/60 bg-muted/20 px-3 py-1.5">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="ml-auto hidden h-3 w-12 sm:block" />
            <Skeleton className="hidden h-3 w-10 md:block" />
            <Skeleton className="hidden h-3 w-12 lg:block" />
            <Skeleton className="hidden h-3 w-14 sm:block" />
          </div>
          {Array.from({ length: 12 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-2.5 border-b border-border/40 px-3 py-1.5 last:border-0"
            >
              <Skeleton className="h-5 w-5 shrink-0 rounded" />
              <Skeleton className="h-3.5 max-w-[220px] flex-1" />
              <Skeleton className="ml-auto h-5 w-14 shrink-0 rounded-full" />
              <div className="hidden shrink-0 items-center gap-1.5 md:flex">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-3 w-14" />
              </div>
              <Skeleton className="hidden h-3 w-12 shrink-0 lg:block" />
              <div className="hidden w-[100px] shrink-0 items-center gap-2 sm:flex">
                <Skeleton className="h-1 flex-1 rounded-full" />
                <Skeleton className="h-3 w-6" />
              </div>
            </div>
          ))}
        </PmPanel>
      </PmPageShell>
    </PageWrapper>
  );
}
