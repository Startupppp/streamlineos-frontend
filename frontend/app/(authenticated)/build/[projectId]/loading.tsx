import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PAGE_CHROME_X } from "@/components/ui/content-fill-panel";
import { KanbanBoardSkeleton } from "@/components/ui/kanban-skeleton";
import { cn } from "@/lib/utils";

export default function ProjectBoardLoading() {
  const filterBar = (
    <div className="flex w-full flex-wrap items-center gap-2">
      <Skeleton className="h-9 w-[200px] rounded-md" />
      <div className="ml-auto flex items-center gap-1.5">
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="mx-1 h-5 w-px bg-border/60 shrink-0" />
        <Skeleton className="h-9 w-44 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
      </div>
    </div>
  );

  return (
    <PageWrapper
      title="Board"
      noInternalScroll
      contentClassName="!p-0"
      actions={<Skeleton className="h-9 w-28 rounded-md" />}
      filters={filterBar}
    >
      <div className={cn(PAGE_CHROME_X, "h-full w-full overflow-hidden pb-1")}>
        <KanbanBoardSkeleton />
      </div>
    </PageWrapper>
  );
}
