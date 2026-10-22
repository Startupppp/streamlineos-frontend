import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PmPageShell } from "@/components/pm-chrome";
import { ListSkeleton } from "@/features/build/project-list/projects-page-skeletons";

export default function ProjectsLoading() {
  return (
    <PageWrapper
      title="All Projects"
      subtitle="Browse and manage every project in your organization"
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
        <ListSkeleton />
      </PmPageShell>
    </PageWrapper>
  );
}
