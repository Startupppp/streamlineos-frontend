import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell, PmPanel } from "@/features/projects/shared/pm-chrome";

export default function ProjectsLoading() {
  return (
    <PageWrapper
      title="All Projects"
      subtitle="Browse and manage every project in your workspace"
      actions={<Skeleton className="hidden h-9 w-28 rounded-md sm:block" />}
    >
      <PmPageShell>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
          <div className="flex items-center gap-1.5 sm:contents">
            <Skeleton className="h-9 w-28 shrink-0 rounded-md sm:hidden" />
            <Skeleton className="h-9 w-[88px] shrink-0 rounded-md sm:order-2" />
            <Skeleton className="h-9 w-[92px] shrink-0 rounded-md sm:order-3" />
            <Skeleton className="ml-auto h-9 w-[76px] shrink-0 rounded-md sm:order-4" />
          </div>
          <div className="flex items-center gap-1.5 sm:contents">
            <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:order-1 sm:w-[240px] sm:flex-none" />
            <Skeleton className="size-9 shrink-0 rounded-md sm:order-5" />
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
          {Array.from({ length: 10 }).map((_, i) => (
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
